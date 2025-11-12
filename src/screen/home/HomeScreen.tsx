import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, FlatList, Alert, ActivityIndicator } from 'react-native';
import { Ionicons, Feather, Fontisto } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NavigationProps } from '~/navigation/AppStack';
import { useAuth } from '~/context/AuthContext';
import { fetchRecipes, fetchRecipesByIngredients } from '~/api/spoonacular';
import { saveApiRecipe, unsaveRecipe } from '~/controller/recipe';
import colors from '~/utils/color';

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
            <View className="rounded-2xl p-4 h-full relative" style={{ backgroundColor: colors.lightPeach }}>
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
                        style={{backgroundColor: isSaved ? "#FF9966" : "white"}} onPress={onSave}>
                           <Feather name="bookmark" size={14} color={isSaved ? "white" : "#FF9966"} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    </TouchableOpacity>
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
    const [showModal, setShowModal] = useState<boolean>(false);
    const [hasChanges, setHasChanges] = useState<boolean>(false);
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [isSaved, setIsSaved] = useState<boolean>(false);
    const [savedRecipes, setSavedRecipes] = useState<Record<string, boolean>>({});
    const [showLoadingModal, setShowLoadingModal] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>("Loading...");


    const navigation = useNavigation<NavigationProps>();
    const { user } = useAuth();

    const profileImage = user?.profileImage;
    const username = user?.username;

    // Display data for ingredients section
    const displayedIngredientRecipes = ingredientRecipes.slice(0, 10);
    const ingredientFinalData = [...displayedIngredientRecipes, { id: 'see-more-ingredients', type: 'seeMore' }];

    // Display data for categories section
    const displayedCategoryRecipes = categoryRecipes.slice(0, 10);
    const categoryFinalData = [...displayedCategoryRecipes, { id: 'see-more-categories', type: 'seeMore' }];

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
            const results = await fetchRecipes(activeCategory, 30);

            const recipesData =
                activeCategory === 'All' ? results.recipes || [] : results.results || [];

            const transformedRecipes = recipesData.map((recipe: any, index: number) => ({
                id: recipe.id?.toString() || index.toString(),
                title: recipe.title || 'Untitled Recipe',
                image: recipe.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
                time: recipe.readyInMinutes ? `${recipe.readyInMinutes} Mins` : 'N/A',
            }));

            setCategoryRecipes(transformedRecipes);
            console.log('Loaded recipes for category:', categoryRecipes);
        } catch (error) {
            console.error('Error fetching recipes:', error);
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
            console.error('Error fetching recipes by ingredients:', error);
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

    // --- HANDLE RECIPE CARD PRESS (Navigate to ViewRecipe) ---
    const handleRecipePress = (recipe: any) => {
    console.log('Navigating to ViewRecipe with recipe:', recipe);
    navigation.navigate('ViewRecipe', { recipe });
};

const handleSaveRecipe = async (recipe: any) => {
    setLoadingMessage(`Saving ...`);
    /*setLoadingMessage(`Saving "${recipe.title.substring(0, 20)}..."`); */
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

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.white }}>
        <View style={{ flex: 1, overflow: 'visible' }}>
            {initialLoading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#FF9966" />
                </View>
            ) : (
                <ScrollView className="px-2 pt-4" showsVerticalScrollIndicator={false}>
                    {/* ALL YOUR EXISTING CONTENT */}
                    {/* HEADER */}
                    <View className="flex-row justify-between px-4">
                        <TouchableOpacity onPress={() => navigation.navigate('Profile', {})}>
                            <View
                                className="w-16 h-16 rounded-full items-center justify-center border-line"
                                style={{ backgroundColor: colors.white, borderWidth: 2, borderColor: colors.lightBrown }}
                            >
                                {profileImage ? (
                                    <Image source={{ uri: profileImage }} className="w-16 h-16 rounded-full" />
                                ) : (
                                    <Fontisto name="male" size={24} color={colors.lightBrown} />
                                )}
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity className="p-2 rounded-lg" onPress={() => navigation.navigate('Setting')}>
                            <Ionicons name="settings" size={24} color="#FF9966" />
                        </TouchableOpacity>
                    </View>

                    {/* GREETING */}
                    <View className="mt-4 px-4">
                        <Text className="text-3xl font-bold text-gray-800">
                            Hello {username || 'Guest'}
                        </Text>
                        <Text className="text-gray-500 mt-1">What are we cooking today?</Text>
                    </View>

                    {/* SEARCH BY INGREDIENTS */}
                    <View className="rounded-2xl justify-between mt-6 mb-4" style={{ backgroundColor: colors.creamWhite }}>
                        <View className="flex-row justify-between px-4 pt-4">
                            <Text className="text-2xl font-semibold text-gray-800">Search By Ingredients</Text>
                            <TouchableOpacity>
                                <Text className="text-2xl font-semibold">Add</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
                        >
                            {ingredients.map((ingredient, idx) => {
                                const isSelected = tempSelectedIngredients.includes(ingredient);
                                return (
                                    <TouchableOpacity
                                        key={idx}
                                        onPress={() => toggleIngredient(ingredient)}
                                        className={`mr-3 px-3 py-2 rounded-full ${isSelected ? 'bg-orange-400' : 'bg-gray-100'}`}
                                    >
                                        <Text className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-600'}`}>
                                            {ingredient}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* INGREDIENTS RECIPES SECTION */}
                        <View style={{ position: 'relative', minHeight: 280 }}>
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
                                </>
                            )}

                            {/* LOCAL MODAL */}
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
                    <View className="rounded-2xl mt-6 mb-4" style={{ backgroundColor: colors.creamWhite }}>
                        <Text className="text-2xl font-semibold text-gray-800 mb-3 px-4 pt-4">Categories</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 16 }}
                        >
                            {categories.map(category => (
                                <TouchableOpacity
                                    key={category}
                                    className={`mr-3 px-3 py-2 rounded-full ${activeCategory === category ? 'bg-orange-400' : 'bg-gray-100'}`}
                                    onPress={() => setActiveCategory(category)}
                                >
                                    <Text className={`font-semibold ${activeCategory === category ? 'text-white' : 'text-gray-600'}`}>
                                        {category}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View className="pt-4 pb-4 rounded-3xl p-2">
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
                </ScrollView>
            )}
            
            {/* 🔥 CRITICAL: ADD THIS LINE - LoadingModal Component 🔥 */}
            <LoadingModal visible={showLoadingModal} message={loadingMessage} />
        </View>
    </SafeAreaView>
);
};