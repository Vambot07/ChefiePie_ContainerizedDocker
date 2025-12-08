import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image, Alert, Pressable, FlatList } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, Feather, AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import Header from '../../components/partials/Header';
import RecipeSearchModal from '../../components/modal/RecipeSearchModal';
import { fetchRandomRecipes } from '~/api/spoonacular';
import { useAuth } from '~/context/AuthContext';
import {
    saveMealPlan,
    loadMealPlanWithDetails,
    deleteRecipeFromDay,
    addRecipeToDay,
} from '~/controller/planner';
import { getSavedRecipes } from '~/controller/recipe';
import { RootStackParamList } from '~/navigation/AppStack';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Recipe {
    id: string;
    title: string;
    image: string;
    totalTime?: string;
    difficulty?: string;
    source?: 'created' | 'api';
}

interface RecipeCardProps {
    recipe: Recipe;
    navigation: NavigationProp;
    onDelete?: (recipeId: string) => void;
    onSwap?: (recipeId: string) => void;
}

const RecipeCard = ({ recipe, navigation, onDelete, onSwap }: RecipeCardProps) => {
    const [loading, setLoading] = useState<boolean>(false);

    return (
        <TouchableOpacity
            className='bg-white rounded-xl shadow-sm mb-4'
            style={{ width: 160, marginRight: 12 }}
            onPress={() => navigation.navigate('ViewRecipe', { recipe })}
        >
            <View className='w-full rounded-t-xl bg-gray-200 justify-center items-center'>
                {loading && (
                    <View style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}>
                        <ActivityIndicator size="small" color="#FF9966" />
                    </View>
                )}
                <Image
                    source={{ uri: recipe.image }}
                    className="w-full h-32 rounded-t-xl"
                    onLoadStart={() => setLoading(true)}
                    onLoadEnd={() => setLoading(false)}
                    onError={() => setLoading(false)}
                />

                {onSwap && (
                    <TouchableOpacity
                        className="absolute top-2 left-2 bg-black rounded-full w-8 h-8 items-center justify-center shadow"
                        onPress={(e) => {
                            e.stopPropagation();
                            onSwap(recipe.id);
                        }}
                    >
                        <AntDesign name="swap" size={18} color="white" />
                    </TouchableOpacity>
                )}

                {onDelete && (
                    <TouchableOpacity
                        className="absolute top-2 right-2 bg-black rounded-full w-8 h-8 items-center justify-center shadow"
                        onPress={(e) => {
                            e.stopPropagation();
                            onDelete(recipe.id);
                        }}
                    >
                        <Ionicons name="close" size={18} color="white" />
                    </TouchableOpacity>
                )}
            </View>

            <View className="p-2">
                <Text className="font-semibold text-gray-800 mb-1" numberOfLines={2}>
                    {recipe.title}
                </Text>
                <View className="flex-row justify-between">
                    <Text className="text-gray-500 text-xs">{recipe.totalTime || ''} mins</Text>
                    <Text className="text-gray-500 text-xs">{recipe.difficulty || ''}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default function PlannerScreen() {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute();
    const { user } = useAuth();
    const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const [selectedDays, setSelectedDays] = useState<number[]>([]);
    const [weekOffset, setWeekOffset] = useState(0);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
    const [modalPosition, setModalPosition] = useState({ top: 0 });
    const [recipesByDay, setRecipesByDay] = useState<{ [key: number]: Recipe[] }>({});
    const [loadingRecipes, setLoadingRecipes] = useState<boolean>(false);
    const [plannedWeeks, setPlannedWeeks] = useState<{ [key: number]: boolean }>({});
    const [loadingWeek, setLoadingWeek] = useState<boolean>(false);
    const [savedRecipesToShow, setSavedRecipesToShow] = useState<Recipe[]>([]);
    const [showSavedRecipesModal, setShowSavedRecipesModal] = useState(false);
    const [showSearchRecipesModal, setShowSearchRecipeModal] = useState(false);
    const [loadingSavedRecipes, setLoadingSavedRecipes] = useState(false);
    const [selectedSavedRecipes, setSelectedSavedRecipes] = useState<string[]>([]);
    const [loadingMenuAction, setLoadingMenuAction] = useState(false);
    const [swapMode, setSwapMode] = useState(false);
    const [recipeToSwapId, setRecipeToSwapId] = useState<string | null>(null);

    const buttonRefs = useRef<{ [key: string]: View | null }>({});
    const userId = user?.userId;

    const loadSavedPlan = useCallback(async () => {
        if (!userId) return;

        setLoadingWeek(true);
        try {
            const savedRecipes = await loadMealPlanWithDetails(userId, weekOffset);

            if (savedRecipes && Object.keys(savedRecipes).length > 0) {
                setRecipesByDay(savedRecipes);
                setPlannedWeeks(prev => ({ ...prev, [weekOffset]: true }));
                console.log('✅ Loaded saved meal plan for week:', weekOffset);
            } else {
                setRecipesByDay({});
                setPlannedWeeks(prev => {
                    const updated = { ...prev };
                    delete updated[weekOffset];
                    return updated;
                });
                console.log('ℹ️ No saved plan for week:', weekOffset);
            }
        } catch (error) {
            console.error('❌ Error loading saved plan:', error);
            setRecipesByDay({});
            setPlannedWeeks(prev => {
                const updated = { ...prev };
                delete updated[weekOffset];
                return updated;
            });
        } finally {
            setLoadingWeek(false);
        }
    }, [userId, weekOffset]);

    // Cleanup recipes from past dates (only for current week)
    const cleanupPastDays = useCallback(async () => {
        if (weekOffset !== 0 || !userId) return; // Only clean current week

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset to start of day

        const weekDates = getWeekDates(weekOffset);
        const daysToClean: number[] = [];

        // Find which days are in the past
        weekDates.forEach((date, index) => {
            if (date < today) {
                daysToClean.push(index);
            }
        });

        if (daysToClean.length === 0) return;

        console.log('🗑️ Cleaning up past days:', daysToClean);

        // Delete recipes from past days
        for (const dayIndex of daysToClean) {
            const recipes = recipesByDay[dayIndex];
            if (recipes && recipes.length > 0) {
                console.log(`   Deleting ${recipes.length} recipe(s) from day ${dayIndex}`);
                for (const recipe of recipes) {
                    await deleteRecipeFromDay(userId, weekOffset, dayIndex, recipe.id);
                }
            }
        }

        // Update local state to remove past days
        setRecipesByDay(prev => {
            const updated = { ...prev };
            daysToClean.forEach(dayIndex => {
                delete updated[dayIndex];
            });
            return updated;
        });

        console.log('✅ Cleanup complete - removed recipes from past days');
    }, [weekOffset, userId, recipesByDay]);

    useEffect(() => {
        loadSavedPlan();
    }, [weekOffset, userId]);

    // Run cleanup after meal plan loads
    useEffect(() => {
        if (!loadingWeek && Object.keys(recipesByDay).length > 0) {
            cleanupPastDays();
        }
    }, [recipesByDay, loadingWeek, cleanupPastDays]);

    useFocusEffect(
        useCallback(() => {
            console.log('🔄 Screen focused - reloading meal plan');
            loadSavedPlan();
        }, [loadSavedPlan])
    );

    useEffect(() => {
        const loadSavedRecipes = async () => {
            try {
                const savedRecipes = await getSavedRecipes();
                setSavedRecipesToShow(savedRecipes);
                console.log('✅ Loaded saved recipes:', savedRecipes.length);
            } catch (error) {
                console.error('❌ Error loading saved recipes:', error);
            }
        };
        loadSavedRecipes();
    }, []);

    useFocusEffect(
        useCallback(() => {
            const loadSavedRecipes = async () => {
                console.log('🔄 Screen focused - reloading saved recipes');
                try {
                    const savedRecipes = await getSavedRecipes();
                    setSavedRecipesToShow(savedRecipes);
                    console.log('✅ Reloaded saved recipes:', savedRecipes.length);
                } catch (error) {
                    console.error('❌ Error reloading saved recipes:', error);
                }
            };
            loadSavedRecipes();
        }, [])
    );

    useEffect(() => {
        const params = route.params as any;
        if (params?.shouldReloadAndOpenModal && selectedDayIndex !== null) {
            console.log('🎯 Auto-opening saved recipes modal after recipe creation');

            // Restore swap mode if it was active
            if (params?.swapMode && params?.recipeToSwapId) {
                console.log('🔄 Restoring swap mode with recipeId:', params.recipeToSwapId);
                setSwapMode(true);
                setRecipeToSwapId(params.recipeToSwapId);
            }

            const reloadAndOpen = async () => {
                try {
                    const freshRecipes = await getSavedRecipes();
                    setSavedRecipesToShow(freshRecipes);
                    setTimeout(() => {
                        setShowSavedRecipesModal(true);
                    }, 300);
                } catch (error) {
                    console.error('❌ Error reloading:', error);
                }
            };
            reloadAndOpen();

            navigation.setParams({
                shouldReloadAndOpenModal: undefined,
                swapMode: undefined,
                recipeToSwapId: undefined
            });
        }
    }, [route.params, selectedDayIndex]);

    useEffect(() => {
        const hasAnyRecipes = Object.keys(recipesByDay).some(dayIndex => {
            const recipes = recipesByDay[Number(dayIndex)];
            return recipes && recipes.length > 0;
        });

        if (!hasAnyRecipes && plannedWeeks[weekOffset]) {
            setPlannedWeeks(prev => {
                const updated = { ...prev };
                delete updated[weekOffset];
                return updated;
            });
        }
    }, [recipesByDay, weekOffset]);

    const getWeekStart = (offset: number) => {
        const today = new Date();
        const currentDay = today.getDay();
        const diff = currentDay === 0 ? -6 : 1 - currentDay;
        const monday = new Date(today);
        monday.setDate(today.getDate() + diff + offset * 7);
        monday.setHours(0, 0, 0, 0);
        return monday;
    };

    const getWeekDates = (offset: number) => {
        const weekStart = getWeekStart(offset);
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            dates.push(date);
        }
        return dates;
    };

    const getWeekRangeText = (offset: number) => {
        const weekStart = getWeekStart(offset);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        if (weekStart.getMonth() === weekEnd.getMonth()) {
            return `${monthNames[weekStart.getMonth()]} ${weekStart.getDate()} - ${weekEnd.getDate()}`;
        } else {
            return `${monthNames[weekStart.getMonth()]} ${weekStart.getDate()} - ${monthNames[weekEnd.getMonth()]} ${weekEnd.getDate()}`;
        }
    };

    const getWeekLabel = (offset: number) => {
        if (offset === 0) return 'This Week';
        if (offset === 1) return 'Next Week';
        return getWeekRangeText(offset);
    };

    const goToPreviousWeek = () => {
        if (weekOffset > 0) {
            setLoadingWeek(true);
            setWeekOffset(weekOffset - 1);
            setSelectedDays([]);
        }
    };

    const goToNextWeek = () => {
        setLoadingWeek(true);
        setWeekOffset(weekOffset + 1);
        setSelectedDays([]);
    };

    const toggleDay = (index: number) => {
        if (selectedDays.includes(index)) {
            setSelectedDays(selectedDays.filter(day => day !== index));
        } else {
            setSelectedDays([...selectedDays, index]);
        }
    };

    const handleStartPlan = async () => {
        if (selectedDays.length === 0) {
            Alert.alert('No Days Selected', 'Please select at least one day');
            return;
        }

        setLoadingRecipes(true);
        try {
            const newRecipesByDay: { [key: number]: Recipe[] } = {};

            for (const index of selectedDays) {
                const results = await fetchRandomRecipes(1);
                newRecipesByDay[index] = results.map((item: any) => ({
                    id: item.id.toString(),
                    title: item.title,
                    image: item.image,
                    totalTime: item.readyInMinutes?.toString() || '',
                    difficulty: '',
                    source: 'api',
                }));
            }

            setRecipesByDay(newRecipesByDay);
            setPlannedWeeks(prev => ({ ...prev, [weekOffset]: true }));

            if (userId) {
                await saveMealPlan(userId, weekOffset, newRecipesByDay);
            }
        } catch (error) {
            console.log('Error fetching recipes for days:', error);
        } finally {
            setLoadingRecipes(false);
        }
    };

    const handleAddPress = (day: string, dayIndex: number, buttonRef: View | null) => {
        console.log('🔵 handleAddPress called with dayIndex:', dayIndex);
        if (!buttonRef) return;

        setSelectedDayIndex(dayIndex);
        setSelectedDay(day);

        setTimeout(() => {
            buttonRef.measure((x, y, width, height, pageX, pageY) => {
                setModalPosition({ top: pageY });
                setModalVisible(true);
            });
        }, 0);
    };


    const handleSwapRecipe = (dayIndex: number, recipeId: string) => {
        console.log('🔄 Swap mode activated for recipe:', recipeId, 'on day:', dayIndex);

        setSwapMode(true);
        setRecipeToSwapId(recipeId);
        setSelectedDayIndex(dayIndex);
        setSelectedDay(days[dayIndex]);
        setModalVisible(true);
    }

    const handleDeleteRecipe = (dayIndex: number, recipeId: string) => {
        Alert.alert(
            'Delete Recipe',
            'Are you sure you want to remove this recipe from your meal plan?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setRecipesByDay(prev => {
                            const updated = { ...prev };
                            if (updated[dayIndex]) {
                                updated[dayIndex] = updated[dayIndex].filter(recipe => recipe.id !== recipeId);

                                if (updated[dayIndex].length === 0) {
                                    delete updated[dayIndex];
                                }
                            }
                            return updated;
                        });

                        if (userId) {
                            await deleteRecipeFromDay(userId, weekOffset, dayIndex, recipeId);
                        }
                    }
                }
            ]
        );
    };

    const handleOpenSavedRecipesModal = async () => {
        console.log('🟢 Opening saved recipes modal, current dayIndex:', selectedDayIndex);

        setLoadingMenuAction(true);
        setSelectedSavedRecipes([]);

        try {
            const freshSavedRecipes = await getSavedRecipes();
            setSavedRecipesToShow(freshSavedRecipes);
            console.log('🔄 Refreshed saved recipes:', freshSavedRecipes.length);

            closeModal();
            setShowSavedRecipesModal(true);
        } catch (error) {
            console.error('❌ Error refreshing saved recipes:', error);
            Alert.alert('Error', 'Failed to load saved recipes');
        } finally {
            setLoadingMenuAction(false);
        }
    };

    const handleOpenSearchRecipesModal = async () => {
        console.log('🟢 Opening search recipes modal, current dayIndex:', selectedDayIndex);
        setLoadingMenuAction(true);

        try {
            closeModal();
            setShowSearchRecipeModal(true);
        } catch (error) {
            console.error('❌ Error opening search modal:', error);
            Alert.alert('Error', 'Failed to open search');
        } finally {
            setLoadingMenuAction(false);
        }
    };

    const toggleSavedRecipeSelection = (recipeId: string) => {
        // In swap mode, allow selecting any recipe (even if already in plan)
        if (!swapMode && selectedDayIndex !== null) {
            const existingRecipes = recipesByDay[selectedDayIndex] || [];
            const alreadyInPlan = existingRecipes.some(recipe => recipe.id === recipeId);

            if (alreadyInPlan) {
                Alert.alert(
                    'Recipe Already Added',
                    'This recipe is already in your meal plan for this day.',
                    [{ text: 'OK' }]
                );
                return;
            }
        }

        // In swap mode, only allow one selection at a time
        if (swapMode) {
            setSelectedSavedRecipes([recipeId]);
        } else {
            setSelectedSavedRecipes(prev => {
                if (prev.includes(recipeId)) {
                    return prev.filter(id => id !== recipeId);
                } else {
                    return [...prev, recipeId];
                }
            });
        }
    };

    const handleAddSavedRecipes = async () => {
        console.log('🔴 handleAddSavedRecipes - userId:', userId);
        console.log('🔴 handleAddSavedRecipes - selectedDayIndex:', selectedDayIndex);
        console.log('🔴 handleAddSavedRecipes - selectedSavedRecipes:', selectedSavedRecipes.length);
        console.log('🔴 handleAddSavedRecipes - weekOffset:', weekOffset);
        console.log('🔴 handleAddSavedRecipes - swapMode:', swapMode);
        console.log('🔴 handleAddSavedRecipes - recipeToSwapId:', recipeToSwapId);

        if (selectedDayIndex === null || selectedSavedRecipes.length === 0) {
            Alert.alert('No Recipes Selected', swapMode ? 'Please select a recipe to swap' : 'Please select at least one recipe');
            return;
        }

        setLoadingSavedRecipes(true);
        try {
            const recipesToAdd = savedRecipesToShow.filter(recipe =>
                selectedSavedRecipes.includes(recipe.id)
            );

            console.log("🟡 Recipes to add/swap:", recipesToAdd);

            if (swapMode && recipeToSwapId) {
                // SWAP MODE: Replace the old recipe with the new one
                if (userId) {
                    // Delete old recipe
                    await deleteRecipeFromDay(userId, weekOffset, selectedDayIndex, recipeToSwapId);
                    // Add new recipe
                    for (const recipe of recipesToAdd) {
                        await addRecipeToDay(userId, weekOffset, selectedDayIndex, recipe);
                    }
                }

                setRecipesByDay(prev => {
                    const updated = { ...prev };
                    const existingRecipes = updated[selectedDayIndex] || [];
                    // Remove old recipe and add new one
                    updated[selectedDayIndex] = [
                        ...existingRecipes.filter(r => r.id !== recipeToSwapId),
                        ...recipesToAdd
                    ];
                    return updated;
                });

                console.log('✅ Swapped recipe on day:', selectedDayIndex);
            } else {
                // ADD MODE: Just add the recipes
                if (userId) {
                    for (const recipe of recipesToAdd) {
                        await addRecipeToDay(userId, weekOffset, selectedDayIndex, recipe);
                    }
                }

                setRecipesByDay(prev => {
                    const updated = { ...prev };
                    const existingRecipes = updated[selectedDayIndex] || [];
                    updated[selectedDayIndex] = [...existingRecipes, ...recipesToAdd];
                    return updated;
                });

                console.log('✅ Added saved recipes to day:', selectedDayIndex);
            }

            setShowSavedRecipesModal(false);
            setSelectedSavedRecipes([]);
            setSelectedDayIndex(null);
            setSelectedDay(null);
            setSwapMode(false);
            setRecipeToSwapId(null);
        } catch (error) {
            console.error('❌ Error adding/swapping saved recipes:', error);
            Alert.alert('Error', swapMode ? 'Failed to swap recipe. Please try again.' : 'Failed to add recipes. Please try again.');
        } finally {
            setLoadingSavedRecipes(false);
        }
    };

    // Make this function return a Promise
    const handleAddSearchRecipes = async (recipes: Recipe[]): Promise<void> => {
        if (selectedDayIndex === null) return;

        try {
            if (swapMode && recipeToSwapId) {
                // SWAP MODE: Replace the old recipe with the new one
                if (userId) {
                    // Delete old recipe
                    await deleteRecipeFromDay(userId, weekOffset, selectedDayIndex, recipeToSwapId);
                    // Add new recipe
                    for (const recipe of recipes) {
                        await addRecipeToDay(userId, weekOffset, selectedDayIndex, recipe);
                    }
                }

                setRecipesByDay(prev => {
                    const updated = { ...prev };
                    const existingRecipes = updated[selectedDayIndex] || [];
                    // Remove old recipe and add new one
                    updated[selectedDayIndex] = [
                        ...existingRecipes.filter(r => r.id !== recipeToSwapId),
                        ...recipes
                    ];
                    return updated;
                });

                console.log('✅ Swapped recipe with search result on day:', selectedDayIndex);
            } else {
                // ADD MODE: Just add the recipes
                if (userId) {
                    for (const recipe of recipes) {
                        await addRecipeToDay(userId, weekOffset, selectedDayIndex, recipe);
                    }
                }

                setRecipesByDay(prev => {
                    const updated = { ...prev };
                    const existingRecipes = updated[selectedDayIndex] || [];
                    updated[selectedDayIndex] = [...existingRecipes, ...recipes];
                    return updated;
                });

                console.log('✅ Added search recipes to day:', selectedDayIndex);
            }

            setSelectedDayIndex(null);
            setSelectedDay(null);
            setSwapMode(false);
            setRecipeToSwapId(null);
        } catch (error) {
            console.error('❌ Error adding/swapping search recipes:', error);
            throw error; // Re-throw error so modal can handle it
        }
    };

    // Close the first modal (3 options) without resetting swap mode
    const closeModal = () => {
        setModalVisible(false);
        // Don't reset swapMode and recipeToSwapId here - they need to persist
        // until the user completes or cancels the swap operation
    };

    // Cancel all operations and reset everything
    const cancelAllModals = () => {
        setModalVisible(false);
        setSelectedDay(null);
        setSwapMode(false);
        setRecipeToSwapId(null);
        setSelectedDayIndex(null);
    };

    const closeSavedRecipesModal = () => {
        setShowSavedRecipesModal(false);
        setSelectedSavedRecipes([]);
        setSelectedDayIndex(null);
        setSelectedDay(null);
        setSwapMode(false);
        setRecipeToSwapId(null);
    };

    const closeSearchRecipesModal = () => {
        setShowSearchRecipeModal(false);
        setSelectedDayIndex(null);
        setSelectedDay(null);
        setSwapMode(false);
        setRecipeToSwapId(null);
    };

    const currentWeekDates = getWeekDates(weekOffset);

    return (
        <View className="flex-1 bg-gray-50">
            <Header
                title="Meal Planner"
                showBackButton={false}
                onBack={() => navigation.goBack()}
            />

            {loadingWeek ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#FF9966" />
                    <Text className="mt-4 text-gray-600">Loading meal plan...</Text>
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
                    <View style={{ backgroundColor: '#FFF7F0' }} className="m-6 mt-4 p-5 rounded-2xl">
                        <View className="flex-row justify-between items-center mb-2">
                            <TouchableOpacity onPress={goToPreviousWeek} disabled={weekOffset === 0} style={{ opacity: weekOffset === 0 ? 0.3 : 1 }}>
                                <Ionicons name="chevron-back" size={24} color="black" />
                            </TouchableOpacity>

                            <Text className="font-semibold text-base text-gray-800">{getWeekLabel(weekOffset)}</Text>

                            <TouchableOpacity onPress={goToNextWeek}>
                                <Ionicons name="chevron-forward" size={24} color="black" />
                            </TouchableOpacity>
                        </View>

                        {!plannedWeeks[weekOffset] && (
                            <>
                                <Text className="text-center text-gray-500 mb-4 mt-2">
                                    {selectedDays.length === 0
                                        ? 'Select days to plan your meals'
                                        : `${selectedDays.length} day${selectedDays.length > 1 ? 's' : ''} selected`}
                                </Text>

                                <View className="flex-row justify-around w-full mb-6">
                                    {weekDays.map((day, index) => {
                                        const isSelected = selectedDays.includes(index);
                                        const date = currentWeekDates[index];
                                        return (
                                            <View key={index} className="items-center">
                                                <TouchableOpacity
                                                    onPress={() => toggleDay(index)}
                                                    style={{
                                                        backgroundColor: isSelected ? '#F9A826' : '#E5E7EB',
                                                        borderWidth: isSelected ? 2 : 0,
                                                        borderColor: isSelected ? '#D97706' : 'transparent'
                                                    }}
                                                    className="w-10 h-10 rounded-full items-center justify-center mb-1"
                                                >
                                                    <Text className="font-bold" style={{ color: isSelected ? 'white' : '#9CA3AF' }}>{day}</Text>
                                                </TouchableOpacity>
                                                <Text className="text-xs" style={{ color: isSelected ? '#F9A826' : '#9CA3AF' }}>{date.getDate()}</Text>
                                            </View>
                                        );
                                    })}
                                </View>

                                <TouchableOpacity
                                    style={{ backgroundColor: selectedDays.length > 0 ? '#F9A826' : '#D1D5DB', opacity: selectedDays.length > 0 ? 1 : 0.6 }}
                                    className="w-full py-4 rounded-xl"
                                    onPress={handleStartPlan}
                                    disabled={selectedDays.length === 0}
                                >
                                    <Text className="text-white text-center font-bold text-base">START MY PLAN</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>

                    <View className="px-6 mt-2">
                        {days.map((day, index) => {
                            const isSelected = selectedDays.includes(index) || plannedWeeks[weekOffset];
                            const date = currentWeekDates[index];
                            const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                            return (
                                <View key={index} className="mb-4">
                                    <View className="flex-row justify-between items-center py-4 border-b border-gray-200"
                                        style={{ opacity: selectedDays.length === 0 || isSelected ? 1 : 0.4 }}>
                                        <View className="flex-row items-center">
                                            <View>
                                                <Text className="text-lg font-semibold text-gray-800">{day}</Text>
                                                <Text className="text-xs text-gray-500">{dateString}</Text>
                                            </View>
                                            {isSelected && <View className="ml-2 bg-orange-500 rounded-full w-2 h-2" />}
                                        </View>

                                        <View
                                            ref={(ref) => { if (ref) buttonRefs.current[day] = ref; }}
                                            collapsable={false}
                                        >
                                            <TouchableOpacity
                                                className="flex-row items-center bg-gray-100 px-3 py-2 rounded-lg"
                                                disabled={!isSelected && selectedDays.length > 0}
                                                onPress={() => handleAddPress(day, index, buttonRefs.current[day])}
                                            >
                                                <Feather name="plus" size={16} color="black" />
                                                <Text className="ml-2 font-bold text-sm">ADD</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {loadingRecipes && isSelected ? (
                                        <ActivityIndicator size="small" color="#FF9966" className="mt-2" />
                                    ) : (
                                        <FlatList
                                            data={recipesByDay[index] || []}
                                            keyExtractor={(item) => item.id}
                                            renderItem={({ item }) => (
                                                <RecipeCard
                                                    recipe={item}
                                                    navigation={navigation}
                                                    onDelete={(recipeId) => handleDeleteRecipe(index, recipeId)}
                                                    onSwap={(recipeId) => handleSwapRecipe(index, recipeId)}
                                                />
                                            )}
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            contentContainerStyle={{ paddingVertical: 8 }}
                                        />
                                    )}
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            )}

            {modalVisible && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
                    <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={cancelAllModals} />
                    <View style={{ width: 260, backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 3 }, shadowRadius: 6, elevation: 8 }}>

                        {loadingMenuAction ? (
                            <View className="py-8 items-center justify-center">
                                <ActivityIndicator size="large" color="#F97316" />
                                <Text className="text-gray-600 mt-3">Loading recipes...</Text>
                            </View>
                        ) : (
                            <>
                                {/* Updated Header */}
                                <View className="bg-orange-500 px-4 py-4 flex-row justify-between items-center">
                                    <Text className="text-white font-bold text-lg">
                                        {swapMode ? 'Swap Recipe' : 'Add Recipe'}
                                    </Text>
                                    <TouchableOpacity onPress={cancelAllModals}>
                                        <Ionicons name="close" size={24} color="white" />
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    className="flex-row items-center px-4 py-3 border-b border-gray-100 active:bg-gray-50"
                                    onPress={handleOpenSavedRecipesModal}
                                    disabled={loadingMenuAction}
                                >
                                    <View className="w-8 h-8 bg-orange-100 rounded-full items-center justify-center mr-3">
                                        <Ionicons name="bookmark" size={16} color="#F97316" />
                                    </View>
                                    <Text className="text-gray-800 font-medium flex-1">
                                        {swapMode ? 'Swap ' : 'Add '}
                                        Saved Recipe
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    className="flex-row items-center px-4 py-3 border-b border-gray-100 active:bg-gray-50"
                                    onPress={handleOpenSearchRecipesModal}
                                    disabled={loadingMenuAction}
                                >
                                    <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
                                        <Ionicons name="search" size={16} color="#3B82F6" />
                                    </View>
                                    <Text className="text-gray-800 font-medium flex-1">Search New Recipe</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    className="flex-row items-center px-4 py-3 active:bg-gray-50"
                                    onPress={() => {
                                        closeModal();
                                        navigation.navigate('AddRecipe', {
                                            viewMode: 'planner',
                                            selectedDayIndex: selectedDayIndex,
                                            weekOffset: weekOffset,
                                            swapMode: swapMode,
                                            recipeToSwapId: recipeToSwapId
                                        });
                                    }}
                                    disabled={loadingMenuAction}
                                >
                                    <View className="w-8 h-8 bg-green-100 rounded-full items-center justify-center mr-3">
                                        <Ionicons name="create" size={16} color="#10B981" />
                                    </View>
                                    <Text className="text-gray-800 font-medium flex-1">Create New Recipe</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            )}

            {showSavedRecipesModal && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                    <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={closeSavedRecipesModal} />

                    <View style={{ width: '85%', maxHeight: '70%', backgroundColor: 'white', borderRadius: 20, overflow: 'hidden' }}>
                        <View className="bg-orange-500 px-5 py-4 flex-row justify-between items-center">
                            <Text className="text-white font-bold text-lg">
                                {swapMode ? 'Swap Recipe' : 'Saved Recipes'}
                            </Text>
                            <TouchableOpacity onPress={closeSavedRecipesModal}>
                                <Ionicons name="close" size={24} color="white" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            className="px-5 py-4"
                            showsVerticalScrollIndicator={false}
                        >
                            {loadingSavedRecipes ? (
                                <View className="py-16 items-center justify-center">
                                    <ActivityIndicator size="large" color="#F97316" />
                                    <Text className="text-gray-500 mt-4">Loading saved recipes...</Text>
                                </View>
                            ) : savedRecipesToShow.length === 0 ? (
                                <View className="py-8 items-center">
                                    <Ionicons name="bookmark-outline" size={48} color="#D1D5DB" />
                                    <Text className="text-gray-500 mt-3 text-center">No saved recipes yet</Text>
                                    <Text className="text-gray-400 text-sm mt-1 text-center">Save recipes to add them to your meal plan</Text>
                                </View>
                            ) : (
                                savedRecipesToShow.map((recipe) => {
                                    const isSelected = selectedSavedRecipes.includes(recipe.id);
                                    const existingRecipes = selectedDayIndex !== null ? (recipesByDay[selectedDayIndex] || []) : [];
                                    // In swap mode, don't mark as "already in plan" since we're swapping
                                    const alreadyInPlan = !swapMode && existingRecipes.some(r => r.id === recipe.id);

                                    return (
                                        <TouchableOpacity
                                            key={recipe.id}
                                            className={`flex-row items-center py-3 border-b border-gray-100 ${alreadyInPlan ? 'opacity-50' : ''}`}
                                            onPress={() => toggleSavedRecipeSelection(recipe.id)}
                                            disabled={alreadyInPlan}
                                        >
                                            <Image
                                                source={{ uri: recipe.image }}
                                                className="w-16 h-16 rounded-lg"
                                            />
                                            <View className="flex-1 ml-3">
                                                <Text className="text-gray-800 font-medium" numberOfLines={2}>
                                                    {recipe.title}
                                                </Text>
                                                <View className="flex-row mt-1 items-center">
                                                    {recipe.totalTime && (
                                                        <Text className="text-gray-500 text-xs mr-3">
                                                            {recipe.totalTime} mins
                                                        </Text>
                                                    )}
                                                    {recipe.difficulty && (
                                                        <Text className="text-gray-500 text-xs mr-3">
                                                            {recipe.difficulty}
                                                        </Text>
                                                    )}
                                                    {alreadyInPlan && (
                                                        <View className="bg-green-100 px-2 py-0.5 rounded-full">
                                                            <Text className="text-green-600 text-xs font-medium">Added</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>

                                            {alreadyInPlan ? (
                                                <View className="w-6 h-6 rounded-full bg-green-500 items-center justify-center">
                                                    <Ionicons name="checkmark" size={16} color="white" />
                                                </View>
                                            ) : (
                                                <View
                                                    className={`w-6 h-6 rounded-full border-2 items-center justify-center ${isSelected
                                                        ? 'border-orange-500 bg-orange-500'
                                                        : 'border-gray-300'
                                                        }`}
                                                >
                                                    {isSelected && (
                                                        <Ionicons name="checkmark" size={16} color="white" />
                                                    )}
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </ScrollView>

                        {!loadingSavedRecipes && savedRecipesToShow.length > 0 && (
                            <View className="px-5 py-4 border-t border-gray-200">
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: selectedSavedRecipes.length > 0 ? '#F97316' : '#D1D5DB',
                                    }}
                                    className="py-3 rounded-xl"
                                    onPress={handleAddSavedRecipes}
                                    disabled={selectedSavedRecipes.length === 0 || loadingSavedRecipes}
                                >
                                    {loadingSavedRecipes ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Text className="text-white text-center font-bold">
                                            {swapMode
                                                ? 'Swap Recipe'
                                                : `Add ${selectedSavedRecipes.length > 0 ? `(${selectedSavedRecipes.length})` : ''} Recipe${selectedSavedRecipes.length !== 1 ? 's' : ''}`
                                            }
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            )}

            <RecipeSearchModal
                visible={showSearchRecipesModal}
                onClose={closeSearchRecipesModal}
                onSelectRecipes={handleAddSearchRecipes}
                alreadyAddedIds={selectedDayIndex !== null ? (recipesByDay[selectedDayIndex] || []).map(r => r.id) : []}
            />
        </View>
    );
}