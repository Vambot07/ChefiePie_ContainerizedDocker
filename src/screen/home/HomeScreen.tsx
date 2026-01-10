import { useEffect, useState, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, FlatList, Alert, ActivityIndicator, Pressable, TextInput, Modal, RefreshControl } from 'react-native';
import { Ionicons, Feather, Fontisto } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProps } from '~/navigation/AppStack';
import { useAuth } from '~/context/AuthContext';
import {
    fetchRecipesByCategory,
    fetchRecipesByIngredients
} from '~/api/spoonacular';
import { saveApiRecipe, unsaveRecipe, getSavedRecipes, getRecipeByUser, getRecipeById } from '~/controller/recipe';
import { loadMealPlanWithDetails } from '~/controller/planner';
import colors from '~/utils/color';
import GeminiChatbot from '~/components/partials/GeminiChatBot';

const categories = ['All', 'Asian', 'Italian', 'Indian', 'Chinese', 'Mexican'];
const baseIngredients = ['Chicken', 'Tomato', 'Curry', 'Salad', 'Chilli', 'Onion'];

// --- FEATURED RECIPE CARD ---
const FeaturedRecipeCard = ({
    recipe,
    onPress,
    onSave,
    isSaved = false,
}: {
    recipe: any;
    onPress: () => void;
    onSave?: () => void;
    isSaved?: boolean;
}) => (
    <TouchableOpacity onPress={onPress}>
        <View className="w-36 h-56 mr-4">
            <View className="rounded-2xl bg-gray-100 p-4 h-full relative">
                {/* Recipe Image */}
                <View className="absolute left-1/2 -ml-12">
                    <Image
                        source={{ uri: recipe.image }}
                        className="w-24 h-24 rounded-full"
                        style={{ borderWidth: 2, borderColor: 'white', resizeMode: 'cover' }}
                    />
                </View>

                {/* Content */}
                <View className="flex-1 justify-end pt-5">
                    <Text className="text-sm font-bold text-gray-800 text-center mb-3">
                        {recipe.title?.length > 18 ? recipe.title.substring(0, 18).trim() + '...' : recipe.title || 'No Title'}
                    </Text>

                    <View className="flex-row justify-between items-center">
                        <View className="flex-1">
                            <Text className="text-gray-500 text-xs mb-1">Time</Text>
                            <Text className="text-gray-800 font-semibold text-sm">{recipe.time || 'N/A'}</Text>
                        </View>
                        <TouchableOpacity className="bg-white p-2 rounded-lg ml-2"
                            style={{ backgroundColor: isSaved ? "#FF9966" : "white" }} onPress={onSave}>
                            <Feather name="bookmark" size={14} color={isSaved ? "white" : "#FF9966"} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    </TouchableOpacity>
);

// --- LOADING MODAL COMPONENT ---
const LoadingModal = ({ visible, message }: { visible: boolean; message?: string }) => (
    visible ? (
        <View
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.7)',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 999,
            }}
        >
            <View className="bg-white rounded-3xl p-8 items-center min-w-[200px]">
                <ActivityIndicator size="large" color="#FF9966" />
                <Text className="text-gray-800 font-semibold mt-4 text-center">
                    {message || "Loading..."}
                </Text>
            </View>
        </View>
    ) : null
);

// --- HOME SCREEN ---
export const HomeScreen = () => {
    const [activeCategory, setActiveCategory] = useState('All');
    const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
    const [tempSelectedIngredients, setTempSelectedIngredients] = useState<string[]>([]);
    const [ingredients, setIngredients] = useState<string[]>([]);
    const [ingredientRecipes, setIngredientRecipes] = useState<any[]>([]);
    const [categoryRecipes, setCategoryRecipes] = useState<any[]>([]);
    const [initialLoading, setInitialLoading] = useState<boolean>(true);
    const [loadingIngredients, setLoadingIngredients] = useState<boolean>(false);
    const [loadingCategories, setLoadingCategories] = useState<boolean>(false);
    const [showAddIngredients, setShowAddIngredients] = useState<boolean>(false);
    const [showModal, setShowModal] = useState<boolean>(false);
    const [hasChanges, setHasChanges] = useState<boolean>(false);
    const [savedRecipes, setSavedRecipes] = useState<Record<string, boolean>>({});
    const [showLoadingModal, setShowLoadingModal] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>("Loading...");
    const [newIngredient, setNewIngredient] = useState('');
    const [modalSelectedIngredients, setModalSelectedIngredients] = useState<string[]>([]);
    const [showChatbot, setShowChatbot] = useState<boolean>(false);
    const [todaysMeals, setTodaysMeals] = useState<any[]>([]);
    const [userStats, setUserStats] = useState({ savedCount: 0, createdCount: 0, plannedDays: 0 });
    const [loadingStats, setLoadingStats] = useState<boolean>(true);
    const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
    const [loadingRecent, setLoadingRecent] = useState<boolean>(true);
    const [statsCache, setStatsCache] = useState<{ data: any; timestamp: number } | null>(null);
    const [refreshing, setRefreshing] = useState<boolean>(false);

    const navigation = useNavigation<NavigationProps>();
    const { user } = useAuth();

    const profileImage = user?.profileImage;
    const username = user?.username;
    const userId = user?.uid || user?.userId;

    // Display data for ingredients section
    const displayedIngredientRecipes = ingredientRecipes.slice(0, 10);
    const ingredientFinalData = [...displayedIngredientRecipes];

    // Display data for categories section
    const displayedCategoryRecipes = categoryRecipes.slice(0, 10);
    const categoryFinalData = [...displayedCategoryRecipes, { id: 'see-more-categories', type: 'seeMore' }];


    // --- FETCH TODAY'S MEALS AND STATS (OPTIMIZED WITH CACHING) ---
    const fetchTodaysMealsAndStats = useCallback(async (forceRefresh: boolean = false) => {
        if (!userId) return;

        // Cache for 5 minutes (300000ms)
        const CACHE_DURATION = 300000;
        const now = Date.now();

        // Use cache if available and not expired
        if (!forceRefresh && statsCache && (now - statsCache.timestamp) < CACHE_DURATION) {
            console.log('✅ Using cached stats data');
            setUserStats(statsCache.data.stats);
            setTodaysMeals(statsCache.data.todaysMeals);
            setLoadingStats(false);
            return;
        }

        try {
            setLoadingStats(true);

            // Get today's day index (0 = Monday, 6 = Sunday)
            const today = new Date();
            const dayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;

            // OPTIMIZATION: Fetch all data in parallel
            const [mealPlan, savedRecipes, createdRecipes] = await Promise.all([
                loadMealPlanWithDetails(userId, 0),
                getSavedRecipes(),
                getRecipeByUser(userId)
            ]);

            const todayRecipes = mealPlan?.[dayIndex] || [];

            // Count planned days this week
            const plannedDaysCount = mealPlan
                ? Object.keys(mealPlan).filter(key => mealPlan[Number(key)]?.length > 0).length
                : 0;

            const stats = {
                savedCount: savedRecipes.length,
                createdCount: createdRecipes.length,
                plannedDays: plannedDaysCount
            };

            // Update state
            setUserStats(stats);
            setTodaysMeals(todayRecipes);

            // Cache the results
            setStatsCache({
                data: { stats, todaysMeals: todayRecipes },
                timestamp: now
            });

            console.log('📊 Stats loaded & cached:', {
                saved: savedRecipes.length,
                created: createdRecipes.length,
                plannedDays: plannedDaysCount,
                todaysMeals: todayRecipes.length
            });

        } catch (error) {
            console.log('❌ Error loading stats:', error);
        } finally {
            setLoadingStats(false);
        }
    }, [userId, statsCache]);

    // OPTIMIZED: Only fetch stats once on mount, use cache on subsequent focuses
    useEffect(() => {
        // Initial load
        fetchTodaysMealsAndStats(false);
    }, [userId]);

    // Refresh stats when screen comes into focus (use cache)
    useFocusEffect(
        useCallback(() => {
            fetchTodaysMealsAndStats(false); // Will use cache if available
        }, [fetchTodaysMealsAndStats])
    );

    // OPTIMIZED: Load recently viewed only once
    useEffect(() => {
        loadRecentlyViewed();
    }, [userId]);

    // Manual refresh handler
    const handleManualRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                fetchTodaysMealsAndStats(true), // Force refresh
                loadRecentlyViewed()
            ]);
        } finally {
            setRefreshing(false);
        }
    }, [fetchTodaysMealsAndStats]);

    // --- SHUFFLE AND AUTO SELECT FIRST INGREDIENT ON MOUNT ---
    useEffect(() => {
        const shuffled = [...baseIngredients].sort(() => 0.5 - Math.random());
        setIngredients(shuffled);
        setSelectedIngredients([shuffled[0]]);
        setTempSelectedIngredients([shuffled[0]]);

        // Auto search by first ingredient
        loadRecipesByIngredients([shuffled[0]]);

    }, []);

    // --- LOAD RECIPES WHEN CATEGORY CHANGES ---
    useEffect(() => {
        loadRecipes();
    }, [activeCategory]);

    // --- CHECK IF THERE ARE CHANGES ---
    useEffect(() => {
        const isDifferent =
            tempSelectedIngredients.length !== selectedIngredients.length ||
            !tempSelectedIngredients.every(ing => selectedIngredients.includes(ing));
        setHasChanges(isDifferent);
    }, [tempSelectedIngredients, selectedIngredients]);

    // --- SHOW MODAL WHEN THERE ARE CHANGES ---
    useEffect(() => {
        if (hasChanges) {
            setShowModal(true);
        }
    }, [hasChanges]);

    // --- LOAD RECIPES BY CATEGORY ---
    const loadRecipes = async () => {
        try {
            setLoadingCategories(true);
            const results = await fetchRecipesByCategory(activeCategory, 30);

            const recipesData =
                activeCategory === 'All' ? results.recipes || [] : results.results || [];

            const transformedRecipes = recipesData.map((recipe: any, index: number) => ({
                id: recipe.id?.toString() || index.toString(),
                title: recipe.title || 'Untitled Recipe',
                image: recipe.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
                time: recipe.readyInMinutes ? `${recipe.readyInMinutes} Mins` : 'N/A',
            }));

            setCategoryRecipes(transformedRecipes);
        } catch (error) {
            console.log('Error fetching recipes:', error);
            Alert.alert('Error', 'Failed to fetch recipes');
        } finally {
            setInitialLoading(false);
            setLoadingCategories(false);
        }
    };

    // --- LOAD RECIPES BY INGREDIENTS ---
    const loadRecipesByIngredients = async (ingredientsList: string[]) => {
        try {
            setLoadingIngredients(true);
            const results = await fetchRecipesByIngredients(ingredientsList, 30);

            const transformedRecipes = results.map((recipe: any, index: number) => ({
                id: recipe.id?.toString() || index.toString(),
                title: recipe.title || 'Untitled Recipe',
                image: recipe.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
                time: 'See more',
            }));

            setIngredientRecipes(transformedRecipes);
        } catch (error) {
            console.log('Error fetching recipes by ingredients:', error);
            Alert.alert('Error', 'Failed to fetch recipes');
        } finally {
            setInitialLoading(false);
            setLoadingIngredients(false);
        }
    };

    // --- HANDLE INGREDIENT SELECTION (TEMPORARY) ---
    const toggleIngredient = (ingredient: string) => {
        const isAlreadySelected = tempSelectedIngredients.includes(ingredient);

        if (isAlreadySelected) {
            const updated = tempSelectedIngredients.filter(i => i !== ingredient);
            setTempSelectedIngredients(updated);
        } else {
            setTempSelectedIngredients([...tempSelectedIngredients, ingredient]);
        }
    };

    // Toggle ingredient in modal
    const toggleModalIngredient = (ingredient: string) => {
        if (modalSelectedIngredients.includes(ingredient)) {
            setModalSelectedIngredients(prev => prev.filter(i => i !== ingredient));
        } else {
            setModalSelectedIngredients(prev => [...prev, ingredient]);
        }
    };

    // Add new ingredient
    const handleAddIngredient = () => {
        const trimmed = newIngredient.trim();

        if (!trimmed) {
            Alert.alert('Error', 'Please enter an ingredient name');
            return;
        }

        // Check if already exists (case insensitive)
        const exists = ingredients.some(ing => ing.toLowerCase() === trimmed.toLowerCase());
        if (exists) {
            Alert.alert('Error', 'This ingredient already exists');
            return;
        }

        // Add to ingredients list
        setIngredients(prev => [...prev, trimmed]);

        // Automatically select the new ingredient
        setModalSelectedIngredients(prev => [...prev, trimmed]);

        // Clear input
        setNewIngredient('');

        Alert.alert('Success', `"${trimmed}" added and selected!`);
    };

    // Remove ingredient
    const handleRemoveIngredient = (ingredient: string) => {
        Alert.alert(
            'Remove Ingredient',
            `Remove "${ingredient}" from the list?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => {
                        // Remove from all lists
                        setIngredients(prev => prev.filter(i => i !== ingredient));
                        setModalSelectedIngredients(prev => prev.filter(i => i !== ingredient));
                        setTempSelectedIngredients(prev => prev.filter(i => i !== ingredient));
                        setSelectedIngredients(prev => prev.filter(i => i !== ingredient));
                    }
                }
            ]
        );
    };

    // Open modal with current selections
    const handleShowAddIngredientsModal = () => {
        setModalSelectedIngredients([...tempSelectedIngredients]); // Copy current selections
        setShowAddIngredients(true);
    };

    // Search with selected ingredients from modal
    const handleSearchFromModal = () => {
        if (modalSelectedIngredients.length === 0) {
            Alert.alert('Error', 'Please select at least one ingredient');
            return;
        }

        // Update all selection states
        setSelectedIngredients(modalSelectedIngredients);
        setTempSelectedIngredients(modalSelectedIngredients);

        // Close modal
        setShowAddIngredients(false);

        // Search recipes
        loadRecipesByIngredients(modalSelectedIngredients);

        console.log('🔍 Searching with ingredients:', modalSelectedIngredients);
    };

    // --- HANDLE SHOW RECIPES FROM MODAL ---
    const handleShowRecipes = () => {
        if (tempSelectedIngredients.length === 0) {
            setIngredientRecipes([]);
            setSelectedIngredients([]);
        } else {
            setSelectedIngredients(tempSelectedIngredients);
            loadRecipesByIngredients(tempSelectedIngredients);
        }
        setShowModal(false);
        setHasChanges(false);
    };

    // --- HANDLE UNDO FROM MODAL ---
    const handleUndo = () => {
        setTempSelectedIngredients(selectedIngredients);
        setShowModal(false);
        setHasChanges(false);
    };

    // --- RECENTLY VIEWED FUNCTIONS ---
    const loadRecentlyViewed = async () => {
        if (!userId) {
            setRecentlyViewed([]);
            setLoadingRecent(false);
            return;
        }

        try {
            setLoadingRecent(true);
            const key = `recentlyViewed_${userId}`;
            const stored = await AsyncStorage.getItem(key);
            if (stored) {
                const recipes = JSON.parse(stored);
                setRecentlyViewed(recipes.slice(0, 10)); // Show max 10
            } else {
                setRecentlyViewed([]);
            }
        } catch (error) {
            console.log('Error loading recently viewed:', error);
            setRecentlyViewed([]);
        } finally {
            setLoadingRecent(false);
        }
    };

    const saveRecentlyViewed = async (recipe: any) => {
        if (!userId) return;

        try {
            const key = `recentlyViewed_${userId}`;
            const stored = await AsyncStorage.getItem(key);
            let recipes = stored ? JSON.parse(stored) : [];

            // Remove if already exists (to move to front)
            recipes = recipes.filter((r: any) => r.id !== recipe.id);

            // Format time properly
            let formattedTime = 'N/A';
            if (recipe.totalTime) {
                const timeValue = typeof recipe.totalTime === 'string' ? recipe.totalTime : recipe.totalTime.toString();
                formattedTime = timeValue.includes('Mins') || timeValue.includes('mins') ? timeValue : `${timeValue} Mins`;
            } else if (recipe.time) {
                formattedTime = recipe.time;
            }

            // Add to front
            recipes.unshift({
                id: recipe.id,
                title: recipe.title,
                image: recipe.image,
                time: formattedTime,
                viewedAt: new Date().toISOString()
            });

            // Keep only last 20
            recipes = recipes.slice(0, 20);

            await AsyncStorage.setItem(key, JSON.stringify(recipes));
            setRecentlyViewed(recipes.slice(0, 10)); // Update state
        } catch (error) {
            console.log('Error saving recently viewed:', error);
        }
    };

    // --- HANDLE RECIPE CARD PRESS WITH FULL DETAILS FETCH ---
    const handleRecipePress = async (recipe: any) => {
        console.log('Fetching full details for recipe:', recipe.id);

        setLoadingMessage("Loading recipe details...");
        setShowLoadingModal(true);

        try {
            const fullRecipe: any = await getRecipeById(recipe.id);

            if (!fullRecipe) {
                throw new Error('Failed to fetch recipe details');
            }

            // For created recipes, preserve the structure from Firestore
            // For API recipes, transform to match ViewRecipeScreen expectations
            const completeRecipe = {
                id: fullRecipe.id?.toString() || recipe.id,
                title: fullRecipe.title || recipe.title,
                image: fullRecipe.image || recipe.image,
                totalTime: fullRecipe.totalTime || fullRecipe.readyInMinutes?.toString() || '30',
                difficulty: fullRecipe.difficulty || '',
                source: fullRecipe.source || 'api' as const,
                servings: fullRecipe.servings || 4,
                userId: fullRecipe.userId,
                username: fullRecipe.username,
                profileImage: fullRecipe.profileImage,
                // Keep ingredients as objects, not strings
                ingredients: fullRecipe.extendedIngredients?.map((ing: any) => ({
                    name: ing.name || ing.original,
                    amount: ing.amount?.toString() || '',
                    unit: ing.unit || ''
                })) || fullRecipe.ingredients || [],
                // Keep steps as array of objects, not joined string
                steps: fullRecipe.analyzedInstructions?.[0]?.steps?.map((step: any, idx: number) => ({
                    title: `Step ${idx + 1}`,
                    details: step.step,
                    time: ''
                })) || fullRecipe.steps || [],
                intro: fullRecipe.summary?.replace(/<[^>]*>/g, '') || fullRecipe.intro || '',
                sourceUrl: fullRecipe.sourceUrl || null,
                youtube: fullRecipe.youtube || null,
                cuisines: fullRecipe.cuisines || [],
                dishTypes: fullRecipe.dishTypes || [],
                diets: fullRecipe.diets || [],
                serving: fullRecipe.serving || fullRecipe.servings?.toString() || 'N/A',
            };

            console.log('✅ Complete recipe ready:', completeRecipe.title);

            // Save to recently viewed
            await saveRecentlyViewed(completeRecipe);

            navigation.navigate('ViewRecipe', { recipe: completeRecipe, viewMode: 'discover' });
        } catch (error) {
            console.log('❌ Error fetching recipe details:', error);
            Alert.alert('Error', 'Failed to load recipe details. Please try again.');
        } finally {
            setShowLoadingModal(false);
        }
    };

    // --- HANDLE SAVE RECIPE ---
    const handleSaveRecipe = async (recipe: any) => {
        setLoadingMessage("Saving recipe...");
        setShowLoadingModal(true);

        try {
            await saveApiRecipe(recipe);
            setSavedRecipes(prev => ({ ...prev, [recipe.id]: true }));
            Alert.alert("Success", `${recipe.title} saved successfully!`);
        } catch (err) {
            console.error(err);
            Alert.alert("Error", "Failed to save recipe.");
        } finally {
            setShowLoadingModal(false);
        }
    };

    // --- HANDLE UNSAVE RECIPE ---
    const handleUnsaveRecipe = async (recipeId: string) => {
        setLoadingMessage("Removing recipe...");
        setShowLoadingModal(true);

        try {
            await unsaveRecipe(recipeId);
            setSavedRecipes(prev => ({ ...prev, [recipeId]: false }));
            Alert.alert("Success", "Recipe removed from saved list.");
        } catch (err) {
            console.error(err);
            Alert.alert("Error", "Failed to unsave recipe.");
        } finally {
            setShowLoadingModal(false);
        }
    };

    return (
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.secondary }}>
            <View style={{ flex: 1, overflow: 'visible' }}>
                {initialLoading ? (
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="large" color="#FF9966" />
                    </View>
                ) : (
                    <ScrollView
                        className="px-2 pt-4"
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={handleManualRefresh}
                                colors={['#FF9966']}
                                tintColor="#FF9966"
                            />
                        }
                    >
                        {/* MODERN HEADER */}
                        <View className="px-4 mb-2 pt-2">
                            <View className="flex-row justify-between items-center">
                                <TouchableOpacity
                                    onPress={() => navigation.navigate('Profile', { userId: userId, viewMode: 'profile' })}
                                    className="flex-row items-center"
                                >
                                    <View
                                        className="w-14 h-14 rounded-full items-center justify-center"
                                        style={{
                                            backgroundColor: colors.white,
                                            borderWidth: 3,
                                            borderColor: '#FF9966',
                                            shadowColor: '#FF9966',
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: 0.3,
                                            shadowRadius: 4,
                                            elevation: 4,
                                        }}
                                    >
                                        {profileImage ? (
                                            <Image source={{ uri: profileImage }} className="w-12 h-12 rounded-full" />
                                        ) : (
                                            <Fontisto name="male" size={22} color={colors.lightBrown} />
                                        )}
                                    </View>
                                    <View className="ml-3">
                                        <Text className="text-gray-500 text-xs font-medium">Welcome back!</Text>
                                        <Text className="text-gray-800 text-lg font-bold">{username || 'Guest'}</Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    className="w-11 h-11 rounded-full items-center justify-center"
                                    style={{
                                        backgroundColor: colors.lightPeach,
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.1,
                                        shadowRadius: 3,
                                        elevation: 2,
                                    }}
                                    onPress={() => navigation.navigate('Setting')}
                                >
                                    <Ionicons name="settings-outline" size={22} color="#FF9966" />
                                </TouchableOpacity>
                            </View>

                            {/* GREETING */}
                            <View className="mt-6">
                                <Text
                                    style={{
                                        fontFamily: 'ArchivoBlack_400Regular',
                                        fontSize: 30,
                                        color: '#1F2937'
                                    }}
                                >
                                    What's cooking?
                                </Text>
                                <Text
                                    className="mt-1 text-base"
                                    style={{
                                        fontFamily: 'Oswald_400Regular',
                                        color: '#1F2937'
                                    }}>
                                    Discover delicious recipes for today 🍳
                                </Text>
                            </View>
                        </View>

                        {/* MODERN STATS WIDGET */}
                        {!loadingStats && (
                            <View
                                className="mx-2 mt-6 rounded-3xl p-5"
                                style={{
                                    backgroundColor: colors.lightPeach,
                                    shadowColor: '#FF9966',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.15,
                                    shadowRadius: 12,
                                    elevation: 6,
                                }}
                            >
                                <View className="flex-row items-center justify-between mb-4">
                                    <Text className="text-xl font-bold text-gray-800">Your Activity</Text>
                                    <View className="px-3 py-1 rounded-full">
                                        <Text className="text-orange-600 text-sm font-semibold">This Week</Text>
                                    </View>
                                </View>
                                <View className="flex-row justify-around">
                                    <View className="items-center">
                                        <View
                                            className="w-20 h-20 rounded-2xl items-center justify-center mb-3"
                                            style={{
                                                backgroundColor: '#FFF4E0',
                                                shadowColor: '#FF9966',
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: 0.2,
                                                shadowRadius: 4,
                                                elevation: 2,
                                            }}
                                        >
                                            <Feather name="bookmark" size={28} color="#FF9966" />
                                        </View>
                                        <Text className="text-3xl font-bold text-gray-800">{userStats.savedCount}</Text>
                                        <Text className="text-xs text-gray-500 font-medium mt-1">Saved</Text>
                                    </View>
                                    <View className="items-center">
                                        <View
                                            className="w-20 h-20 rounded-2xl items-center justify-center mb-3"
                                            style={{
                                                backgroundColor: '#E8F5E9',
                                                shadowColor: '#4CAF50',
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: 0.2,
                                                shadowRadius: 4,
                                                elevation: 2,
                                            }}
                                        >
                                            <Feather name="edit-3" size={28} color="#4CAF50" />
                                        </View>
                                        <Text className="text-3xl font-bold text-gray-800">{userStats.createdCount}</Text>
                                        <Text className="text-xs text-gray-500 font-medium mt-1">Created</Text>
                                    </View>
                                    <View className="items-center">
                                        <View
                                            className="w-20 h-20 rounded-2xl items-center justify-center mb-3"
                                            style={{
                                                backgroundColor: '#E3F2FD',
                                                shadowColor: '#2196F3',
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: 0.2,
                                                shadowRadius: 4,
                                                elevation: 2,
                                            }}
                                        >
                                            <Ionicons name="calendar-outline" size={28} color="#2196F3" />
                                        </View>
                                        <Text className="text-3xl font-bold text-gray-800">{userStats.plannedDays}</Text>
                                        <Text className="text-xs text-gray-500 font-medium mt-1">Planned</Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* MODERN TODAY'S MEAL WIDGET */}
                        <View
                            className="mx-2 mt-6 rounded-3xl overflow-hidden"
                            style={{
                                backgroundColor: colors.lightPeach,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 8,
                                elevation: 4,
                            }}
                        >
                            <View className="px-5 pt-5 pb-3 flex-row justify-between items-center">
                                <View>
                                    <View className="flex-row items-center mb-1">
                                        <Ionicons name="restaurant" size={20} color="#FF9966" />
                                        <Text className="text-xl font-bold text-gray-800 ml-2">Today's Menu</Text>
                                    </View>
                                    <Text className="text-sm text-gray-500 ml-7">
                                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    className="bg-orange-50 px-4 py-2 rounded-full"
                                    onPress={() => navigation.navigate('Planner', {})}
                                >
                                    <Text className="text-orange-600 font-semibold text-sm">View All</Text>
                                </TouchableOpacity>
                            </View>
                            {loadingStats ? (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
                                >
                                    {[1, 2, 3].map((item) => (
                                        <View
                                            key={item}
                                            className="bg-white rounded-xl mr-3 overflow-hidden shadow-sm"
                                            style={{ width: 160 }}
                                        >
                                            <View className="w-full h-32 bg-gray-200" />
                                            <View className="p-3">
                                                <View className="h-4 bg-gray-200 rounded mb-2 w-full" />
                                                <View className="h-4 bg-gray-200 rounded mb-2 w-3/4" />
                                                <View className="h-3 bg-gray-200 rounded w-16" />
                                            </View>
                                            <View className="absolute inset-0 justify-center items-center">
                                                <ActivityIndicator size="small" color="#FF9966" />
                                            </View>
                                        </View>
                                    ))}
                                </ScrollView>
                            ) : todaysMeals.length === 0 ? (
                                <View className="px-5 pb-6 items-center justify-center" style={{ minHeight: 140 }}>
                                    <View
                                        className="w-16 h-16 rounded-full items-center justify-center mb-3"
                                        style={{ backgroundColor: '#FFF4E0' }}
                                    >
                                        <Ionicons name="calendar-outline" size={32} color="#FF9966" />
                                    </View>
                                    <Text className="text-gray-700 font-semibold text-base">No meals planned yet</Text>
                                    <Text className="text-gray-500 text-center mt-1 text-sm">
                                        Start planning your delicious day!
                                    </Text>
                                    <TouchableOpacity
                                        className="mt-4 px-6 py-3 rounded-full flex-row items-center"
                                        style={{
                                            backgroundColor: '#FF9966',
                                            shadowColor: '#FF9966',
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: 0.3,
                                            shadowRadius: 4,
                                            elevation: 3,
                                        }}
                                        onPress={() => navigation.navigate('Planner', {})}
                                    >
                                        <Ionicons name="add-circle-outline" size={18} color="white" />
                                        <Text className="text-white font-bold text-sm ml-2">Add Meal</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
                                >
                                    {todaysMeals.map((meal) => (
                                        <TouchableOpacity
                                            key={meal.id}
                                            className="rounded-2xl mr-4 overflow-hidden"
                                            style={{
                                                width: 180,
                                                backgroundColor: '#FAFAFA',
                                                shadowColor: '#000',
                                                shadowOffset: { width: 0, height: 3 },
                                                shadowOpacity: 0.12,
                                                shadowRadius: 6,
                                                elevation: 4,
                                            }}
                                            onPress={() => handleRecipePress(meal)}
                                        >
                                            <View className="relative">
                                                <Image
                                                    source={{ uri: meal.image }}
                                                    className="w-full h-36"
                                                    style={{ resizeMode: 'cover' }}
                                                />
                                                <View
                                                    className="absolute bottom-0 left-0 right-0 px-3 py-2"
                                                    style={{
                                                        backgroundColor: 'rgba(0,0,0,0.4)',
                                                    }}
                                                >
                                                    <View className="flex-row items-center">
                                                        <Ionicons name="time" size={14} color="white" />
                                                        <Text className="text-xs text-white ml-1 font-medium">
                                                            {meal.totalTime || 'N/A'} mins
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                            <View className="p-3">
                                                <Text className="font-bold text-gray-800 text-base" numberOfLines={2}>
                                                    {meal.title}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}
                        </View>

                        {/* SEARCH BY INGREDIENTS */}
                        <View
                            className="rounded-3xl mx-2 mt-6 mb-4 overflow-hidden"
                            style={{
                                backgroundColor: 'white',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.08,
                                shadowRadius: 8,
                                elevation: 3,
                            }}
                        >
                            <View className="flex-row justify-between items-center px-5 pt-5 pb-3"
                                style={{ backgroundColor: colors.lightPeach }}>
                                <View className="flex-row items-center">
                                    <View className="w-10 h-10 rounded-full items-center justify-center mr-2" style={{ backgroundColor: '#FFF4E0' }}>
                                        <Ionicons name="leaf" size={20} color="#FF9966" />
                                    </View>
                                    <Text className="text-xl font-bold text-gray-800">Ingredients</Text>
                                </View>
                                <TouchableOpacity
                                    className="bg-orange-50 px-4 py-2 rounded-full"
                                    onPress={handleShowAddIngredientsModal}
                                >
                                    <View className="flex-row items-center">
                                        <Ionicons name="add-circle" size={16} color="#FF9966" />
                                        <Text className="text-orange-600 font-semibold text-sm ml-1">Add</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>

                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12 }}
                                style={{ backgroundColor: colors.lightPeach }}
                            >
                                {ingredients.map((ingredient, idx) => {
                                    const isSelected = tempSelectedIngredients.includes(ingredient);
                                    return (
                                        <TouchableOpacity
                                            key={idx}
                                            onPress={() => toggleIngredient(ingredient)}
                                            className={`mr-3 px-5 py-3 rounded-full`}
                                            style={{
                                                backgroundColor: isSelected ? '#FF9966' : '#F5F5F5',
                                                shadowColor: isSelected ? '#FF9966' : '#000',
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: isSelected ? 0.3 : 0.05,
                                                shadowRadius: isSelected ? 4 : 2,
                                                elevation: isSelected ? 3 : 1,
                                            }}
                                        >
                                            <Text className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                                                {ingredient}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            {/* INGREDIENTS RECIPES SECTION */}
                            <View style={{ position: 'relative', minHeight: 280, backgroundColor: colors.lightPeach }}>
                                {selectedIngredients.length > 0 && (
                                    <>
                                        <Text className="text-lg font-bold text-gray-700 mb-2 px-4">
                                            Recipes with {selectedIngredients.join(', ')}
                                        </Text>

                                        {loadingIngredients ? (
                                            <ScrollView
                                                horizontal
                                                showsHorizontalScrollIndicator={false}
                                                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
                                            >
                                                {[1, 2, 3].map((item) => (
                                                    <View
                                                        key={item}
                                                        className="bg-gray-200 rounded-2xl w-36 h-56 mr-4 overflow-hidden"
                                                    >
                                                        <View className="w-full h-32 bg-gray-300" />
                                                        <View className="p-3">
                                                            <View className="h-4 bg-gray-300 rounded mb-2 w-full" />
                                                            <View className="h-3 bg-gray-300 rounded w-3/4" />
                                                        </View>
                                                        <View className="absolute inset-0 justify-center items-center">
                                                            <ActivityIndicator size="small" color="#FF9966" />
                                                        </View>
                                                    </View>
                                                ))}
                                            </ScrollView>
                                        ) : (
                                            <FlatList
                                                data={ingredientFinalData}
                                                horizontal
                                                keyExtractor={item => item.id?.toString()}
                                                showsHorizontalScrollIndicator={false}
                                                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
                                                renderItem={({ item }) => (
                                                    <FeaturedRecipeCard
                                                        recipe={item}
                                                        onPress={() => handleRecipePress(item)}
                                                        onSave={() => {
                                                            if (savedRecipes[item.id]) {
                                                                handleUnsaveRecipe(item.id);
                                                            } else {
                                                                handleSaveRecipe(item);
                                                            }
                                                        }}
                                                        isSaved={!!savedRecipes[item.id]}
                                                    />
                                                )}
                                            />
                                        )}
                                    </>
                                )}

                                {/* CONFIRMATION MODAL */}
                                {showModal && (
                                    <View
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            backgroundColor: 'rgba(0,0,0,0.7)',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            zIndex: 10,
                                            paddingHorizontal: 16,
                                        }}
                                    >
                                        <View className="bg-white rounded-3xl p-6 w-full max-w-sm">
                                            <Text className="text-xl font-bold text-gray-800 mb-4 text-center">
                                                {tempSelectedIngredients.length === 0
                                                    ? 'Clear all ingredients?'
                                                    : `Search with ${tempSelectedIngredients.length} ingredient${tempSelectedIngredients.length > 1 ? 's' : ''}?`
                                                }
                                            </Text>
                                            <Text className="text-gray-600 mb-6 text-center">
                                                {tempSelectedIngredients.length === 0
                                                    ? 'No ingredients selected'
                                                    : tempSelectedIngredients.join(', ')
                                                }
                                            </Text>

                                            <TouchableOpacity
                                                className="bg-orange-400 rounded-full py-3 mb-3"
                                                onPress={handleShowRecipes}
                                            >
                                                <Text className="text-white font-bold text-center text-lg">
                                                    {tempSelectedIngredients.length === 0 ? 'Clear' : 'Show Recipes'}
                                                </Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                className="bg-gray-200 rounded-full py-3"
                                                onPress={handleUndo}
                                            >
                                                <Text className="text-gray-700 font-semibold text-center text-lg">
                                                    Cancel
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* CATEGORIES */}
                        <View
                            className="rounded-3xl mx-2 mt-6 mb-4"
                            style={{
                                backgroundColor: colors.lightPeach,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.08,
                                shadowRadius: 8,
                                elevation: 3,
                            }}
                        >
                            <View className="flex-row items-center px-5 pt-5 pb-3"
                                style={{ backgroundColor: colors.lightPeach }}>
                                <View className="w-10 h-10 rounded-full items-center justify-center mr-2" style={{ backgroundColor: '#FFF4E0' }}>
                                    <Ionicons name="grid" size={20} color="#FF9966" />
                                </View>
                                <Text className="text-xl font-bold text-gray-800">Explore Categories</Text>
                            </View>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12 }}
                                style={{ backgroundColor: colors.lightPeach }}
                            >
                                {categories.map(category => (
                                    <TouchableOpacity
                                        key={category}
                                        className={`mr-3 px-5 py-3 rounded-full`}
                                        onPress={() => setActiveCategory(category)}
                                        style={{
                                            backgroundColor: activeCategory === category ? '#FF9966' : '#F5F5F5',
                                            shadowColor: activeCategory === category ? '#FF9966' : '#000',
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: activeCategory === category ? 0.3 : 0.05,
                                            shadowRadius: activeCategory === category ? 4 : 2,
                                            elevation: activeCategory === category ? 3 : 1,
                                        }}
                                    >
                                        <Text className={`font-bold text-sm ${activeCategory === category ? 'text-white' : 'text-gray-700'}`}>
                                            {category}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <View className="pt-4 pb-4 rounded-3xl p-2"
                                style={{ backgroundColor: colors.lightPeach }}>
                                <Text className="text-lg font-bold text-gray-700 mb-4 px-4">
                                    {activeCategory === 'All' ? 'Featured Recipes' : `${activeCategory} Recipes`}
                                </Text>

                                {loadingCategories ? (
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={{ paddingHorizontal: 16 }}
                                    >
                                        {[1, 2, 3].map((item) => (
                                            <View
                                                key={item}
                                                className="bg-gray-200 rounded-2xl w-36 h-56 mr-4 overflow-hidden"
                                            >
                                                <View className="w-full h-32 bg-gray-300" />
                                                <View className="p-3">
                                                    <View className="h-4 bg-gray-300 rounded mb-2 w-full" />
                                                    <View className="h-3 bg-gray-300 rounded w-3/4" />
                                                </View>
                                                <View className="absolute inset-0 justify-center items-center">
                                                    <ActivityIndicator size="small" color="#FF9966" />
                                                </View>
                                            </View>
                                        ))}
                                    </ScrollView>
                                ) : (
                                    <FlatList
                                        data={categoryFinalData}
                                        horizontal
                                        keyExtractor={item => item.id?.toString()}
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={{ paddingHorizontal: 16 }}
                                        renderItem={({ item }) =>
                                            item.type === 'seeMore' ? (
                                                <TouchableOpacity
                                                    className="bg-orange-400 rounded-2xl justify-center items-center w-36 h-56 mr-4"
                                                    onPress={() => navigation.navigate('Search')}
                                                >
                                                    <Text className="text-white font-bold text-lg mb-2">Discover More</Text>
                                                    <Feather name="search" size={28} color="white" />
                                                </TouchableOpacity>
                                            ) : (
                                                <FeaturedRecipeCard
                                                    recipe={item}
                                                    onPress={() => handleRecipePress(item)}
                                                    onSave={() => {
                                                        if (savedRecipes[item.id]) {
                                                            handleUnsaveRecipe(item.id);
                                                        } else {
                                                            handleSaveRecipe(item);
                                                        }
                                                    }}
                                                    isSaved={!!savedRecipes[item.id]}
                                                />
                                            )
                                        }
                                    />
                                )}
                            </View>
                        </View>

                        {/* RECENTLY VIEWED */}
                        {recentlyViewed.length > 0 && (
                            <View
                                className="rounded-3xl mx-2 mt-6 mb-4"
                                style={{
                                    backgroundColor: colors.lightPeach,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.08,
                                    shadowRadius: 8,
                                    elevation: 3,
                                }}
                            >
                                <View className="flex-row justify-between items-center px-5 pt-5 pb-3">
                                    <View className="flex-row items-center">
                                        <View className="w-10 h-10 rounded-full items-center justify-center mr-2" style={{ backgroundColor: '#FFF4E0' }}>
                                            <Ionicons name="time-outline" size={20} color="#FF9966" />
                                        </View>
                                        <Text className="text-xl font-bold text-gray-800">Recent History</Text>
                                    </View>
                                    <TouchableOpacity
                                        className="bg-orange-50 px-4 py-2 rounded-full"
                                        onPress={() => navigation.navigate('RecentlyViewed')}
                                    >
                                        <Text className="text-orange-600 font-semibold text-sm">See All</Text>
                                    </TouchableOpacity>
                                </View>

                                {loadingRecent ? (
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
                                    >
                                        {[1, 2, 3].map((item) => (
                                            <View
                                                key={item}
                                                className="bg-gray-200 rounded-2xl w-36 h-56 mr-4 overflow-hidden"
                                            >
                                                <View className="w-full h-32 bg-gray-300" />
                                                <View className="p-3">
                                                    <View className="h-4 bg-gray-300 rounded mb-2 w-full" />
                                                    <View className="h-3 bg-gray-300 rounded w-3/4" />
                                                </View>
                                                <View className="absolute inset-0 justify-center items-center">
                                                    <ActivityIndicator size="small" color="#FF9966" />
                                                </View>
                                            </View>
                                        ))}
                                    </ScrollView>
                                ) : (
                                    <FlatList
                                        data={recentlyViewed}
                                        horizontal
                                        keyExtractor={item => item.id?.toString()}
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
                                        renderItem={({ item }) => (
                                            <FeaturedRecipeCard
                                                recipe={item}
                                                onPress={() => handleRecipePress(item)}
                                                onSave={() => {
                                                    if (savedRecipes[item.id]) {
                                                        handleUnsaveRecipe(item.id);
                                                    } else {
                                                        handleSaveRecipe(item);
                                                    }
                                                }}
                                                isSaved={!!savedRecipes[item.id]}
                                            />
                                        )}
                                    />
                                )}
                            </View>
                        )}
                    </ScrollView>
                )}

                {/* LOADING MODAL */}
                <LoadingModal visible={showLoadingModal} message={loadingMessage} />

                {/* FLOATING CHATBOT BUTTON */}
                <TouchableOpacity
                    className="absolute bottom-6 right-6 w-16 h-16 rounded-full items-center justify-center shadow-lg"
                    style={{
                        backgroundColor: '#FF9966',
                        elevation: 8, // Android shadow
                        shadowColor: '#000', // iOS shadow
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                    }}
                    onPress={() => setShowChatbot(true)}
                    activeOpacity={0.8}
                >
                    <Ionicons name="chatbubbles" size={28} color="white" />
                </TouchableOpacity>
            </View>

            {/* ADD INGREDIENTS MODAL */}
            {showAddIngredients && (
                <View style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <Pressable
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                        onPress={() => setShowAddIngredients(false)}
                    />

                    <View style={{
                        width: '90%',
                        maxHeight: '80%',
                        backgroundColor: 'white',
                        borderRadius: 20,
                        overflow: 'hidden'
                    }}>
                        {/* Header */}
                        <View className="bg-orange-500 px-5 py-4 flex-row justify-between items-center">
                            <Text className="text-white font-bold text-lg">Add & Select Ingredients</Text>
                            <TouchableOpacity onPress={() => setShowAddIngredients(false)}>
                                <Ionicons name="close" size={24} color="white" />
                            </TouchableOpacity>
                        </View>

                        {/* Body */}
                        <ScrollView className="px-5 py-4" showsVerticalScrollIndicator={false}>
                            {/* Add New Ingredient Section */}
                            <View className="mb-4">
                                <Text className="text-gray-700 font-semibold mb-3">Add New Ingredient</Text>
                                <View className="flex-row items-center">
                                    <TextInput
                                        className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-3 mr-2"
                                        placeholder="e.g., Papaya, Durian..."
                                        value={newIngredient}
                                        onChangeText={setNewIngredient}
                                        returnKeyType="done"
                                        onSubmitEditing={handleAddIngredient}
                                    />
                                    <TouchableOpacity
                                        className="px-4 py-3 rounded-lg bg-orange-500"
                                        onPress={handleAddIngredient}
                                    >
                                        <Text className="text-white font-semibold">Add</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Ingredients List with Selection */}
                            <View>
                                <Text className="text-gray-700 font-semibold mb-3">
                                    Select Ingredients ({modalSelectedIngredients.length} selected)
                                </Text>
                                <View className="flex-row flex-wrap">
                                    {ingredients.map((ingredient, idx) => {
                                        const isSelected = modalSelectedIngredients.includes(ingredient);
                                        return (
                                            <View
                                                key={idx}
                                                className={`rounded-full px-3 py-2 mr-2 mb-2 flex-row items-center ${isSelected ? 'bg-orange-500' : 'bg-gray-100'
                                                    }`}
                                            >
                                                <TouchableOpacity
                                                    onPress={() => toggleModalIngredient(ingredient)}
                                                    className="flex-row items-center"
                                                >
                                                    <Text className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-600'
                                                        }`}>
                                                        {ingredient}
                                                    </Text>
                                                </TouchableOpacity>

                                                {/* Remove button (only for non-base ingredients) */}
                                                {!baseIngredients.includes(ingredient) && (
                                                    <TouchableOpacity
                                                        className="ml-2"
                                                        onPress={() => handleRemoveIngredient(ingredient)}
                                                    >
                                                        <Ionicons
                                                            name="close-circle"
                                                            size={16}
                                                            color={isSelected ? "white" : "#F97316"}
                                                        />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>



                            {/* Info Message */}
                            {modalSelectedIngredients.length === 0 && (
                                <View className="mt-4 bg-orange-50 p-3 rounded-lg">
                                    <Text className="text-orange-600 text-sm text-center">
                                        ℹ️ Please select at least one ingredient to search
                                    </Text>
                                </View>
                            )}
                        </ScrollView>

                        {/* Footer */}
                        <View className="px-5 py-4 border-t border-gray-200">
                            <TouchableOpacity
                                className="py-3 rounded-xl"
                                style={{
                                    backgroundColor: modalSelectedIngredients.length > 0 ? '#F97316' : '#D1D5DB'
                                }}
                                onPress={handleSearchFromModal}
                                disabled={modalSelectedIngredients.length === 0}
                            >
                                <Text className="text-white text-center font-bold text-lg">
                                    Search with {modalSelectedIngredients.length} Ingredient{modalSelectedIngredients.length !== 1 ? 's' : ''}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            {/* CHATBOT MODAL */}
            <Modal
                visible={showChatbot}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowChatbot(false)}
            >
                <View className="flex-1 bg-white">
                    <GeminiChatbot />
                    {/* Close button */}
                    <TouchableOpacity
                        className="absolute top-12 right-4 w-10 h-10 rounded-full bg-gray-200 items-center justify-center z-50"
                        onPress={() => setShowChatbot(false)}
                        style={{
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.25,
                            shadowRadius: 3.84,
                            elevation: 5,
                        }}
                    >
                        <Ionicons name="close" size={24} color="#666" />
                    </TouchableOpacity>
                </View>
            </Modal>

            {/* AsyncStorage Size Check Button */}
            {/* <View className="mt-6 mb-2">
                <TouchableOpacity
                    className="bg-purple-500 py-3 px-4 rounded-xl items-center"
                    onPress={async () => {
                        const keys = await AsyncStorage.getAllKeys();
                        const stores = await AsyncStorage.multiGet(keys);

                        let totalSize = 0;
                        const itemSizes: any = {};

                        stores.forEach(([key, value]) => {
                            const size = (key.length + (value?.length || 0));
                            itemSizes[key] = size;
                            totalSize += size;
                        });

                        const formatSize = (bytes: number) => {
                            if (bytes < 1024) return `${bytes} B`;
                            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
                            return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
                        };

                        let message = `📊 AsyncStorage Usage\n\n`;
                        message += `Total Items: ${keys.length}\n`;
                        message += `Total Size: ${formatSize(totalSize)}\n\n`;
                        message += `Breakdown:\n`;

                        Object.entries(itemSizes).forEach(([key, size]) => {
                            message += `• ${key}: ${formatSize(size as number)}\n`;
                        });

                        Alert.alert('Storage Info', message);
                    }}
                >
                    <View className="flex-row items-center">
                        <Ionicons name="server-outline" size={20} color="white" />
                        <Text className="text-white font-bold ml-2">Check AsyncStorage Size</Text>
                    </View>
                </TouchableOpacity>
            </View> */}

            {/* Clear Storage Button - DANGEROUS */}
            {/* {__DEV__ && (
                <TouchableOpacity
                    className="bg-red-500 py-3 px-4 rounded-xl items-center mt-3"
                    onPress={() => {
                        Alert.alert(
                            '⚠️ Clear Storage',
                            'This will delete ALL AsyncStorage data. Are you sure?',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Clear All',
                                    style: 'destructive',
                                    onPress: async () => {
                                        try {
                                            await AsyncStorage.clear();
                                            Alert.alert('✅ Success', 'All storage cleared!');
                                        } catch (error) {
                                            Alert.alert('❌ Error', 'Failed to clear storage');
                                        }
                                    }
                                }
                            ]
                        );
                    }}
                >
                    <View className="flex-row items-center">
                        <Ionicons name="trash-outline" size={20} color="white" />
                        <Text className="text-white font-bold ml-2">Clear All Storage</Text>
                    </View>
                </TouchableOpacity>
            )} */}
        </SafeAreaView>
    );
};