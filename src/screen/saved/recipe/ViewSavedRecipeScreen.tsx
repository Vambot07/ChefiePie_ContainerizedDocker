import { useState, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Linking, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { getRecipeById, unsaveRecipe, isRecipeSaved } from '../../../controller/recipe';
import { addItemsToChecklist } from '../../../controller/checklist';
import Header from '../../../components/Header';
import * as Speech from 'expo-speech';
import colors from '~/utils/color';

const ViewSavedRecipeScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { recipeId } = route.params as { recipeId: string };

    const [recipe, setRecipe] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [isSaved, setIsSaved] = useState<boolean>(true);
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [tab, setTab] = useState<'ingredient' | 'procedure'>('ingredient');
    const [selectedIngredients, setSelectedIngredients] = useState<any[]>([]);;
    const [voiceMode, setVoiceMode] = useState<boolean>(false);
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);

    useFocusEffect(
        useCallback(() => {
            const fetchRecipeDetails = async () => {
                if (!recipeId) {
                    Alert.alert('Error', 'No recipe ID found.');
                    navigation.goBack();
                    return;
                }
                setLoading(true);
                try {
                    const recipeData = await getRecipeById(recipeId);
                    setRecipe(recipeData);
                    const savedStatus = await isRecipeSaved(recipeId);
                    setIsSaved(savedStatus);
                } catch (error) {
                    Alert.alert('Error', 'Could not fetch recipe details.');
                    navigation.goBack();
                } finally {
                    setLoading(false);
                }
            };
            fetchRecipeDetails();
        }, [recipeId])
    );

    const handleUnsaveRecipe = async () => {
        if (!recipe) return;
        setLoadingAction('unsaving');
        try {
            await unsaveRecipe(recipe.id);
            setIsSaved(false);
            Alert.alert('Success', 'Recipe has been unsaved.', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to unsave recipe');
        } finally {
            setLoadingAction(null);
        }
    };

    const toggleIngredientSelection = (ingredient: any) => {
        setSelectedIngredients((currentSelected) => {
            const isIngredientSelected = currentSelected.some(
                (item) => item.name === ingredient.name
            );

            if (isIngredientSelected) {
                return currentSelected.filter((item) => item.name !== ingredient.name);
            } else {
                return [...currentSelected, ingredient];
            }
        });
    };

    const handleAddSelectedToChecklist = async () => {
        if (selectedIngredients.length === 0) {
            Alert.alert('No Ingredients Selected', 'Please tap on ingredients to select them first.');
            return;
        }

        setLoadingAction('adding-to-list');
        try {
            await addItemsToChecklist(selectedIngredients);
            Alert.alert('Success!', 'Selected ingredients have been added to your shopping list.');
            setSelectedIngredients([]);
        } catch (error) {
            Alert.alert('Error', 'Could not add ingredients. Please try again.');
        } finally {
            setLoadingAction(null);
        }
    };

    const handleYouTubeLink = () => {
        if (!recipe?.youtube) {
            Alert.alert('No Video', 'This recipe does not have a video tutorial.');
            return;
        }
        Linking.openURL(recipe.youtube).catch((error) => {
            console.error('Error opening link:', error);
            Alert.alert('Error', 'Could not open the video link. Please try again.');
        });
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-[#FFF6F0]">
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#FFB47B" />
                    <Text className="mt-2 text-gray-600">Loading Recipe...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!recipe) {
        return (
            <SafeAreaView className="flex-1 bg-[#FFF6F0]">
                <Header title="Error" showBackButton={true} onBack={() => navigation.goBack()} />
                <View className="flex-1 justify-center items-center">
                    <Text className="text-lg text-gray-600">Recipe not found.</Text>
                    <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4 bg-[#FFB47B] px-4 py-2 rounded-lg">
                        <Text className="text-white font-semibold">Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const handlePressIn = () => {
        // Start timer when the button is pressed down
        const timer = setTimeout(() => {
            setVoiceMode(true);
            // Trigger vibration after the user holds for 3 seconds
            Vibration.vibrate(1000); // Vibrates for 1 second
            Speech.speak('Start the cooking');
        }, 1000); // 1 seconds
        setPressTimer(timer);
    };


    const handlePressOut = () => {
        // Clear the timer if the user releases the button before 3 seconds
        if (pressTimer) {
            clearTimeout(pressTimer);
            setPressTimer(null);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-[#FFF6F0]">
            <View className="flex-1">
                <Header
                    title={recipe.title}
                    showBackButton={true}
                    onBack={() => navigation.goBack()}
                    backgroundColor="#FFF6F0"
                    textColor="#222"
                />

                {loadingAction && (
                    <View className="absolute inset-0 bg-black/50 z-50 items-center justify-center">
                        <View className="bg-white rounded-xl p-6 items-center">
                            <ActivityIndicator size="large" color="#FFB47B" />
                            <Text className="mt-3 text-gray-700 font-medium">
                                {loadingAction === 'unsaving' && 'Unsaving recipe...'}
                                {loadingAction === 'adding-to-list' && 'Adding to your list...'}
                            </Text>
                        </View>
                    </View>
                )}

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                    <View className="p-4">
                        {/* Recipe Image with YouTube overlay */}
                        <View className="relative mb-4">
                            {recipe.youtube ? (
                                <>
                                    <Image source={{ uri: recipe.image }} className="w-full h-56 rounded-2xl" />
                                    <TouchableOpacity
                                        className="absolute top-3 left-5 bg-black/60 px-3 py-1 rounded-full flex-row items-center"
                                    >
                                        <Ionicons name="logo-youtube" size={16} color="#fff" />
                                        <Text className="text-white ml-2 text-xs">Watch on YouTube</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        className="absolute top-1/2 left-1/2"
                                        onPress={handleYouTubeLink}
                                        style={{ transform: [{ translateX: -24 }, { translateY: -24 }] }}
                                    >
                                        <Ionicons name="play-circle" size={48} color="#fff" />
                                    </TouchableOpacity>
                                </>
                            ) : <>
                                <View className="w-full h-56 rounded-2xl bg-gray-100 justify-center items-center">
                                    <Text className="text-gray-700 font-bold mb-2">
                                        Sorry, the video is not available
                                    </Text>
                                </View>
                            </>}
                        </View>

                        <View className="flex-row items-start justify-between mb-4">
                            <View className="flex-1 pr-4">
                                <Text className="text-2xl font-bold text-gray-900">{recipe.title}</Text>
                            </View>
                            <TouchableOpacity
                                className={`px-4 py-2 rounded-full ${isSaved ? 'bg-red-500' : 'bg-gray-400'}`}
                                onPress={handleUnsaveRecipe}
                                disabled={!!loadingAction || !isSaved}
                            >
                                <Text className="text-white font-semibold">
                                    {isSaved ? 'Unsave' : 'Unsaved'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {recipe.intro && <Text className="text-gray-700 mb-4">{recipe.intro}</Text>}

                        {recipe.author && (
                            <View className="flex-row justify-between items-center bg-white p-4 rounded-2xl mb-4">
                                <View className="flex-row items-center">
                                    {recipe.author.avatar && <Image source={{ uri: recipe.author.avatar }} className="w-10 h-10 rounded-full" />}
                                    <View className="ml-3">
                                        <Text className="font-semibold text-gray-800">{recipe.author.name || 'Unknown Chef'}</Text>
                                        <Text className="text-sm text-gray-500">Creator</Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={24} color="#FFB47B" />
                            </View>
                        )}

                        <View className="flex-row justify-around mb-4">
                            <TouchableOpacity
                                className={`flex-1 py-3 rounded-xl ${tab === 'ingredient' ? 'bg-[#FFB47B]' : 'bg-white'}`}
                                onPress={() => setTab('ingredient')}
                            >
                                <Text className={`text-center font-semibold ${tab === 'ingredient' ? 'text-white' : 'text-gray-700'}`}>Ingredients</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className={`flex-1 py-3 rounded-xl ml-2 ${tab === 'procedure' ? 'bg-[#FFB47B]' : 'bg-white'}`}
                                onPress={() => setTab('procedure')}
                            >
                                <Text className={`text-center font-semibold ${tab === 'procedure' ? 'text-white' : 'text-gray-700'}`}>Procedure</Text>
                            </TouchableOpacity>
                        </View>

                        {tab === 'ingredient' && (
                            <View>
                                <View className="flex-row justify-between items-center mb-2">
                                    <Text className="text-lg font-bold text-gray-800">Ingredients ({recipe.ingredients?.length || 0})</Text>
                                    <TouchableOpacity
                                        className={`rounded-xl px-4 py-2 shadow-sm ${selectedIngredients.length > 0 ? 'bg-green-500' : 'bg-gray-200'}`}
                                        onPress={handleAddSelectedToChecklist}
                                        disabled={selectedIngredients.length === 0 || !!loadingAction}
                                    >
                                        <Text className={`font-semibold ${selectedIngredients.length > 0 ? 'text-white' : 'text-gray-400'}`}>
                                            Add to List
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                {recipe.ingredients?.map((ing: any, idx: number) => {
                                    const isSelected = selectedIngredients.some(item => item.name === ing.name);
                                    return (
                                        <TouchableOpacity
                                            key={idx}
                                            className={`flex-row items-center rounded-xl mb-3 px-4 py-3 shadow-sm transition-colors duration-200 ${isSelected ? 'bg-green-100 border border-green-300' : 'bg-white'}`}
                                            onPress={() => toggleIngredientSelection(ing)}
                                        >
                                            <Text className="flex-1 font-semibold text-gray-800 capitalize">{ing.name}</Text>
                                            <Text className="text-gray-500 mr-2">{ing.amount + ' ' + ing.unit}</Text>
                                            <View className="w-7 h-7">
                                                {isSelected && (
                                                    <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}

                        {tab === 'procedure' && (
                            <View>
                                <Text className="text-lg font-semibold text-gray-800 mb-4">Instructions</Text>
                                {recipe.steps?.map((step: any, idx: number) => (
                                    <View key={idx} className="mb-6 bg-white rounded-xl p-4 shadow-sm">
                                        <View className="flex-row items-center mb-2">
                                            <Text className="text-[#FFB47B] font-bold mr-3 text-lg">{idx + 1}</Text>
                                            <Text className="font-semibold text-gray-800 flex-1">{step.title || `Step ${idx + 1}`}</Text>
                                        </View>
                                        <Text className="text-gray-700 ml-8">{step.details}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                </ScrollView>

                {/* Floating Microphone Button */}
                <TouchableOpacity
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    style={{
                        position: 'absolute',
                        bottom: 100,
                        right: 25,
                        backgroundColor: voiceMode ? '#22C55E' : '#F9A826',
                        width: 60,
                        height: 60,
                        borderRadius: 30,
                        justifyContent: 'center',
                        alignItems: 'center',
                        elevation: 5,
                    }}
                >
                    <Ionicons name={voiceMode ? "mic" : "mic-outline"} size={30} color="white" />
                </TouchableOpacity>

                {voiceMode && (
                    <TouchableOpacity
                        onPress={() => setVoiceMode(false)}
                        style={{
                            position: 'absolute',
                            bottom: 170,
                            right: 25,
                            backgroundColor: '#EF4444',
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            justifyContent: 'center',
                            alignItems: 'center',
                            elevation: 5,
                        }}
                    >
                        <Ionicons name="close" size={24} color="white" />
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
};

export default ViewSavedRecipeScreen;
