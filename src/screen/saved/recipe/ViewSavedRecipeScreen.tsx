import { useState, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Linking, Vibration, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { getRecipeById, unsaveRecipe, isRecipeSaved } from '../../../controller/recipe';
import { addItemsToChecklist } from '../../../controller/checklist';
import Header from '../../../components/Header';
import * as Speech from 'expo-speech';

const ViewSavedRecipeScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { recipeId } = route.params as { recipeId: string };

    const [recipe, setRecipe] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [isSaved, setIsSaved] = useState<boolean>(true);
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [tab, setTab] = useState<'ingredient' | 'procedure'>('ingredient');
    const [selectedIngredients, setSelectedIngredients] = useState<any[]>([]);
    const [voiceMode, setVoiceMode] = useState<boolean>(false);
    const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
    const [overlaySize, setOverlaySize] = useState({ w: 0, h: 0 });

    const shadowStyle = Platform.select({
        android: { elevation: 3},
        ios: { shadowColor: '#000',
               shadowOffset: { width: 0, height: 1 },
               shadowOpacity: 0.18,
               shadowRadius: 1.00,
        },
    })

    // Fetch recipe details on focus
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
                    console.log('Fetching recipe with ID:', recipeId);
                    const recipeData = await getRecipeById(recipeId);
                    console.log('Fetched recipe data:', recipeData);
                    const cleanedIntro = recipeData.intro?.replace(/<[^>]+>/g, '') || '';
                    const recipeToSet = {
                        ...recipeData,
                        intro: cleanedIntro,
                    }
                    setRecipe(recipeToSet);

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
            const isIngredientSelected = currentSelected.some((item) => item.name === ingredient.name);
            if (isIngredientSelected) {
                return currentSelected.filter((item) => item.name !== ingredient.name);
            } else {
                return [...currentSelected, ingredient];
            }
        });
    };

    const handleAddSelectedToChecklist = async () => {
        console.log("sdkmskldm");
        console.log(selectedIngredients);
        if (selectedIngredients.length === 0) {
            Alert.alert('No Ingredients Selected', 'Please tap on ingredients to select them first.');
            return;
        }

        setLoadingAction('adding-to-list');
        try {
            await addItemsToChecklist(selectedIngredients);
            console.log('Added ingredients to checklist:', selectedIngredients);
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
        Linking.openURL(recipe.youtube).catch(() => {
            Alert.alert('Error', 'Could not open the video link.');
        });
    };

    const handleSourceURL = () => {
        if (!recipe?.sourceUrl) {  
            Alert.alert('No Source URL', 'This recipe does not have a source URL.');
            return;
        }      
        Linking.openURL(recipe.sourceUrl).catch(() => {
            Alert.alert('Error', 'Could not open the source URL.');
        });
    };

    const handlePressIn = () => {
        const timer = setTimeout(() => {
            setVoiceMode(true);
            Vibration.vibrate(1000);
            Speech.speak('Start the cooking');
        }, 1000);
        setPressTimer(timer);
    };

    const handlePressOut = () => {
        if (pressTimer) {
            clearTimeout(pressTimer);
            setPressTimer(null);
        }
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

    return (
        <View className="flex-1 bg-[#FFF6F0]">
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
                        {/* Recipe Image and YouTube */}
                        <View className="relative mb-4">
                            <Image
                                source={{ uri: recipe.image }}
                                className="w-full h-56 rounded-2xl"
                            />

                            {/* YOUTUBE */}
                            {recipe.youtube && (
                                <>
                                    {/* Badge */}
                                    <TouchableOpacity
                                        onPress={handleYouTubeLink}
                                        className="absolute top-3 left-5 bg-black/30 px-3 py-1 rounded-full flex-row items-center"
                                    >
                                        <Ionicons name="logo-youtube" size={16} color="#fff" />
                                        <Text className="text-white ml-2 text-xs">Watch on YouTube</Text>
                                    </TouchableOpacity>

                                    {/* Center Play Button */}
                                    <TouchableOpacity
                                        onPress={handleYouTubeLink}
                                        style={{
                                            position: 'absolute',
                                            top: "50%",
                                            left: "50%",
                                            transform: [{ translateX: -24 }, { translateY: -24 }],
                                        }}
                                    >
                                        <Ionicons name="play-circle" size={48} color="#fff" />
                                    </TouchableOpacity>
                                </>
                            )}

                            {/* SOURCE URL */}
                            {!recipe.youtube && recipe.sourceUrl && (
                                <TouchableOpacity
                                    onPress={handleSourceURL}
                                    onLayout={(e) => {
                                        const { width, height } = e.nativeEvent.layout;
                                        setOverlaySize({ w: width, h: height });
                                    }}
                                    style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: [
                                            { translateX: -(overlaySize.w / 2) },
                                            { translateY: -(overlaySize.h / 2) }
                                        ],
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                >

                                    <View
                                        style={{
                                            backgroundColor: 'rgba(0,0,0,0.4)',
                                            paddingVertical: 10,
                                            paddingHorizontal: 18,
                                            borderRadius: 16,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}
                                    >
                                    <Ionicons name="link-sharp" size={48} color="#fff" />
                                    <Text className="font-bold text-base text-white mt-1">
                                        Go to Recipe Page
                                    </Text>
                                    </View>
                                </TouchableOpacity>

                            )}

                            {/* TIME BADGE */}
                            {(recipe.youtube || recipe.sourceUrl) && (
                                <View className="absolute bottom-3 right-5 bg-black/60 px-2 py-1 rounded-full flex-row items-center">
                                    <Ionicons name="time-outline" size={14} color="#fff" />
                                    <Text className="ml-1 text-xs text-white">{recipe.totalTime} Mins</Text>
                                </View>
                            )}

                            {/* FALLBACK: NOTHING AVAILABLE */}
                            {!recipe.youtube && !recipe.sourceUrl && (
                                <View className="absolute inset-0 justify-center items-center bg-black/30 rounded-2xl">
                                    <Text className="text-white font-bold text-sm px-4 text-center">
                                        Source for this recipe is not available
                                    </Text>
                                    <View className="absolute bottom-3 right-5 bg-black/60 px-2 py-1 rounded-full flex-row items-center">
                                    <Ionicons name="time-outline" size={14} color="#fff" />
                                    <Text className="ml-1 text-xs text-white">{recipe.totalTime} Mins</Text>
                                </View>
                                </View>
                            )}
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
                                        onPress={handleAddSelectedToChecklist}
                                        disabled={selectedIngredients.length === 0 || !!loadingAction}
                                        style={{
                                        paddingHorizontal: 12,
                                        paddingVertical: 8,
                                        borderRadius: 16,
                                        backgroundColor: selectedIngredients.length > 0 ? '#22C55E' : '#D1D5DB',
                                        ...shadowStyle,
                                        }}
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
                                            onPress={() => toggleIngredientSelection(ing)}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                padding: 12,
                                                marginBottom: 8,
                                                borderRadius: 16,
                                                backgroundColor: isSelected ? '#DCFCE7' : '#fff',
                                                borderWidth: isSelected ? 1 : 0,
                                                borderColor: isSelected ? '#22C55E' : 'transparent',
                                                ...shadowStyle,
                                            }}
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
                                    <View key={idx} className="mb-6 bg-white rounded-xl p-4 ">
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
                        ...shadowStyle,
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
        </View>
    );
};

export default ViewSavedRecipeScreen;
