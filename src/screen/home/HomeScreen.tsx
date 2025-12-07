import { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, FlatList, Alert, ActivityIndicator, Pressable, TextInput, Modal } from 'react-native';
import { Ionicons, Feather, Fontisto } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NavigationProps } from '~/navigation/AppStack';
import { useAuth } from '~/context/AuthContext';
import {
    fetchRecipesByCategory,
    fetchRecipesByIngredients,
    fetchRecipeById
} from '~/api/spoonacular';
import { saveApiRecipe, unsaveRecipe } from '~/controller/recipe';
import colors from '~/utils/color';
import SpoonacularChatbot from '~/components/partials/SpooncularChatBot'; // ✅ Import chatbot component

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

    // --- HANDLE RECIPE CARD PRESS WITH FULL DETAILS FETCH ---
    const handleRecipePress = async (recipe: any) => {
        console.log('Fetching full details for recipe:', recipe.id);

        setLoadingMessage("Loading recipe details...");
        setShowLoadingModal(true);

        try {
            const fullRecipe = await fetchRecipeById(recipe.id);

            if (!fullRecipe) {
                throw new Error('Failed to fetch recipe details');
            }

            const completeRecipe = {
                id: fullRecipe.id?.toString() || recipe.id,
                title: fullRecipe.title || recipe.title,
                image: fullRecipe.image || recipe.image,
                totalTime: fullRecipe.readyInMinutes?.toString() || '30',
                difficulty: '',
                source: 'api' as const,
                servings: fullRecipe.servings || 4,
                ingredients: fullRecipe.extendedIngredients?.map((ing: any) => ing.original) || [],
                instructions: fullRecipe.instructions ||
                    fullRecipe.analyzedInstructions?.[0]?.steps?.map((step: any, idx: number) =>
                        `${idx + 1}. ${step.step}`
                    ).join('\n\n') || 'No instructions available',
                summary: fullRecipe.summary || '',
                cuisines: fullRecipe.cuisines || [],
                dishTypes: fullRecipe.dishTypes || [],
                diets: fullRecipe.diets || [],
            };

            console.log('✅ Complete recipe ready:', completeRecipe.title);
            navigation.navigate('ViewRecipe', { recipe: completeRecipe, viewMode: 'discover' });
        } catch (error) {
            console.error('❌ Error fetching recipe details:', error);
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
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.white }}>
            <View style={{ flex: 1, overflow: 'visible' }}>
                {initialLoading ? (
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="large" color="#FF9966" />
                    </View>
                ) : (
                    <ScrollView className="px-2 pt-4" showsVerticalScrollIndicator={false}>
                        {/* HEADER */}
                        <View className="flex-row justify-between px-4">
                            <TouchableOpacity onPress={() => navigation.navigate('Profile', { userId: userId, viewMode: 'profile' })}>
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
                                <TouchableOpacity onPress={handleShowAddIngredientsModal}>
                                    <Text className="text-2xl font-semibold text-orange-500">Add</Text>
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
                    <SpoonacularChatbot />
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
        </SafeAreaView>
    );
};