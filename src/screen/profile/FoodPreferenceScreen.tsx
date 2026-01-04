import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Alert,
    TextInput,
    Platform,
    KeyboardAvoidingView,
    Keyboard,
    ActivityIndicator
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import colors from '~/utils/color';
import { useAuth } from '~/context/AuthContext';
import Header from '~/components/partials/Header';
import EditModal from '~/components/modal/EditModal';
import Item from '~/components/partials/Item';

// EXTRACT COMPONENT KELUAR - Put BEFORE FoodPreferenceScreen
const IngredientsToAvoidContent = React.memo(({
    customIngredient,
    onCustomIngredientChange,
    ingredientsToAvoid,
    onIngredientToggle,
    onAddCustomIngredient,
    ingredientOptions
}: {
    customIngredient: string;
    onCustomIngredientChange: (text: string) => void;
    ingredientsToAvoid: string[];
    onIngredientToggle: (option: string) => void;
    onAddCustomIngredient: () => void;
    ingredientOptions: string[];
}) => (
    <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
    >
        <View>
            {/* Custom Ingredient Input Section */}
            <View className="mb-4 p-3 bg-gray-50 rounded-xl">
                <Text className="text-gray-700 font-medium mb-2">Add Custom Ingredient</Text>
                <View className="flex-row items-center">
                    <TextInput
                        className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 mr-2"
                        placeholder="e.g., Papaya, Durian..."
                        value={customIngredient}
                        onChangeText={onCustomIngredientChange}
                        style={{ color: colors.darkBrown }}
                        returnKeyType="done"
                        onSubmitEditing={onAddCustomIngredient}
                        blurOnSubmit={true}
                    />
                    <TouchableOpacity
                        className="px-4 py-2 rounded-lg"
                        style={{ backgroundColor: colors.primary }}
                        onPress={onAddCustomIngredient}
                    >
                        <Text className="text-white font-semibold">Add</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Scrollable List */}
            <ScrollView
                style={{ maxHeight: 300 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {ingredientOptions.map((option) => (
                    <TouchableOpacity
                        key={option}
                        className="flex-row items-center justify-between py-3 border-b border-gray-200"
                        onPress={() => onIngredientToggle(option)}
                    >
                        <Text className="text-gray-800 text-base">{option}</Text>
                        <View
                            className={`w-6 h-6 rounded-full border-2 items-center justify-center ${ingredientsToAvoid.includes(option)
                                ? 'border-orange-400 bg-orange-400'
                                : 'border-gray-400'
                                }`}
                        >
                            {ingredientsToAvoid.includes(option) && (
                                <Ionicons name="checkmark" size={16} color="white" />
                            )}
                        </View>
                    </TouchableOpacity>
                ))}

                {ingredientsToAvoid
                    .filter(item => !ingredientOptions.includes(item))
                    .map((option) => (
                        <TouchableOpacity
                            key={option}
                            className="flex-row items-center justify-between py-3 border-b border-gray-200 bg-orange-50"
                            onPress={() => onIngredientToggle(option)}
                        >
                            <View className="flex-row items-center flex-1">
                                <Text className="text-gray-800 text-base">{option}</Text>
                                <Text className="text-xs text-orange-600 ml-2">(Custom)</Text>
                            </View>
                            <View className="w-6 h-6 rounded-full border-2 items-center justify-center border-orange-400 bg-orange-400">
                                <Ionicons name="checkmark" size={16} color="white" />
                            </View>
                        </TouchableOpacity>
                    ))}
            </ScrollView>
        </View>
    </KeyboardAvoidingView>
));

const FoodPreferenceScreen = () => {
    const navigation = useNavigation();
    const { user, updateUserInFirestore } = useAuth();

    // Load existing data from user
    const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>(user?.dietaryRestrictions || []);
    const [cookingGoal, setCookingGoal] = useState<string>(user?.cookingGoal || '');
    const [ingredientsToAvoid, setIngredientsToAvoid] = useState<string[]>(user?.ingredientsToAvoid || []);
    const [servingSize, setServingSize] = useState<number>(user?.servingSize || 4);

    const [showDietaryModal, setShowDietaryModal] = useState(false);
    const [showCookingGoalModal, setShowCookingGoalModal] = useState(false);
    const [showIngredientsModal, setShowIngredientsModal] = useState(false);

    const [customIngredient, setCustomIngredient] = useState<string>('');
    const [saving, setSaving] = useState(false);

    // Dietary restriction definitions
    const dietaryDefinitions: { [key: string]: string } = {
        'None': 'No dietary restrictions. All foods allowed.',
        'Vegetarian': 'No meat or fish. Allows dairy and eggs.\n\n✅ Vegetables, fruits, grains, eggs, dairy\n❌ Meat, fish, seafood',
        'Vegan': 'No animal products at all. Only plant-based foods.\n\n✅ Vegetables, fruits, grains, nuts, beans\n❌ Meat, fish, eggs, dairy, honey',
        'Pescatarian': 'Vegetarian diet plus fish and seafood.\n\n✅ Vegetables, fish, seafood, eggs, dairy\n❌ Meat (beef, pork, chicken)',
        'Paleo': 'Caveman diet - no processed foods or grains.\n\n✅ Meat, fish, eggs, vegetables, fruits, nuts\n❌ Grains, dairy, beans, processed foods',
        'Low-Carb': 'Limited carbohydrates and sugars.\n\n✅ Meat, fish, vegetables, healthy fats\n❌ Bread, pasta, rice, sugar, starchy foods',
        'Keto': 'Very low-carb, high-fat diet.\n\n✅ Meat, fish, eggs, cheese, low-carb vegetables\n❌ Bread, pasta, rice, sugar, most fruits',
        'Kosher': 'Jewish dietary laws.\n\n✅ Kosher-certified foods, certain meats/fish\n❌ Pork, shellfish, mixing dairy+meat',
        'Gluten': 'Gluten intolerance/celiac disease.\n\n❌ Wheat, barley, rye, bread, pasta',
        'Dairy': 'Lactose intolerance or dairy allergy.\n\n❌ Milk, cheese, yogurt, butter, cream',
        'Egg': 'Egg allergy.\n\n❌ Eggs and egg-based products',
        'Soy': 'Soy allergy.\n\n❌ Soybeans, tofu, soy sauce, edamame',
        'Peanut': 'Peanut allergy.\n\n❌ Peanuts and peanut products',
        'Tree Nut': 'Tree nut allergy.\n\n❌ Almonds, walnuts, cashews, pistachios',
        'Fish': 'Fish allergy.\n\n❌ All types of fish',
        'Shellfish': 'Shellfish allergy.\n\n❌ Shrimp, crab, lobster, clams, oysters'
    };

    const showDietInfo = (diet: string) => {
        const definition = dietaryDefinitions[diet] || 'No information available.';
        Alert.alert(
            diet,
            definition,
            [{ text: 'Got it', style: 'default' }]
        );
    };

    useEffect(() => {
        if (user) {
            setDietaryRestrictions(user.dietaryRestrictions || []);
            setCookingGoal(user.cookingGoal || '');
            setIngredientsToAvoid(user.ingredientsToAvoid || []);
            setServingSize(user.servingSize || 4);
        }
    }, [user]);

    const dietaryOptions = [
        'None', 'Vegetarian', 'Vegan', 'Pescatarian', 'Paleo', 'Low-Carb', 'Keto', 'Kosher',
        'Gluten', 'Dairy', 'Egg', 'Soy', 'Peanut', 'Tree Nut', 'Fish', 'Shellfish'
    ];

    const cookingGoalOptions = [
        'Get Inspired', 'Eat Healthy', 'Budget-Friendly',
        'Plan Better', 'Learn Cooking', 'Save Time'
    ];

    const ingredientOptions = [
        'Mushroom', 'Celery', 'Brussels Sprouts', 'Broccoli', 'Tofu', 'Avocado',
        'Beet', 'Olives', 'Cilantro', 'Eggplant', 'Tomato', 'Cheese', 'Cauliflower', 'Onion',
        'Lamb', 'Pork', 'Chicken', 'Shrimp'
    ];

    const handleDietaryToggle = (option: string) => {
        setDietaryRestrictions(prev =>
            prev.includes(option)
                ? prev.filter(item => item !== option)
                : [...prev, option]
        );
    };

    const handleGoalToggle = (option: string) => {
        setCookingGoal(option === cookingGoal ? '' : option);
    }

    const handleIngredientToggle = (option: string) => {
        setIngredientsToAvoid(prev =>
            prev.includes(option)
                ? prev.filter(item => item !== option)
                : [...prev, option]
        );
    };

    const adjustServingSize = (direction: 'increase' | 'decrease') => {
        if (direction === 'increase' && servingSize < 10) {
            setServingSize(prev => prev + 1);
        } else if (direction === 'decrease' && servingSize > 1) {
            setServingSize(prev => prev - 1);
        }
    };

    const handleDietaryRestrictionsSave = () => {
        setShowDietaryModal(false);
    }

    const handleCookingGoalSave = () => {
        setShowCookingGoalModal(false);
    }

    const handleIngredientsToAvoidSave = () => {
        setShowIngredientsModal(false);
    }

    const handleSave = async () => {
        try {
            if (!user?.userId) {
                Alert.alert('Error', 'User not found. Please login again.');
                return;
            }

            setSaving(true);

            const result = await updateUserInFirestore(user.userId, {
                dietaryRestrictions,
                cookingGoal,
                ingredientsToAvoid,
                servingSize
            });

            if (!result.success) {
                throw new Error('Failed to save preferences');
            }

            Alert.alert('Success', 'Food preferences saved successfully!');
            navigation.goBack();

        } catch (error) {
            console.error('❌ Error saving preferences:', error);
            Alert.alert('Error', 'Failed to save preferences. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleAddCustomIngredient = () => {
        const trimmedIngredient = customIngredient.trim();

        if (trimmedIngredient === '') {
            Alert.alert('Error', 'Please enter an ingredient name');
            return;
        }

        const allIngredients = [...ingredientOptions, ...ingredientsToAvoid];
        const ingredientExists = allIngredients.some(
            item => item.toLowerCase() === trimmedIngredient.toLowerCase()
        );

        if (ingredientExists) {
            Alert.alert('Error', 'This ingredient already exists');
            return;
        }

        setIngredientsToAvoid(prev => [...prev, trimmedIngredient]);
        setCustomIngredient('');
        Keyboard.dismiss();
        Alert.alert('Success', `${trimmedIngredient} has been added`);
    };

    const DietaryRestrictionsContent = () => (
        <ScrollView
            style={{ maxHeight: 400 }}
            showsVerticalScrollIndicator={false}
        >
            {dietaryOptions.map((option) => (
                <View
                    key={option}
                    className="flex-row items-center justify-between py-3 border-b border-gray-200"
                >
                    <TouchableOpacity
                        className="flex-1 flex-row items-center"
                        onPress={() => handleDietaryToggle(option)}
                    >
                        <Text className="text-gray-800 text-base flex-1">{option}</Text>
                    </TouchableOpacity>

                    <View className="flex-row items-center">
                        {/* Info Icon */}
                        <TouchableOpacity
                            onPress={() => showDietInfo(option)}
                            className="p-1 mr-3"
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="information-circle-outline" size={20} color="#FF9966" />
                        </TouchableOpacity>

                        {/* Checkbox */}
                        <TouchableOpacity onPress={() => handleDietaryToggle(option)}>
                            <View
                                className={`w-6 h-6 rounded-full border-2 items-center justify-center ${dietaryRestrictions.includes(option)
                                    ? 'border-orange-400 bg-orange-400'
                                    : 'border-gray-400'
                                    }`}
                            >
                                {dietaryRestrictions.includes(option) && (
                                    <Ionicons name="checkmark" size={16} color="white" />
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            ))}
        </ScrollView>
    );

    const CookingGoalContent = () => (
        <ScrollView
            style={{ maxHeight: 400 }}
            showsVerticalScrollIndicator={false}
        >
            {cookingGoalOptions.map((option) => (
                <TouchableOpacity
                    key={option}
                    className="flex-row items-center justify-between py-3 border-b border-gray-200"
                    onPress={() => handleGoalToggle(option)}
                >
                    <Text className="text-gray-800 text-base">{option}</Text>
                    <View
                        className={`w-6 h-6 rounded-full border-2 items-center justify-center ${cookingGoal === option
                            ? 'border-orange-400 bg-orange-400'
                            : 'border-gray-400'
                            }`}
                    >
                        {cookingGoal === option && (
                            <Ionicons name="checkmark" size={16} color="white" />
                        )}
                    </View>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );

    return (
        <View className="flex-1" style={{ backgroundColor: colors.secondary }}>
            <Header
                title="My Food Preferences"
                showBackButton={true}
                onBack={() => navigation.goBack()}
            />

            <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
                {/* General Preferences */}
                <View
                    className="rounded-2xl p-6 mb-6"
                    style={{ backgroundColor: colors.lightPeach }}
                >
                    <Text className="text-xl font-bold text-gray-800 mb-4">General Preferences</Text>

                    <Item
                        title="Dietary Restrictions"
                        subtitle={dietaryRestrictions.length > 0 ? dietaryRestrictions.join(', ') : 'None selected'}
                        onPress={() => setShowDietaryModal(true)}
                        icon="restaurant-outline"
                        showChevron={true}
                    />

                    <View className="h-px bg-gray-300 my-2" />

                    <Item
                        title="Cooking Goal"
                        subtitle={cookingGoal || 'Not selected'}
                        onPress={() => setShowCookingGoalModal(true)}
                        icon="flag-outline"
                        showChevron={true}
                    />
                </View>

                {/* Meal Plan Preferences */}
                <View
                    className="rounded-2xl p-6 mb-6"
                    style={{ backgroundColor: colors.lightPeach }}
                >
                    <Text className="text-xl font-bold text-gray-800 mb-4">Meal Plan Preferences</Text>

                    <Item
                        title="Ingredients to Avoid"
                        subtitle={ingredientsToAvoid.length > 0 ? ingredientsToAvoid.join(', ') : 'None selected'}
                        onPress={() => setShowIngredientsModal(true)}
                        icon="close-circle-outline"
                        showChevron={true}
                    />

                    <View className="h-px bg-gray-300 my-2" />

                    <TouchableOpacity className="flex-row items-center justify-between py-4">
                        <Text className="text-base font-medium text-gray-800">Serving Size</Text>
                        <View className="flex-row items-center">
                            <Feather name="users" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                            <TouchableOpacity onPress={() => adjustServingSize('decrease')}>
                                <Ionicons name="remove-circle-outline" size={24} color={colors.primary} />
                            </TouchableOpacity>
                            <Text className="text-gray-800 text-lg font-semibold mx-4">{servingSize}</Text>
                            <TouchableOpacity onPress={() => adjustServingSize('increase')}>
                                <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                    className="py-4 rounded-xl items-center mb-8"
                    style={{ backgroundColor: saving ? colors.lightBrown : colors.primary }}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <View className="flex-row items-center">
                            <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                            <Text className="font-semibold text-lg text-white">Saving...</Text>
                        </View>
                    ) : (
                        <Text className="font-semibold text-lg text-white">Save</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>

            {/* Modals */}
            <EditModal
                visible={showDietaryModal}
                onClose={() => setShowDietaryModal(false)}
                title="Dietary Restrictions"
                onSave={handleDietaryRestrictionsSave}
            >
                <DietaryRestrictionsContent />
            </EditModal>

            <EditModal
                visible={showCookingGoalModal}
                onClose={() => setShowCookingGoalModal(false)}
                title="Cooking Goal"
                onSave={handleCookingGoalSave}
            >
                <CookingGoalContent />
            </EditModal>

            <EditModal
                visible={showIngredientsModal}
                onClose={() => setShowIngredientsModal(false)}
                title="Ingredients to Avoid"
                onSave={handleIngredientsToAvoidSave}
            >
                <IngredientsToAvoidContent
                    customIngredient={customIngredient}
                    onCustomIngredientChange={setCustomIngredient}
                    ingredientsToAvoid={ingredientsToAvoid}
                    onIngredientToggle={handleIngredientToggle}
                    onAddCustomIngredient={handleAddCustomIngredient}
                    ingredientOptions={ingredientOptions}
                />
            </EditModal>
        </View>
    );
};

export default FoodPreferenceScreen;