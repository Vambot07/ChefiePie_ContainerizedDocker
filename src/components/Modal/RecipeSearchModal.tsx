// components/RecipeSearchModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    ScrollView, 
    ActivityIndicator, 
    Image, 
    Alert, 
    Pressable, 
    TextInput 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchRecipes } from '~/controller/recipe';

interface Recipe {
    id: string;
    title: string;
    image: string;
    totalTime?: string;
    difficulty?: string;
    source?: 'created' | 'api';
}

interface RecipeSearchModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectRecipes: (recipes: Recipe[]) => void;
    selectedRecipeIds?: string[];
    alreadyAddedIds?: string[];
}

export default function RecipeSearchModal({ 
    visible, 
    onClose, 
    onSelectRecipes,
    selectedRecipeIds = [],
    alreadyAddedIds = []
}: RecipeSearchModalProps) {
    const [tab, setTab] = useState<'createdRecipe' | 'apiRecipe' | 'all'>('createdRecipe');
    const [searchQuery, setSearchQuery] = useState('');
    const [myRecipes, setMyRecipes] = useState<Recipe[]>([]);
    const [discoverRecipes, setDiscoverRecipes] = useState<Recipe[]>([]);
    const [displayedRecipes, setDisplayedRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedRecipes, setSelectedRecipes] = useState<string[]>(selectedRecipeIds);
    const [addingRecipes, setAddingRecipes] = useState(false);

    const scrollViewRef = useRef<ScrollView>(null);

    // Fetch created recipes
    const fetchCreatedRecipes = async () => {
        try {
            setLoading(true);
            const results = await searchRecipes(searchQuery);
            const transformedRecipes = results.map((recipe: any) => ({
                ...recipe,
                source: 'created' as const
            }));
            setMyRecipes(transformedRecipes as Recipe[]);
        } catch (error) {
            console.error('Error fetching user recipes:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch API recipes
    const fetchDiscoverRecipes = async (forceRandom = false) => {
        try {
            setLoading(true);
            let results;
            
            if (searchQuery.trim().length > 0 && !forceRandom) {
                const response = await fetch(
                    `https://api.spoonacular.com/recipes/complexSearch?apiKey=${process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY}&query=${searchQuery}&number=20&addRecipeInformation=true`
                );
                const data = await response.json();
                results = { results: data.results || [] };
            } else {
                const response = await fetch(
                    `https://api.spoonacular.com/recipes/random?apiKey=${process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY}&number=20`
                );
                const data = await response.json();
                results = { results: data.recipes || [] };
            }
            
            const recipesData = results.results || [];
            const transformedRecipes = recipesData.map((recipe: any) => ({
                id: recipe.id?.toString() || '',
                title: recipe.title || 'Untitled Recipe',
                image: recipe.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
                totalTime: recipe.readyInMinutes ? `${recipe.readyInMinutes}` : '',
                difficulty: '',
                source: 'api' as const
            }));
            
            setDiscoverRecipes(transformedRecipes);
        } catch (error) {
            console.error('Error fetching discover recipes:', error);
        } finally {
            setLoading(false);
        }
    };

    // Update displayed recipes
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

    // Search with debounce
    useEffect(() => {
        if (searchQuery.trim().length === 0) return;

        const timeout = setTimeout(() => {
            if (tab === 'createdRecipe' || tab === 'all') {
                fetchCreatedRecipes();
            }
            if (tab === 'apiRecipe' || tab === 'all') {
                fetchDiscoverRecipes(false);
            }
        }, 1000);
        
        return () => clearTimeout(timeout);
    }, [searchQuery, tab]);

    // Load initial data
    useEffect(() => {
        if (visible) {
            setSelectedRecipes([]); // Reset selection when modal opens
            if (tab === 'createdRecipe') {
                fetchCreatedRecipes();
            } else if (tab === 'apiRecipe') {
                fetchDiscoverRecipes(true);
            } else if (tab === 'all') {
                Promise.all([fetchCreatedRecipes(), fetchDiscoverRecipes(true)]);
            }
        }
    }, [visible, tab]);

    // Toggle recipe selection
    const toggleRecipeSelection = (recipeId: string) => {
        // Check if already added
        if (alreadyAddedIds.includes(recipeId)) {
            Alert.alert(
                'Recipe Already Added',
                'This recipe is already in your meal plan for this day.',
                [{ text: 'OK' }]
            );
            return;
        }

        setSelectedRecipes(prev => {
            if (prev.includes(recipeId)) {
                return prev.filter(id => id !== recipeId);
            } else {
                return [...prev, recipeId];
            }
        });
    };

    // Handle add recipes
    const handleAddRecipes = async () => {
        const recipesToAdd = displayedRecipes.filter(recipe => 
            selectedRecipes.includes(recipe.id)
        );
        
        setAddingRecipes(true); // ✅ Start loading
        
        try {
            await onSelectRecipes(recipesToAdd); // Make it await
            setSelectedRecipes([]);
            setSearchQuery('');
            onClose();
        } catch (error) {
            console.error('Error adding recipes:', error);
            Alert.alert('Error', 'Failed to add recipes');
        } finally {
            setAddingRecipes(false); // ✅ Stop loading
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        if (tab === 'apiRecipe' || tab === 'all') {
            fetchDiscoverRecipes(true);
        }
    };

    if (!visible) return null;

    return (
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
                onPress={onClose} 
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
                    <Text className="text-white font-bold text-lg">Search Recipes</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View className="px-5 py-3 border-b border-gray-200">
                    <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
                        <Ionicons name="search" size={18} color="#FF9966" />
                        <TextInput
                            className="flex-1 ml-2 py-2"
                            placeholder="Search recipes..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={clearSearch}>
                                <Ionicons name="close" size={18} color="#FF9966" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Tabs */}
                <View className="flex-row justify-around px-5 py-3 border-b border-gray-200">
                    <TouchableOpacity
                        className={`flex-1 py-2 rounded-xl ${tab === 'createdRecipe' ? 'bg-orange-500' : 'bg-gray-100'}`}
                        onPress={() => { setSearchQuery(''); setTab('createdRecipe'); }}
                    >
                        <Text className={`text-center font-semibold text-xs ${tab === 'createdRecipe' ? 'text-white' : 'text-gray-600'}`}>
                            Created
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        className={`flex-1 py-2 rounded-xl mx-2 ${tab === 'apiRecipe' ? 'bg-orange-500' : 'bg-gray-100'}`}
                        onPress={() => { setSearchQuery(''); setTab('apiRecipe'); }}
                    >
                        <Text className={`text-center font-semibold text-xs ${tab === 'apiRecipe' ? 'text-white' : 'text-gray-600'}`}>
                            Discover
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        className={`flex-1 py-2 rounded-xl ${tab === 'all' ? 'bg-orange-500' : 'bg-gray-100'}`}
                        onPress={() => { setSearchQuery(''); setTab('all'); }}
                    >
                        <Text className={`text-center font-semibold text-xs ${tab === 'all' ? 'text-white' : 'text-gray-600'}`}>
                            All
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Recipes List */}
                <ScrollView 
                    ref={scrollViewRef}
                    className="px-5 py-4"
                    showsVerticalScrollIndicator={false}
                >
                    {loading ? (
                        <View className="py-16 items-center justify-center">
                            <ActivityIndicator size="large" color="#F97316" />
                            <Text className="text-gray-500 mt-4">
                                {searchQuery ? `Searching for "${searchQuery}"...` : 'Loading recipes...'}
                            </Text>
                        </View>
                    ) : displayedRecipes.length === 0 ? (
                        <View className="py-12 items-center">
                            <Ionicons name="restaurant-outline" size={48} color="#D1D5DB" />
                            <Text className="text-gray-500 mt-3 text-center">No recipes found</Text>
                            <Text className="text-gray-400 text-sm mt-1 text-center">
                                {searchQuery ? `No results for "${searchQuery}"` : 'Try searching for something'}
                            </Text>
                        </View>
                    ) : (
                        displayedRecipes.map((recipe) => {
                            const isSelected = selectedRecipes.includes(recipe.id);
                            const alreadyInPlan = alreadyAddedIds.includes(recipe.id);
                            
                            return (
                                <TouchableOpacity
                                    key={recipe.id}
                                    className={`flex-row items-center py-3 border-b border-gray-100 ${alreadyInPlan ? 'opacity-50' : ''}`}
                                    onPress={() => toggleRecipeSelection(recipe.id)}
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
                                            {recipe.source === 'created' && (
                                                <View className="bg-blue-100 px-2 py-0.5 rounded-full mr-2">
                                                    <Text className="text-blue-600 text-xs font-medium">Created</Text>
                                                </View>
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
                                            className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                                                isSelected
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

                {/* Footer with Add Button */}
                {!loading && displayedRecipes.length > 0 && (
                <View className="px-5 py-4 border-t border-gray-200">
                    <TouchableOpacity
                        style={{
                            backgroundColor: selectedRecipes.length > 0 && !addingRecipes ? '#F97316' : '#D1D5DB',
                        }}
                        className="py-3 rounded-xl"
                        onPress={handleAddRecipes}
                        disabled={selectedRecipes.length === 0 || addingRecipes} // ✅ Disable when adding
                    >
                        {addingRecipes ? ( // ✅ Show loading indicator
                            <View className="flex-row items-center justify-center">
                                <ActivityIndicator size="small" color="white" />
                                <Text className="text-white text-center font-bold ml-2">
                                    Adding recipes...
                                </Text>
                            </View>
                        ) : (
                            <Text className="text-white text-center font-bold">
                                Add {selectedRecipes.length > 0 ? `(${selectedRecipes.length})` : ''} Recipe{selectedRecipes.length !== 1 ? 's' : ''}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
            </View>
        </View>
    );
}