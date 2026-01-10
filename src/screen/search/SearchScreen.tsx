import { View, Text, TouchableOpacity, TextInput, ScrollView, Image, Alert, RefreshControl, ActivityIndicator } from 'react-native'
import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { Entypo, Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AntDesign from '@expo/vector-icons/AntDesign';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { searchRecipes } from '~/controller/recipe';
import { fetchRandomRecipes, fetchRecipesByCategory, fetchRecipesByIngredients, HARAM_INGREDIENTS } from '~/api/spoonacular';
import Header from '../../components/partials/Header';
import GeminiTestModal from '~/components/modal/GeminiTestModal';
import RecipeComparisonModal from '~/components/modal/RecipeComparisonModal';
import CalorieCountModal from '~/components/modal/CalorieCountModal';
import CameraOptionsModal from '~/components/modal/CameraOptionsModal';
import { useAuth } from '~/context/AuthContext';
import colors from '~/utils/color';

// Navigation types
type RootStackParamList = {
    AddRecipe: undefined;
    ViewRecipe: {
        recipe: Recipe,
        viewMode: string
    };
    GeminiTest: undefined;
};
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Recipe {
    id: string;
    title: string;
    image: string;
    totalTime?: string;
    difficulty?: string;
    serving?: string;
    source?: 'created' | 'api';
    matchPercentage?: number;
    missingIngredients?: string[];
    ingredients?: any[]; // Add this for created recipes
    isPrivate?: boolean;
}

interface RecipeCardProps {
    recipe: Recipe;
    navigation: NavigationProp;
}

const RecipeCard = memo(({ recipe, navigation }: RecipeCardProps) => {
    const [loading, setLoading] = useState(true);

    const handlePress = useCallback(() => {
        navigation.navigate('ViewRecipe', { recipe, viewMode: 'discover' });
    }, [recipe, navigation]);

    return (
        <TouchableOpacity
            className="bg-white rounded-xl shadow-sm mb-4 w-[48%]"
            onPress={handlePress}
        >
            <View className="w-full h-32 rounded-t-xl bg-gray-200 justify-center items-center">
                {loading && (
                    <View style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
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
                />

                {recipe.matchPercentage && (
                    <View className="absolute top-2 right-2 bg-green-500 px-2 py-1 rounded-full">
                        <Text className="text-white text-xs font-bold">
                            {Math.round(recipe.matchPercentage)}% Match
                        </Text>
                    </View>
                )}
            </View>

            <View className="p-3">
                <Text className="font-semibold text-gray-800 mb-1" numberOfLines={2}>
                    {recipe.title}
                </Text>
                <View className="flex-row justify-between">
                    <Text className="text-gray-500 text-sm">{recipe.totalTime || ''} mins</Text>
                    <Text className="text-gray-500 text-sm">{recipe.difficulty || ''}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
});

export default function SearchScreen() {
    const [tab, setTab] = useState<'createdRecipe' | 'apiRecipe' | 'all'>('createdRecipe');
    const [searchQuery, setSearchQuery] = useState('');
    const [myRecipes, setMyRecipes] = useState<Recipe[]>([]);
    const [discoverRecipes, setDiscoverRecipes] = useState<Recipe[]>([]);
    const [displayedRecipes, setDisplayedRecipes] = useState<Recipe[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const navigation = useNavigation<NavigationProp>();
    const [loading, setLoading] = useState<boolean>(false);
    const [showGeminiModal, setShowGeminiModal] = useState(false);
    const [showComparisonModal, setShowComparisonModal] = useState(false);
    const [comparisonData, setComparisonData] = useState<any>(null);
    const [showCameraOptionsModal, setShowCameraOptionsModal] = useState(false);
    const [showCalorieModal, setShowCalorieModal] = useState(false);

    const [isPrivate, setIsPrivate] = useState<boolean>(false);

    const scrollViewRef = useRef<ScrollView>(null);
    const { user } = useAuth();

    // Track if initial fetch has been done
    const hasFetchedCreated = useRef(false);
    const hasFetchedDiscover = useRef(false);

    const fetchCreatedRecipes = async () => {
        try {
            setLoading(true);
            console.log('Fetching user recipes...');
            const results = await searchRecipes(searchQuery);

            // Filter to show ONLY public recipes in search
            const publicRecipesOnly = results.filter((recipe: any) => !recipe.isPrivate);

            const transformedRecipes = publicRecipesOnly.map((recipe: any) => ({
                ...recipe,
                source: 'created' as const
            }));

            setMyRecipes(transformedRecipes as Recipe[]);
            hasFetchedCreated.current = true; // Mark as fetched
        } catch (error) {
            console.error('Error fetching user recipes:', error);
            Alert.alert('Error', 'Failed to fetch your recipes');
        } finally {
            setLoading(false);
        }
    };

    const fetchDiscoverRecipes = async (forceRandom = false) => {
        try {
            setLoading(true);
            console.log('Fetching discover recipes from API...');

            // Prepare user preference filters
            const filters: {
                diet?: string[];
                excludeIngredients?: string[];
            } = {};

            if (user?.dietaryRestrictions && user.dietaryRestrictions.length > 0) {
                filters.diet = user.dietaryRestrictions;
                console.log('🥗 Applying dietary restrictions:', user.dietaryRestrictions);
            }

            // Always exclude haram ingredients + user preferences
            const userExclusions = user?.ingredientsToAvoid || [];
            filters.excludeIngredients = [...HARAM_INGREDIENTS, ...userExclusions];
            console.log('🚫 Excluding ingredients:', filters.excludeIngredients);

            let results;
            if (searchQuery.trim().length > 0 && !forceRandom) {
                console.log('Searching API for:', searchQuery);

                // Build URL with filters
                let url = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY}&query=${searchQuery}&number=20&addRecipeInformation=true`;

                // Add dietary restrictions to search
                if (filters.diet && filters.diet.length > 0) {
                    const dietParam = filters.diet.map(d => d.toLowerCase()).join(',');
                    url += `&diet=${encodeURIComponent(dietParam)}`;
                }

                // Add excluded ingredients to search
                if (filters.excludeIngredients && filters.excludeIngredients.length > 0) {
                    const excludeParam = filters.excludeIngredients.join(',');
                    url += `&excludeIngredients=${encodeURIComponent(excludeParam)}`;
                }

                const response = await fetch(url);
                const data = await response.json();
                results = { results: data.results || [] };
            } else {
                console.log('Fetching random recipes with user preferences');
                const randomRecipes = await fetchRandomRecipes(20, filters);
                results = { recipes: randomRecipes };
            }

            const recipesData = results.recipes || results.results || [];

            const transformedRecipes = recipesData.map((recipe: any) => ({
                id: recipe.id?.toString() || '',
                title: recipe.title || 'Untitled Recipe',
                image: recipe.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
                totalTime: recipe.readyInMinutes ? `${recipe.readyInMinutes}` : '',
                difficulty: '',
                source: 'api' as const
            }));

            setDiscoverRecipes(transformedRecipes);
            hasFetchedDiscover.current = true; // Mark as fetched
        } catch (error) {
            console.error('Error fetching discover recipes:', error);
            Alert.alert('Error', 'Failed to fetch discover recipes');
        } finally {
            setLoading(false);
        }
    };

    // const searchRecipesByDetectedIngredients = async (ingredients: string[]) => {
    //     try {
    //         setLoading(true);
    //         console.log('🔍 Searching recipes with ingredients:', ingredients);

    //         const ingredientQuery = formatIngredientsForSearch(ingredients);

    //         const response = await fetch(
    //             `https://api.spoonacular.com/recipes/findByIngredients?apiKey=${process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY}&ingredients=${ingredientQuery}&number=20&ranking=2&ignorePantry=false`
    //         );

    //         if (!response.ok) {
    //             throw new Error(`API request failed with status ${response.status}`);
    //         }

    //         const data = await response.json();
    //         console.log('✅ Recipes found:', data.length);

    //         if (data.length === 0) {
    //             Alert.alert(
    //                 'No Recipes Found',
    //                 'We couldn\'t find recipes with these ingredients.',
    //                 [{ text: 'OK' }]
    //             );
    //             setDiscoverRecipes([]);
    //             return;
    //         }

    //         const transformedRecipes: Recipe[] = data.map((recipe: any) => ({
    //             id: recipe.id?.toString() || '',
    //             title: recipe.title || 'Untitled Recipe',
    //             image: recipe.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
    //             totalTime: '',
    //             difficulty: '',
    //             source: 'api' as const,
    //         }));

    //         console.log(`✅ Showing ${transformedRecipes.length} recipes`);
    //         setDiscoverRecipes(transformedRecipes);

    //         Alert.alert(
    //             '✅ Recipes Found!',
    //             `Found ${transformedRecipes.length} recipes using your ingredients!`,
    //             [{ text: 'Great!' }]
    //         );
    //     } catch (error) {
    //         console.error('❌ Error searching recipes by ingredients:', error);
    //         throw error;
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    // const takePhoto = async () => {
    //     try {
    //         console.log('📷 Opening camera...');

    //         const { status } = await ImagePicker.requestCameraPermissionsAsync();
    //         if (status !== 'granted') {
    //             Alert.alert(
    //                 'Permission Required',
    //                 'Camera permission is required!',
    //                 [{ text: 'OK' }]
    //             );
    //             return;
    //         }

    //         const result = await ImagePicker.launchCameraAsync({
    //             mediaTypes: ['images'],
    //             allowsEditing: true,
    //             quality: 0.8,
    //             base64: false,
    //         });

    //         if (result.canceled || !result.assets || result.assets.length === 0) {
    //             console.log('📷 User canceled camera');
    //             return;
    //         }

    //         const imageUri = result.assets[0].uri;
    //         console.log('✅ Photo captured:', imageUri);

    //         setLoading(true);

    //         try {
    //             console.log('🔍 Detecting ingredients...');
    //             const detectedIngredients = await detectIngredientsFromImage(imageUri);

    //             setLoading(false);

    //             if (detectedIngredients.length === 0) {
    //                 Alert.alert(
    //                     'No Ingredients Found',
    //                     'Please try again with better lighting.',
    //                     [{ text: 'OK' }]
    //                 );
    //                 return;
    //             }

    //             Alert.alert(
    //                 '🎉 Ingredients Detected!',
    //                 `Found: ${detectedIngredients.join(', ')}\n\nSearch for recipes?`,
    //                 [
    //                     {
    //                         text: 'Cancel',
    //                         style: 'cancel',
    //                     },
    //                     {
    //                         text: 'Search',
    //                         onPress: async () => {
    //                             try {
    //                                 setLoading(true);
    //                                 setTab('apiRecipe');
    //                                 setSearchQuery(detectedIngredients.join(', '));
    //                                 await searchRecipesByDetectedIngredients(detectedIngredients);
    //                             } catch (error) {
    //                                 console.error('❌ Error:', error);
    //                                 Alert.alert('Search Failed', 'Please try again.', [{ text: 'OK' }]);
    //                             } finally {
    //                                 setLoading(false);
    //                             }
    //                         },
    //                     },
    //                 ]
    //             );
    //         } catch (detectionError: any) {
    //             console.error('❌ Detection error:', detectionError);
    //             setLoading(false);
    //             Alert.alert('Detection Failed', 'Please try again.', [{ text: 'OK' }]);
    //         }
    //     } catch (error) {
    //         console.error('❌ Camera error:', error);
    //         setLoading(false);
    //         Alert.alert('Camera Error', 'Failed to open camera.', [{ text: 'OK' }]);
    //     }
    // };

    const calculateIngredientMatch = (
        detectedIngredients: string[],
        recipeIngredients: string[]
    ): number => {
        if (recipeIngredients.length === 0) return 0;

        const normalizedDetected = detectedIngredients.map(i => i.toLowerCase().trim());
        const normalizedRecipe = recipeIngredients.map(i => i.toLowerCase().trim());

        let matchCount = 0;
        normalizedRecipe.forEach(recipeIng => {
            const isMatch = normalizedDetected.some(detectedIng =>
                recipeIng.includes(detectedIng) || detectedIng.includes(recipeIng)
            );
            if (isMatch) matchCount++;
        });

        console.log("Match Count " + matchCount);
        console.log("Detected Ingredents " + normalizedDetected);
        console.log("Detected Ingredents " + normalizedDetected.length);
        console.log("List recipe needed " + normalizedRecipe.length);
        console.log("List recipe needed " + normalizedRecipe);

        console.log("Sini percentage " + (matchCount / normalizedRecipe.length) * 100);

        return (matchCount / normalizedRecipe.length) * 100;
    };

    const searchDatabaseRecipesByIngredients = async (ingredients: string[], skipLoading = false) => {
        try {
            if (!skipLoading) setLoading(true);
            console.log('🔍 Searching database recipes...');

            const allRecipes = await searchRecipes('');

            const matchedRecipes = allRecipes
                .map((recipe: any) => {
                    const recipeIngredients = recipe.ingredients?.map((ing: any) =>
                        ing.name || ing
                    ) || [];

                    const matchPercentage = calculateIngredientMatch(ingredients, recipeIngredients);

                    // Find matched and missing ingredients
                    const normalizedDetected = ingredients.map(i => i.toLowerCase().trim());
                    const normalizedRecipe = recipeIngredients.map((i: string) => i.toLowerCase().trim());

                    const matched: string[] = [];
                    const missing: string[] = [];

                    normalizedRecipe.forEach((recipeIng: string) => {
                        const isMatch = normalizedDetected.some(detectedIng =>
                            recipeIng.includes(detectedIng) || detectedIng.includes(recipeIng)
                        );
                        if (isMatch) {
                            matched.push(recipeIng);
                        } else {
                            missing.push(recipeIng);
                        }
                    });

                    return {
                        ...recipe,
                        matchPercentage,
                        source: 'created' as const,
                        matchedIngredients: matched,
                        missingIngredients: missing
                    };
                })
                .filter((recipe: any) => recipe.matchPercentage && recipe.matchPercentage >= 50)
                .sort((a: any, b: any) => b.matchPercentage - a.matchPercentage);

            console.log(`✅ Found ${matchedRecipes.length} database recipes`);
            return matchedRecipes;
        } catch (error) {
            console.error('❌ Error:', error);
            return [];
        } finally {
            if (!skipLoading) setLoading(false);
        }
    };

    const searchAPIRecipesByIngredients = async (ingredients: string[], skipLoading = false) => {
        try {
            if (!skipLoading) setLoading(true);
            console.log('🔍 Searching API recipes...');

            const results = await fetchRecipesByIngredients(ingredients, 30);

            if (!results || results.length === 0) {
                console.log('No API recipes found');
                setDiscoverRecipes([]);
                return [];
            }

            const transformedRecipes: Recipe[] = results.map((recipe: any) => {
                const usedCount = recipe.usedIngredientCount || 0;
                const missedCount = recipe.missedIngredientCount || 0;
                const totalCount = usedCount + missedCount;
                const matchPercentage = totalCount > 0 ? (usedCount / totalCount) * 100 : 0;

                const matched = recipe.usedIngredients?.map((ing: any) => ing.name) || [];
                const missing = recipe.missedIngredients?.map((ing: any) => ing.name) || [];

                return {
                    id: recipe.id?.toString() || '',
                    title: recipe.title || 'Untitled Recipe',
                    image: recipe.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
                    totalTime: '',
                    difficulty: '',
                    source: 'api' as const,
                    matchPercentage: matchPercentage,
                    matchedIngredients: matched,
                    missingIngredients: missing
                };
            });

            const filteredRecipes = transformedRecipes.filter(r => r.matchPercentage && r.matchPercentage >= 50);

            console.log(`✅ Found ${filteredRecipes.length} API recipes`);
            setDiscoverRecipes(filteredRecipes);

            return filteredRecipes;
        } catch (error) {
            console.error('❌ Error:', error);
            setDiscoverRecipes([]);
            return [];
        } finally {
            if (!skipLoading) setLoading(false);
        }
    };

    const handleGeminiDetectionResults = async (ingredients: string[]) => {
        console.log('🎯 Handling Gemini results:', ingredients);

        setShowGeminiModal(false);
        setLoading(true);

        try {
            setSearchQuery('');

            const [dbRecipes, apiRecipes] = await Promise.all([
                searchDatabaseRecipesByIngredients(ingredients, true),
                searchAPIRecipesByIngredients(ingredients, true)
            ]);

            console.log('📊 DB Recipes:', dbRecipes.length);
            console.log('📊 API Recipes:', apiRecipes.length);

            const totalRecipes = dbRecipes.length + apiRecipes.length;

            if (totalRecipes === 0) {
                setLoading(false);
                Alert.alert(
                    'No Matching Recipes',
                    'No recipes found with 50%+ match. Try adding more ingredients.',
                    [{ text: 'OK' }]
                );
                return;
            }

            const allRecipes = [...dbRecipes, ...apiRecipes];
            const missingIngredientsSummary = allRecipes.map((recipe: any) => ({
                recipeName: recipe.title,
                matched: recipe.matchedIngredients || [],
                missing: recipe.missingIngredients || [],
                matchPercentage: recipe.matchPercentage || 0,
                image: recipe.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
                source: recipe.source,
                recipeData: recipe // Full recipe data for navigation
            }));

            // ADD THIS DEBUG LOG
            console.log('🎨 Missing Ingredients Summary:', JSON.stringify(missingIngredientsSummary, null, 2));

            setComparisonData({
                detectedIngredients: ingredients,
                createdRecipesCount: dbRecipes.length,
                apiRecipesCount: apiRecipes.length,
                missingIngredientsSummary
            });

            setLoading(false);
            console.log('✅ About to show comparison modal');

            setTimeout(() => {
                setShowComparisonModal(true);
            }, 100);

        } catch (error) {
            console.error('❌ Error:', error);
            setLoading(false);
            Alert.alert('Error', 'Failed to search recipes.');
        }
    };

    // Update displayed recipes when tab or recipes change
    useEffect(() => {
        if (tab === 'createdRecipe') {
            setDisplayedRecipes(myRecipes);
        } else if (tab === 'apiRecipe') {
            setDisplayedRecipes(discoverRecipes);
        } else if (tab === 'all') {
            setDisplayedRecipes([...myRecipes, ...discoverRecipes]);
        }

        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }, [tab, myRecipes, discoverRecipes]);

    useEffect(() => {
        if (searchQuery.trim().length === 0) {
            return;
        }

        const timeout = setTimeout(() => {
            if (tab === 'createdRecipe') {
                fetchCreatedRecipes();
            } else if (tab === 'apiRecipe') {
                fetchDiscoverRecipes(false);
            } else if (tab === 'all') {
                Promise.all([fetchCreatedRecipes(), fetchDiscoverRecipes(false)]);
            }
        }, 1000);

        return () => clearTimeout(timeout);
    }, [searchQuery]);

    useFocusEffect(
        React.useCallback(() => {
            // Always refresh created recipes on focus (to show new/deleted recipes)
            // But keep discover recipes cached for better performance
            if (tab === 'createdRecipe') {
                fetchCreatedRecipes();
            } else if (tab === 'apiRecipe') {
                if (!hasFetchedDiscover.current) {
                    fetchDiscoverRecipes(true);
                }
            } else if (tab === 'all') {
                const promises = [];
                // Always refresh created recipes
                promises.push(fetchCreatedRecipes());
                // Cache discover recipes
                if (!hasFetchedDiscover.current) {
                    promises.push(fetchDiscoverRecipes(true));
                }
                if (promises.length > 0) {
                    Promise.all(promises);
                }
            }
        }, [tab])
    );

    const onRefresh = () => {
        setRefreshing(true);
        // Reset cache flags to force fresh data
        if (tab === 'createdRecipe') {
            hasFetchedCreated.current = false;
            fetchCreatedRecipes().finally(() => setRefreshing(false));
        } else if (tab === 'apiRecipe') {
            hasFetchedDiscover.current = false;
            fetchDiscoverRecipes(true).finally(() => setRefreshing(false));
        } else {
            hasFetchedCreated.current = false;
            hasFetchedDiscover.current = false;
            Promise.all([
                fetchCreatedRecipes(),
                fetchDiscoverRecipes(true)
            ]).finally(() => {
                setRefreshing(false);
            });
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        if (tab === 'apiRecipe') {
            fetchDiscoverRecipes(true);
        } else if (tab === 'all') {
            fetchDiscoverRecipes(true);
        }
    };

    return (
        <View className="flex-1"
            style={{ backgroundColor: colors.secondary }}>
            <Header
                title="Search Recipes"
                showBackButton={false}
                onBack={() => navigation.goBack()}
            />

            <View className="border-b border-white pb-2"
                style={{ backgroundColor: colors.secondary }}>
                <View className="flex-row items-center px-4 pt-2">
                    <View className="flex-row items-center bg-white rounded-xl px-3 py-2 flex-1 mr-3">
                        <Ionicons name="search" size={18} color={colors.primary} />
                        <TextInput
                            className="flex-1 ml-2 py-2"
                            placeholder={
                                tab === 'createdRecipe'
                                    ? "Search created recipes..."
                                    : tab === 'apiRecipe'
                                        ? "Search discover recipes..."
                                        : "Search all recipes..."
                            }
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 ? (
                            <TouchableOpacity onPress={clearSearch}>
                                <Ionicons name="close" size={18} color={colors.primary} />
                            </TouchableOpacity>
                        ) : (
                            <View className='flex-row gap-4'>
                                <TouchableOpacity onPress={() => setShowCameraOptionsModal(true)}>
                                    <Entypo name="camera" size={18} color="#FF9966" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    <TouchableOpacity
                        className="w-10 h-10 items-center justify-center rounded-xl bg-white"
                        onPress={() => navigation.navigate('AddRecipe')}
                    >
                        <AntDesign name="plussquareo" size={24} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                <View className="flex-row justify-around mt-3 mx-4 px-2">
                    <TouchableOpacity
                        className='flex-1 py-2.5 rounded-xl'
                        style={{
                            backgroundColor: tab === 'createdRecipe' ? colors.primary : '#fff'
                        }}

                        onPress={() => {
                            setSearchQuery('');
                            setTab('createdRecipe');
                        }}
                    >
                        <Text className={`text-center font-semibold text-sm ${tab === 'createdRecipe' ? 'text-white' : 'text-black'}`}>
                            Created Recipes
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className='flex-1 py-2.5 rounded-xl mx-2'
                        style={{
                            backgroundColor: tab === 'apiRecipe' ? colors.primary : '#fff'
                        }}
                        onPress={() => {
                            setSearchQuery('');
                            setTab('apiRecipe');
                        }}
                    >
                        <Text className={`text-center font-semibold text-sm ${tab === 'apiRecipe' ? 'text-white' : 'text-black'}`}>
                            Discover
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className='flex-1 py-2.5 rounded-xl'
                        style={{
                            backgroundColor: tab === 'all' ? colors.primary : '#fff'
                        }}
                        onPress={() => {
                            setSearchQuery('');
                            setTab('all');
                        }}
                    >
                        <Text className={`text-center font-semibold text-sm ${tab === 'all' ? 'text-white' : 'text-black'}`}>
                            All
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <View className='flex-1 justify-center items-center'
                    style={{ backgroundColor: colors.secondary }}>
                    <ActivityIndicator size='large' color="#FF9966" />
                    <Text className="text-gray-500 mt-3">
                        {searchQuery
                            ? `Searching for "${searchQuery}"...`
                            : tab === 'apiRecipe'
                                ? 'Discovering recipes...'
                                : 'Loading recipes...'}
                    </Text>
                </View>
            ) : (
                <ScrollView
                    ref={scrollViewRef}
                    className="flex-1 px-4 pt-4"
                    style={{ backgroundColor: colors.secondary }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >

                    {displayedRecipes.length > 0 ? (
                        <View className="flex-row flex-wrap justify-between pb-4">
                            {displayedRecipes.map((recipe) => (
                                <RecipeCard key={recipe.id} recipe={recipe} navigation={navigation} />
                            ))}
                        </View>
                    ) : (
                        <View className="flex-1 justify-center items-center py-20">
                            <Ionicons name="restaurant-outline" size={64} color="#D1D5DB" />
                            <Text className="text-gray-400 text-lg mt-4">
                                {searchQuery ? 'No recipes found' : 'No recipes available'}
                            </Text>
                            <Text className="text-gray-400 text-sm mt-1">
                                {searchQuery
                                    ? `No results for "${searchQuery}"`
                                    : tab === 'createdRecipe'
                                        ? 'Create your first recipe!'
                                        : tab === 'apiRecipe'
                                            ? 'Pull to refresh for new recipes'
                                            : 'Start by creating or discovering recipes'}
                            </Text>
                        </View>
                    )}
                </ScrollView>
            )}

            <GeminiTestModal
                visible={showGeminiModal}
                onClose={() => setShowGeminiModal(false)}
                onIngredientsDetected={handleGeminiDetectionResults}
            />

            {comparisonData && (
                <RecipeComparisonModal
                    visible={showComparisonModal}
                    onClose={() => {
                        setShowComparisonModal(false);
                        // Clear comparison data when modal closes
                        setComparisonData(null);
                    }}
                    onProceed={() => {
                        // User clicked "View All Recipes" - show recipes in main screen
                        if (comparisonData?.missingIngredientsSummary) {
                            const allRecipes = comparisonData.missingIngredientsSummary
                                .map((item: any) => item.recipeData)
                                .filter((recipe: any): recipe is Recipe => recipe !== undefined);
                            setDisplayedRecipes(allRecipes);
                            setTab('all');
                        }
                        setShowComparisonModal(false);
                    }}
                    onRecipeClick={(recipe) => {
                        setShowComparisonModal(false);
                        setComparisonData(null);
                        navigation.navigate('ViewRecipe', { recipe, viewMode: 'discover' });
                    }}
                    detectedIngredients={comparisonData.detectedIngredients}
                    createdRecipesCount={comparisonData.createdRecipesCount}
                    apiRecipesCount={comparisonData.apiRecipesCount}
                    missingIngredientsSummary={comparisonData.missingIngredientsSummary}
                />
            )}

            {/* Camera Options Modal */}
            <CameraOptionsModal
                visible={showCameraOptionsModal}
                onClose={() => setShowCameraOptionsModal(false)}
                onSuggestRecipe={() => setShowGeminiModal(true)}
                onCountCalories={() => setShowCalorieModal(true)}
            />

            {/* Calorie Count Modal */}
            <CalorieCountModal
                visible={showCalorieModal}
                onClose={() => setShowCalorieModal(false)}
            />
        </View>
    )
}