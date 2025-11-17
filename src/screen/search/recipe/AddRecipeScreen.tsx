import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, Feather } from '@expo/vector-icons';
import { addRecipe } from '../../../controller/recipe';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ActivityIndicator } from 'react-native';
import Header from '../../../components/Header';
import { uploadImageToFirebase } from '~/utils/uploadImage';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAuth } from '~/context/AuthContext';
import { Picker } from '@react-native-picker/picker';
import { addRecipeToDay } from '~/controller/planner';


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

    const { viewMode, selectedDayIndex, weekOffset } = (route.params as any) || {viewMode: 'search'};
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
            mediaTypes: ['images'],  // ✅ Changed from MediaTypeOptions.Images
            allowsEditing: true,
            quality: 0.8,  // ✅ Reduced quality to make upload faster
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
            console.log("Sini skdjnskjn ",weekOffset);
            console.log(selectedDayIndex);
            console.log(plannerRecipe);
            if (userId) {
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
                <ScrollView className="flex-1 bg-secondary px-2 pt-6" showsVerticalScrollIndicator={false}>
                    <Header
                        title="Add Recipe"
                        showBackButton={true}
                        onBack={() => navigation.goBack()}
                    />
                    <View className="bg-white rounded-2xl shadow-md p-4 mb-8">
                        {/* Image Picker */}
                        <TouchableOpacity className="items-center mb-6" onPress={pickImage}>
                            {image ? (
                                <Image source={{ uri: image }} className="w-32 h-32 rounded-xl shadow" />
                            ) : (
                                <View className="w-32 h-32 rounded-xl bg-gray-100 items-center justify-center shadow">
                                    <Feather name="image" size={32} color="#FFB47B" />
                                    <Text className="text-gray-400 mt-2">Pick Image</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Title */}
                        <View className="mb-4">
                            <Text className="font-semibold text-gray-700 mb-1 flex-row items-center">
                                <Ionicons name="book-outline" size={18} color="#FFB47B" /> Recipe Title
                                <Text className="text-red-500"> *</Text>
                            </Text>
                            <TextInput className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50" placeholder="Recipe Title" value={title} onChangeText={setTitle} />
                        </View>

                        {/* Introduction */}
                        <View className="mb-4">
                            <Text className="font-semibold text-gray-700 mb-1 flex-row items-center">
                                <Ionicons name="information-circle-outline" size={18} color="#FFB47B" /> Brief Introduction
                                <Text className="text-red-500"> *</Text>
                            </Text>
                            <TextInput className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50" placeholder="Brief Introduction" value={intro} onChangeText={setIntro} />
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
                                    <TextInput className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50" placeholder="Prep Time" value={prepTime} onChangeText={setPrepTime} />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-gray-700 mb-1">Cook Time</Text>
                                    <TextInput className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50" placeholder="Cook Time" value={cookTime} onChangeText={setCookTime} />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-gray-700 mb-1">Total Time</Text>
                                    <TextInput className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50" placeholder="Total Time" value={totalTime} editable={false} />
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
                                    <TouchableOpacity key={d} className={`px-3 py-1 rounded-full border ${difficulty === d ? 'bg-[#FFB47B] border-[#FFB47B]' : 'border-gray-300 bg-gray-50'}`} onPress={() => setDifficulty(d)}>
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
                                <TextInput className="border border-gray-200 rounded-lg px-2 py-1 flex-1 bg-gray-50" placeholder="Name" value={ing.name} onChangeText={(v) => handleIngredientChange(idx, 'name', v)} />
                                <TextInput className="border border-gray-200 rounded-lg px-2 py-1 w-14 bg-gray-50" placeholder="Amt" value={ing.amount} onChangeText={(v) => handleIngredientChange(idx, 'amount', v)} />
                                <TouchableOpacity
                                    className="border border-gray-200 rounded-lg bg-gray-50 w-20 justify-center items-center"
                                    onPress={() => {
                                        setSelectedIngredientIndex(idx);
                                        setShowUnitModal(true);
                                    }}
                                >
                                    <Text className="text-gray-700">
                                        {ing.unit || 'Unit'}
                                    </Text>
                                </TouchableOpacity>
                                <TextInput className="border border-gray-200 rounded-lg px-2 py-1 flex-1 bg-gray-50" placeholder="Notes" value={ing.notes} onChangeText={(v) => handleIngredientChange(idx, 'notes', v)} />
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
                                <TextInput className="border border-gray-200 rounded-lg px-2 py-1 mb-1 bg-gray-50" placeholder="Step Title" value={step.title} onChangeText={(v) => handleStepChange(idx, 'title', v)} />
                                <TextInput className="border border-gray-200 rounded-lg px-2 py-1 mb-1 bg-gray-50" placeholder="Details" value={step.details} onChangeText={(v) => handleStepChange(idx, 'details', v)} />
                                <TextInput className="border border-gray-200 rounded-lg px-2 py-1 bg-gray-50" placeholder="Time" value={step.time} onChangeText={(v) => handleStepChange(idx, 'time', v)} />
                            </View>
                        ))}
                        <TouchableOpacity className="mb-4" onPress={addStep}>
                            <Text className="text-[#FFB47B] font-semibold">+ Add Step</Text>
                        </TouchableOpacity>

                        {/* Tips and Tricks */}
                        <View className="mb-4">
                            <Text className="font-semibold text-gray-700 mb-1">
                                <MaterialIcons name="tips-and-updates" size={18} color="#FFB47B" /> Tips and Tricks</Text>
                            <TextInput className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50" placeholder="Tips and Tricks" value={tips} onChangeText={setTips} />
                        </View>

                        {/* Serving Suggestions */}
                        <View className="mb-4">
                            <Text className="font-semibold text-gray-700 mb-1">
                                <MaterialCommunityIcons name="room-service-outline" size={18} color="#FFB47B" /> Serving Suggestions</Text>
                            <TextInput className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50" placeholder="Serving Suggestions" value={serving} onChangeText={setServing} />
                        </View>

                        {/* Nutrition Facts */}
                        <View className="mb-4">
                            <Text className="font-semibold text-gray-700 mb-1">
                                <MaterialCommunityIcons name="nutrition" size={18} color="#FFB47B" /> Nutrition Facts</Text>
                            <TextInput className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50" placeholder="Nutrition Facts" value={nutrition} onChangeText={setNutrition} />
                        </View>

                        {/* YouTube Link */}
                        <View className="mb-8">
                            <Text className="font-semibold text-gray-700 mb-1 flex-row items-center">
                                <Ionicons name="logo-youtube" size={18} color="#FFB47B" /> YouTube Link
                            </Text>
                            <TextInput className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50" placeholder="YouTube Video Link" value={youtube} onChangeText={setYoutube} />
                        </View>

                        {/* Source URL */}
                        <View className="mb-8">
                            <Text className="font-semibold text-gray-700 mb-1 flex-row items-center">  
                                <MaterialCommunityIcons name="link-variant" size={18} color="#FFB47B" /> Source URL
                            </Text>
                            <TextInput className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50" placeholder="Source URL" value={sourceUrl} onChangeText={setSourceUrl} />
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity className="bg-[#FFB47B] p-4 rounded-xl mb-2" onPress={handleAddRecipe}>
                            <Text className="text-white text-center font-semibold text-base">Save Recipe</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            )}

            {/* Unit Selection Modal */}
            {showUnitModal && (
                <View className="absolute inset-0 bg-black bg-opacity-50 justify-center items-center">
                    <View className="bg-white rounded-lg p-4 w-80 max-h-96">
                        <Text className="text-lg font-semibold text-center mb-4">Select Unit</Text>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {units.map((unit) => (
                                <TouchableOpacity
                                    key={unit}
                                    className="p-3 border-b border-gray-200"
                                    onPress={() => {
                                        handleIngredientChange(selectedIngredientIndex, 'unit', unit);
                                        setShowUnitModal(false);
                                    }}
                                >
                                    <Text className="text-center text-gray-700">{unit}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity
                            className="mt-4 p-3 bg-gray-200 rounded-lg"
                            onPress={() => setShowUnitModal(false)}
                        >
                            <Text className="text-center text-gray-700">Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}
