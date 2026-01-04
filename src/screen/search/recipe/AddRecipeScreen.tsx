import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Switch } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, Feather } from '@expo/vector-icons';
import { addRecipe } from '../../../controller/recipe';
import { useNavigation, useRoute } from '@react-navigation/native';

import Header from '../../../components/partials/Header';
import { uploadImageToFirebase } from '~/utils/uploadImage';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAuth } from '~/context/AuthContext';
import { Picker } from '@react-native-picker/picker';
import { addRecipeToDay, loadMealPlanWithDetails } from '~/controller/planner';
import colors from '~/utils/color';



interface Ingredient {
    name: string;
    amount: string;
    unit: string;
    notes: string;
}

interface Step {
    title: string;
    details: string;
    time: string;
}

const difficulties = ['Easy', 'Medium', 'Hard'];
const units = ['cup', 'piece', 'clove', 'tablespoon', 'teaspoon', 'ml', 'gram', 'kg', 'ounce', 'pound', 'pinch', 'slice', 'bunch', 'can', 'jar'];

export default function AddRecipeScreen() {

    const navigation = useNavigation();
    const route = useRoute();
    const { user } = useAuth();

    const [image, setImage] = useState<string | null>(null);
    const [title, setTitle] = useState<string>('');
    const [intro, setIntro] = useState<string>('');
    const [prepTime, setPrepTime] = useState<string>('');
    const [cookTime, setCookTime] = useState<string>('');
    const [totalTime, setTotalTime] = useState<string>('');
    const [difficulty, setDifficulty] = useState<string>('Medium');
    const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: '', amount: '', unit: '', notes: '' }]);
    const [steps, setSteps] = useState<Step[]>([{ title: '', details: '', time: '' }]);
    const [tips, setTips] = useState('');
    const [serving, setServing] = useState('');
    const [nutrition, setNutrition] = useState('');
    const [youtube, setYoutube] = useState('');
    const [sourceUrl, setSourceUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showUnitModal, setShowUnitModal] = useState(false);
    const [selectedIngredientIndex, setSelectedIngredientIndex] = useState(0);
    const [isPrivate, setIsPrivate] = useState(false);

    const { viewMode, selectedDayIndex, weekOffset } = (route.params as any) || { viewMode: 'search' };
    const userId = user?.uid;

    // Helper function to convert time string to minutes
    const convertToMinutes = (timeStr: string): number => {
        if (!timeStr) return 0;

        // Remove any non-numeric characters except for decimal points
        const numericPart = timeStr.replace(/[^0-9.]/g, '');
        const number = parseFloat(numericPart);

        if (isNaN(number)) return 0;

        // Check if the string contains "hour" or "hr"
        if (timeStr.toLowerCase().includes('hour') || timeStr.toLowerCase().includes('hr')) {
            return number * 60;
        }

        return number;
    };

    useEffect(() => {
        const prepMinutes = convertToMinutes(prepTime);
        const cookMinutes = convertToMinutes(cookTime);
        const totalMinutes = prepMinutes + cookMinutes;

        if (totalMinutes > 0) {
            // Format the total time
            if (totalMinutes > 0) {
                // Always keep in minutes
                setTotalTime(`${totalMinutes}`);
            } else {
                setTotalTime('');
            }
        } else {
            setTotalTime('');
        }
    }, [prepTime, cookTime]);

    // Pick image from gallery
    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
            aspect: [4, 3],
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setImage(result.assets[0].uri);
            console.log('✅ Image selected:', result.assets[0].uri);
            console.log('📦 Image dimensions:', result.assets[0].width, 'x', result.assets[0].height);
        }
    };

    // Add new ingredient
    const addIngredient = () => setIngredients([...ingredients, { name: '', amount: '', unit: '', notes: '' }]);

    // Add new step
    const addStep = () => setSteps([...steps, { title: '', details: '', time: '' }]);

    // Handle ingredient changes
    const handleIngredientChange = (idx: number, field: keyof Ingredient, value: string) => {
        const newIngredients = [...ingredients];
        newIngredients[idx][field] = value;
        setIngredients(newIngredients);
    };

    // Handle step changes
    const handleStepChange = (idx: number, field: keyof Step, value: string) => {
        const newSteps = [...steps];
        newSteps[idx][field] = value;
        setSteps(newSteps);
    };


    // Handle form submission
    const handleAddRecipe = async () => {
        setIsLoading(true);

        try {
            if (!title || !intro || !ingredients || !steps) {
                Alert.alert("Missing Fields", "Please fill in all required fields (Title, Intro, Ingredients, Steps).");
                setIsLoading(false);
                return;
            }

            // Upload image if exists
            let imageUrl = '';
            if (image) {
                const fileName = `recipe_${Date.now()}.jpg`;
                imageUrl = await uploadImageToFirebase(image, fileName);
            }

            // Prepare recipe data
            const recipeData = {
                image: imageUrl,
                title,
                intro,
                prepTime,
                cookTime,
                totalTime,
                difficulty,
                ingredients,
                steps,
                tips,
                serving,
                nutrition,
                youtube,
                sourceUrl,
                isPrivate,
            };

            // 1️⃣ Save recipe → return recipeId
            const recipeId = await addRecipe(recipeData);

            // 2️⃣ Convert to planner format
            const plannerRecipe = {
                id: recipeId,
                title: recipeData.title,
                image: recipeData.image,
                totalTime: recipeData.totalTime || "",
                difficulty: recipeData.difficulty || "",
                source: "created" as const,
            };

            // 3️⃣ If planner mode → save into planner
            if (viewMode === 'planner') {
                console.log("Sini skdjnskjn ", weekOffset);
                console.log(selectedDayIndex);
                console.log(plannerRecipe);

                if (userId) {
                    // ✅ Check for duplicate recipe on the same day
                    const existingMealPlan = await loadMealPlanWithDetails(userId, weekOffset);
                    const recipesForDay = existingMealPlan?.[selectedDayIndex] || [];

                    // Check if recipe with same title already exists
                    const isDuplicate = recipesForDay.some(
                        (recipe) => recipe.title.toLowerCase() === plannerRecipe.title.toLowerCase()
                    );

                    if (isDuplicate) {
                        Alert.alert(
                            'Duplicate Recipe',
                            'This recipe is already in your meal plan for this day. Please choose a different recipe or day.',
                            [
                                {
                                    text: 'OK',
                                    onPress: () => {
                                        setIsLoading(false);
                                    }
                                }
                            ]
                        );
                        return; // Exit early, don't add the recipe
                    }

                    // If no duplicate, add to planner
                    await addRecipeToDay(
                        userId,
                        weekOffset,
                        selectedDayIndex,
                        plannerRecipe
                    );
                }
                Alert.alert('Success', "Recipe added successfully!", [
                    {
                        text: 'OK',
                        onPress: () => navigation.goBack(),
                    }
                ]);
            } else {
                Alert.alert('Success', "Recipe added successfully!", [
                    {
                        text: 'OK',
                        onPress: () => navigation.goBack(),
                    }
                ]);
            }
        } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            {isLoading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#FFB47B" />
                    <Text>Saving your recipe...</Text>
                </View>
            ) : (
                <ScrollView className="flex-1 px-4 pt-2" showsVerticalScrollIndicator={false}
                    style={{ backgroundColor: colors.secondary }}>
                    <Header
                        title="Create New Recipe"
                        showBackButton={true}
                        onBack={() => navigation.goBack()}
                    />
                    <View className="rounded-3xl shadow-lg p-6 mb-8"
                        style={{
                            backgroundColor: colors.secondary,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.1,
                            shadowRadius: 12,
                            elevation: 8,
                        }}>
                        {/* Image Picker */}
                        <View className="items-center mb-8">
                            <Text className="text-sm font-semibold text-gray-700 mb-3">
                                Recipe Photo
                            </Text>
                            <TouchableOpacity
                                onPress={pickImage}
                                activeOpacity={0.8}
                                className="relative"
                                style={{
                                    shadowColor: '#FF9966',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 6,
                                }}
                            >
                                {image ? (
                                    <>
                                        <Image source={{ uri: image }} className="w-40 h-40 rounded-2xl" />
                                        <View className="absolute bottom-2 right-2 bg-orange-500 rounded-full p-2">
                                            <Feather name="edit-2" size={16} color="white" />
                                        </View>
                                    </>
                                ) : (
                                    <View className="w-40 h-40 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 items-center justify-center border-2 border-dashed border-orange-300">
                                        <Feather name="camera" size={40} color="#FF9966" />
                                        <Text className="text-orange-500 font-semibold mt-3">Add Photo</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Section: Basic Info */}
                        <View className="mb-6">
                            <View className="flex-row items-center mb-4">
                                <View className="w-1 h-6 bg-orange-500 rounded-full mr-2" />
                                <Text className="text-xl font-bold text-gray-800">Basic Information</Text>
                            </View>

                            {/* Title */}
                            <View className="mb-4">
                                <View className="flex-row items-center mb-2">
                                    <Ionicons name="restaurant" size={18} color="#FF9966" />
                                    <Text className="font-semibold text-gray-700 ml-2">
                                        Recipe Title
                                        <Text className="text-red-500"> *</Text>
                                    </Text>
                                </View>
                                <TextInput
                                    className="border-2 border-gray-100 rounded-xl px-4 py-3 bg-white text-gray-800"
                                    placeholder="e.g., Grandma's Chocolate Cake"
                                    placeholderTextColor="#9CA3AF"
                                    value={title}
                                    onChangeText={setTitle}
                                    style={{
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: 0.05,
                                        shadowRadius: 2,
                                        elevation: 1,
                                    }}
                                />
                            </View>

                            {/* Introduction */}
                            <View className="mb-4">
                                <View className="flex-row items-center mb-2">
                                    <Ionicons name="document-text-outline" size={18} color="#FF9966" />
                                    <Text className="font-semibold text-gray-700 ml-2">
                                        Description
                                        <Text className="text-red-500"> *</Text>
                                    </Text>
                                </View>
                                <TextInput
                                    className="border-2 border-gray-100 rounded-xl px-4 py-3 bg-white text-gray-800"
                                    placeholder="Describe your recipe..."
                                    placeholderTextColor="#9CA3AF"
                                    value={intro}
                                    onChangeText={setIntro}
                                    multiline
                                    numberOfLines={3}
                                    textAlignVertical="top"
                                    style={{
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: 0.05,
                                        shadowRadius: 2,
                                        elevation: 1,
                                    }}
                                />
                            </View>
                        </View>

                        {/* Times */}
                        <View className="mb-4">
                            <Text className='font-semibold text-gray-700 mb-1 items-center'>
                                <Ionicons name="time-outline" size={18} color="#FFB47B" /> Time
                                <Text className="text-red-500"> *</Text>
                            </Text>
                            <View className="flex-row">
                                <View className="flex-1">
                                    <Text className="text-gray-700 mb-1">Prep Time</Text>
                                    <TextInput className="border border-gray-200 rounded-lg px-3 py-2 bg-white" placeholder="Prep Time" value={prepTime} onChangeText={setPrepTime} />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-gray-700 mb-1">Cook Time</Text>
                                    <TextInput className="border border-gray-200 rounded-lg px-3 py-2 bg-white" placeholder="Cook Time" value={cookTime} onChangeText={setCookTime} />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-gray-700 mb-1">Total Time</Text>
                                    <TextInput className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-200" placeholder="Total Time" value={totalTime} editable={false} />
                                </View>
                            </View>
                        </View>

                        {/* Difficulty */}
                        <View className="mb-4">
                            <Text className="font-semibold text-gray-700 mb-1 flex-row items-center">
                                <MaterialCommunityIcons name="spirit-level" size={18} color="#FFB47B" /> Difficulty
                                <Text className="text-red-500"> *</Text>
                            </Text>
                            <View className="flex-row space-x-2">
                                {difficulties.map((d) => (
                                    <TouchableOpacity key={d} className={`px-3 py-1 rounded-full border ${difficulty === d ? 'bg-[#FFB47B] border-[#FFB47B]' : 'border-gray-300 bg-white'}`} onPress={() => setDifficulty(d)}>
                                        <Text className={difficulty === d ? 'text-white' : 'text-gray-700'}>{d}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Ingredients */}
                        <Text className="font-semibold text-gray-800 mb-2 flex-row items-center">
                            <Ionicons name="list-outline" size={18} color="#FFB47B" /> Ingredients
                            <Text className="text-red-500"> *</Text>
                        </Text>
                        {ingredients.map((ing, idx) => (
                            <View key={idx} className="flex-row space-x-2 mb-2">
                                <TextInput className="border border-gray-200 rounded-lg px-2 py-1 flex-1 bg-white" placeholder="Name" value={ing.name} onChangeText={(v) => handleIngredientChange(idx, 'name', v)} />
                                <TextInput className="border border-gray-200 rounded-lg px-2 py-1 w-14 bg-white" placeholder="Amt" value={ing.amount} onChangeText={(v) => handleIngredientChange(idx, 'amount', v)} />
                                <TouchableOpacity
                                    className="bg-orange-50 border-2 border-orange-200 rounded-xl px-2 py-2 w-24 justify-center items-center"
                                    onPress={() => {
                                        setSelectedIngredientIndex(idx);
                                        setShowUnitModal(true);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View className="flex-row items-center">
                                        <Text className="text-orange-600 font-bold text-xs mr-1" numberOfLines={1}>
                                            {ing.unit || 'Unit'}
                                        </Text>
                                        <Ionicons name="chevron-down" size={12} color="#EA580C" />
                                    </View>
                                </TouchableOpacity>
                                <TextInput className="border border-gray-200 rounded-lg px-2 py-1 flex-1 bg-white" placeholder="Notes" value={ing.notes} onChangeText={(v) => handleIngredientChange(idx, 'notes', v)} />
                            </View>
                        ))}
                        <TouchableOpacity className="mb-4" onPress={addIngredient}>
                            <Text className="text-[#FFB47B] font-semibold">+ Add Ingredient</Text>
                        </TouchableOpacity>

                        {/* Steps */}
                        <Text className="font-semibold text-gray-800 mb-2 flex-row items-center">
                            <Ionicons name="list-outline" size={18} color="#FFB47B" /> Step-by-Step Instructions
                            <Text className="text-red-500"> *</Text>
                        </Text>
                        {steps.map((step, idx) => (
                            <View key={idx} className="mb-2">
                                <TextInput className="border border-gray-200 rounded-lg px-2 py-1 mb-1 bg-white" placeholder="Step Title" value={step.title} onChangeText={(v) => handleStepChange(idx, 'title', v)} />
                                <TextInput className="border border-gray-200 rounded-lg px-2 py-1 mb-1 bg-white" placeholder="Details" value={step.details} onChangeText={(v) => handleStepChange(idx, 'details', v)} />
                                <TextInput className="border border-gray-200 rounded-lg px-2 py-1 bg-white" placeholder="Time" value={step.time} onChangeText={(v) => handleStepChange(idx, 'time', v)} />
                            </View>
                        ))}
                        <TouchableOpacity className="mb-4" onPress={addStep}>
                            <Text className="text-[#FFB47B] font-semibold">+ Add Step</Text>
                        </TouchableOpacity>

                        {/* Tips and Tricks */}
                        <View className="mb-4">
                            <Text className="font-semibold text-gray-700 mb-1">
                                <MaterialIcons name="tips-and-updates" size={18} color="#FFB47B" /> Tips and Tricks</Text>
                            <TextInput className="border border-gray-200 rounded-lg px-3 py-2 bg-white" placeholder="Tips and Tricks" value={tips} onChangeText={setTips} />
                        </View>

                        {/* Serving Suggestions */}
                        <View className="mb-4">
                            <Text className="font-semibold text-gray-700 mb-1">
                                <MaterialCommunityIcons name="room-service-outline" size={18} color="#FFB47B" /> Serving Suggestions</Text>
                            <TextInput className="border border-gray-200 rounded-lg px-3 py-2 bg-white" placeholder="Serving Suggestions" value={serving} onChangeText={setServing} />
                        </View>

                        {/* Nutrition Facts */}
                        <View className="mb-4">
                            <Text className="font-semibold text-gray-700 mb-1">
                                <MaterialCommunityIcons name="nutrition" size={18} color="#FFB47B" /> Nutrition Facts</Text>
                            <TextInput className="border border-gray-200 rounded-lg px-3 py-2 bg-white" placeholder="Nutrition Facts" value={nutrition} onChangeText={setNutrition} />
                        </View>

                        {/* YouTube Link */}
                        <View className="mb-8">
                            <Text className="font-semibold text-gray-700 mb-1 flex-row items-center">
                                <Ionicons name="logo-youtube" size={18} color="#FFB47B" /> YouTube Link
                            </Text>
                            <TextInput className="border border-gray-200 rounded-lg px-3 py-2 bg-white" placeholder="YouTube Video Link" value={youtube} onChangeText={setYoutube} />
                        </View>

                        {/* Source URL */}
                        <View className="mb-8">
                            <Text className="font-semibold text-gray-700 mb-1 flex-row items-center">
                                <MaterialCommunityIcons name="link-variant" size={18} color="#FFB47B" /> Source URL
                            </Text>
                            <TextInput className="border border-gray-200 rounded-lg px-3 py-2 bg-white" placeholder="Source URL" value={sourceUrl} onChangeText={setSourceUrl} />
                        </View>

                        {/* Privacy Toggle - ADD THIS */}
                        <View className="mb-8">
                            <View className="flex-row items-center justify-between mb-1">
                                <View className="flex-1">
                                    <Text className="font-semibold text-gray-700 flex-row items-center">
                                        <Ionicons
                                            name={isPrivate ? "lock-closed" : "lock-open"}
                                            size={18}
                                            color="#FFB47B"
                                        /> Recipe Privacy
                                    </Text>
                                    <Text className="text-gray-500 text-sm mt-1">
                                        {isPrivate
                                            ? 'Only you can see this recipe'
                                            : 'Everyone can see this recipe'
                                        }
                                    </Text>
                                </View>

                                <Switch
                                    value={isPrivate}
                                    onValueChange={setIsPrivate}
                                    trackColor={{ false: '#E5E5E5', true: '#FFB47B' }}
                                    thumbColor="#FFFFFF"
                                    ios_backgroundColor="#E5E5E5"
                                />
                            </View>
                        </View>
                        {/* Submit Button */}
                        <TouchableOpacity
                            className="p-5 rounded-2xl mb-2"
                            onPress={handleAddRecipe}
                            activeOpacity={0.8}
                            style={{
                                backgroundColor: '#FF914D',
                                shadowColor: '#FF914D',
                                shadowOffset: { width: 0, height: 6 },
                                shadowOpacity: 0.4,
                                shadowRadius: 10,
                                elevation: 8,
                            }}
                        >
                            <View className="flex-row items-center justify-center">
                                <Ionicons name="checkmark-circle" size={24} color="white" />
                                <Text className="text-white text-center font-bold text-lg ml-2">Save Recipe</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            )
            }

            {/* Beautiful Unit Selection Modal */}
            {showUnitModal && (
                <View className="absolute inset-0 justify-center items-center px-6" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
                    <View className="bg-white rounded-3xl p-6 w-full max-w-sm" style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.3,
                        shadowRadius: 20,
                        elevation: 10,
                    }}>
                        {/* Header */}
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-2xl font-bold text-gray-800">Select Unit</Text>
                            <TouchableOpacity
                                onPress={() => setShowUnitModal(false)}
                                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                            >
                                <Ionicons name="close" size={20} color="#666" />
                            </TouchableOpacity>
                        </View>

                        {/* Unit Grid */}
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            className="max-h-96"
                            contentContainerStyle={{ paddingBottom: 8 }}
                        >
                            <View className="flex-row flex-wrap gap-2">
                                {units.map((unit) => {
                                    const isSelected = ingredients[selectedIngredientIndex]?.unit === unit;
                                    return (
                                        <TouchableOpacity
                                            key={unit}
                                            className={`px-4 py-3 rounded-xl border-2 ${isSelected
                                                ? 'bg-orange-500 border-orange-500'
                                                : 'bg-white border-gray-200'
                                                }`}
                                            onPress={() => {
                                                handleIngredientChange(selectedIngredientIndex, 'unit', unit);
                                                setShowUnitModal(false);
                                            }}
                                            activeOpacity={0.7}
                                            style={{
                                                shadowColor: isSelected ? '#FF9966' : '#000',
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: isSelected ? 0.3 : 0.05,
                                                shadowRadius: 4,
                                                elevation: isSelected ? 3 : 1,
                                            }}
                                        >
                                            <View className="flex-row items-center">
                                                <Text className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-700'
                                                    }`}>
                                                    {unit}
                                                </Text>
                                                {isSelected && (
                                                    <Ionicons
                                                        name="checkmark-circle"
                                                        size={18}
                                                        color="white"
                                                        style={{ marginLeft: 6 }}
                                                    />
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    </View>
                </View>
            )}
        </KeyboardAvoidingView >
    );
}
