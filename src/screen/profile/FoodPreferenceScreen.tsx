import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Alert,
    Modal,
    FlatList
} from 'react-native';
import React, { useState } from 'react';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import colors from '~/utils/color';
import Header from '~/components/Header';

const FoodPreferenceScreen = () => {
    const navigation = useNavigation();

    const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
    const [cookingGoal, setCookingGoal] = useState<string>('');
    const [ingredientsToAvoid, setIngredientsToAvoid] = useState<string[]>([]);
    const [servingSize, setServingSize] = useState<number>(4);

    const [showDietaryModal, setShowDietaryModal] = useState(false);
    const [showCookingGoalModal, setShowCookingGoalModal] = useState(false);
    const [showIngredientsModal, setShowIngredientsModal] = useState(false);

    const dietaryOptions = [
        'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free',
        'Nut-Free', 'Keto', 'Paleo', 'Halal', 'Kosher', 'Low-Carb'
    ];

    const cookingGoalOptions = [
        'Lose Weight', 'Gain Muscle', 'Maintain Weight',
        'Improve Health', 'Learn Cooking', 'Save Time', 'Save Money'
    ];

    const ingredientOptions = [
        'Dairy', 'Nuts', 'Seafood', 'Eggs', 'Soy', 'Wheat',
        'Spicy Foods', 'Onions', 'Garlic', 'Mushrooms'
    ];

    const handleDietaryToggle = (option: string) => {
        setDietaryRestrictions(prev =>
            prev.includes(option)
                ? prev.filter(item => item !== option)
                : [...prev, option]
        );
    };

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

    const handleSave = () => {
        Alert.alert('Success', 'Food preferences saved successfully!');
        navigation.goBack();
    };

    const PreferenceItem = ({
        title,
        subtitle,
        onPress,
        showChevron = true
    }: {
        title: string;
        subtitle?: string;
        onPress: () => void;
        showChevron?: boolean;
    }) => (
        <TouchableOpacity
            className="flex-row items-center justify-between py-4"
            onPress={onPress}
        >
            <View className="flex-1">
                <Text className="text-gray-800 text-base font-medium">{title}</Text>
                {subtitle && (
                    <Text className="text-gray-500 text-sm mt-1">{subtitle}</Text>
                )}
            </View>
            {showChevron && (
                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            )}
        </TouchableOpacity>
    );

    const OptionModal = ({
        visible,
        onClose,
        title,
        options,
        selectedItems,
        onToggle,
        multiSelect = true
    }: {
        visible: boolean;
        onClose: () => void;
        title: string;
        options: string[];
        selectedItems: string[];
        onToggle: (option: string) => void;
        multiSelect?: boolean;
    }) => (
        <Modal visible={visible} animationType="slide" transparent>
            <View className="flex-1 bg-black/50 justify-end">
                <View
                    className="rounded-t-3xl px-6 py-6"
                    style={{ backgroundColor: colors.creamWhite }}
                >
                    <View className="flex-row items-center justify-between mb-6">
                        <Text className="text-lg font-bold text-gray-800">{title}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.primary} />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={options}
                        keyExtractor={(item) => item}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                className="flex-row items-center justify-between py-3"
                                onPress={() => onToggle(item)}
                            >
                                <Text className="text-gray-800 text-base">{item}</Text>
                                <View
                                    className={`w-6 h-6 rounded-full border-2 items-center justify-center ${selectedItems.includes(item)
                                        ? 'border-orange-400 bg-orange-400'
                                        : 'border-gray-400'
                                        }`}
                                >
                                    {selectedItems.includes(item) && (
                                        <Ionicons name="checkmark" size={16} color="white" />
                                    )}
                                </View>
                            </TouchableOpacity>
                        )}
                        showsVerticalScrollIndicator={false}
                    />

                    <TouchableOpacity
                        className="mt-6 py-4 rounded-xl items-center"
                        style={{ backgroundColor: colors.primary }}
                        onPress={onClose}
                    >
                        <Text className="text-white font-semibold text-lg">Done</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    return (
        <View className="flex-1" style={{ backgroundColor: colors.white }}>
            {/* Header */}
            <Header
                title="My Food Preferences"
                showBackButton={true}
                onBack={() => navigation.goBack()}
            />

            <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
                {/* General Preferences */}
                <View
                    className="rounded-2xl p-6 mb-6"
                    style={{ backgroundColor: colors.creamWhite }}
                >
                    <Text className="text-xl font-bold text-gray-800 mb-4">General Preferences</Text>

                    <PreferenceItem
                        title="Dietary Restrictions"
                        subtitle={dietaryRestrictions.length > 0 ? dietaryRestrictions.join(', ') : 'None selected'}
                        onPress={() => setShowDietaryModal(true)}
                    />

                    <View className="h-px bg-gray-300 my-2" />

                    <PreferenceItem
                        title="Cooking Goal"
                        subtitle={cookingGoal || 'Not selected'}
                        onPress={() => setShowCookingGoalModal(true)}
                    />
                </View>

                {/* Meal Plan Preferences */}
                <View
                    className="rounded-2xl p-6 mb-6"
                    style={{ backgroundColor: colors.creamWhite }}
                >
                    <Text className="text-xl font-bold text-gray-800 mb-4">Meal Plan Preferences</Text>

                    <PreferenceItem
                        title="Ingredients to Avoid"
                        subtitle={ingredientsToAvoid.length > 0 ? ingredientsToAvoid.join(', ') : 'None selected'}
                        onPress={() => setShowIngredientsModal(true)}
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
                    style={{ backgroundColor: colors.primary }}
                    onPress={handleSave}
                >
                    <Text className="font-semibold text-lg text-white">Save</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Modals */}
            <OptionModal
                visible={showDietaryModal}
                onClose={() => setShowDietaryModal(false)}
                title="Dietary Restrictions"
                options={dietaryOptions}
                selectedItems={dietaryRestrictions}
                onToggle={handleDietaryToggle}
                multiSelect={true}
            />

            <OptionModal
                visible={showCookingGoalModal}
                onClose={() => setShowCookingGoalModal(false)}
                title="Cooking Goal"
                options={cookingGoalOptions}
                selectedItems={cookingGoal ? [cookingGoal] : []}
                onToggle={(option) => setCookingGoal(option === cookingGoal ? '' : option)}
                multiSelect={false}
            />

            <OptionModal
                visible={showIngredientsModal}
                onClose={() => setShowIngredientsModal(false)}
                title="Ingredients to Avoid"
                options={ingredientOptions}
                selectedItems={ingredientsToAvoid}
                onToggle={handleIngredientToggle}
                multiSelect={true}
            />
        </View>
    );
};

export default FoodPreferenceScreen;
