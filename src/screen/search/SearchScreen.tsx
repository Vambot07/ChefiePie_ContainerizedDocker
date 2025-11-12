import { View, Text, TouchableOpacity, TextInput, ScrollView, Image, Alert, RefreshControl, ActivityIndicator } from 'react-native'
import React, { useState, useEffect } from 'react'
import { Entypo, Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AntDesign from '@expo/vector-icons/AntDesign';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { searchRecipes } from '~/controller/recipe';
import { fetchRecipes } from '~/api/spoonacular'; // Import Spoonacular API
import Header from '../../components/Header';

// Add navigation type
type RootStackParamList = {
    AddRecipe: undefined;
    ViewRecipe: { recipe: Recipe };
};
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Recipe {
    id: string;
    title: string;
    image: string;
    totalTime?: string;
    difficulty?: string;
    source?: 'created' | 'api'; 
}

const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert('Camera permission is required!');
        return;
    }
    const result = await ImagePicker.launchCameraAsync({ 
        mediaTypes: ImagePicker.MediaTypeOptions.Images, 
        allowsEditing: true, 
        quality: 1 
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log(result.assets[0].uri);
    }
};

interface RecipeCardProps {
    recipe: Recipe;
    navigation: NavigationProp;
}

const RecipeCard = ({ recipe, navigation }: RecipeCardProps) => {
    const [loading, setLoading] = useState(true);

    return (
        <TouchableOpacity 
            className="bg-white rounded-xl shadow-sm mb-4 w-[48%]" 
            onPress={() => navigation.navigate('ViewRecipe', { recipe })}
        >
            <View className="w-full h-32 rounded-t-xl bg-gray-200 justify-center items-center">
                {/* Spinner centered */}
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
                />
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
};


export default function SearchScreen() {
    const [tab, setTab] = useState<'createdRecipe' | 'apiRecipe' | 'all'>('createdRecipe');
    const [searchQuery, setSearchQuery] = useState('');
    const [myRecipes, setMyRecipes] = useState<Recipe[]>([]);
    const [discoverRecipes, setDiscoverRecipes] = useState<Recipe[]>([]);
    const [displayedRecipes, setDisplayedRecipes] = useState<Recipe[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const navigation = useNavigation<NavigationProp>();  
    const [loading, setLoading] = useState<boolean>(false);
    
    // ADD THIS: Create ref for ScrollView
    const scrollViewRef = React.useRef<ScrollView>(null);

    // Fetch user's created recipes
    const fetchCreatedRecipes = async () => {
        try {
            setLoading(true);
            console.log('Fetching user recipes...');
            const results = await searchRecipes(searchQuery);
            
            const transformedRecipes = results.map((recipe: any) => ({
                ...recipe,
                source: 'created' as const
            }));
            
            setMyRecipes(transformedRecipes as Recipe[]);
        } catch (error) {
            console.error('Error fetching user recipes:', error);
            Alert.alert('Error', 'Failed to fetch your recipes');
        } finally {
            setLoading(false);
        }
    };

    // Fetch recipes from Spoonacular API
    const fetchDiscoverRecipes = async (forceRandom = false) => {
        try {
            setLoading(true);
            console.log('Fetching discover recipes from API...');
            
            let results;
            if (searchQuery.trim().length > 0 && !forceRandom) {
                console.log('Searching API for:', searchQuery);
                const response = await fetch(
                    `https://api.spoonacular.com/recipes/complexSearch?apiKey=${process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY}&query=${searchQuery}&number=20&addRecipeInformation=true`
                );
                const data = await response.json();
                results = { results: data.results || [] };
            } else {
                console.log('Fetching random recipes');
                results = await fetchRecipes('All', 20);
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
        } catch (error) {
            console.error('Error fetching discover recipes:', error);
            Alert.alert('Error', 'Failed to fetch discover recipes');
        } finally {
            setLoading(false);
        }
    };

    // Update displayed recipes based on active tab
    useEffect(() => {
        if (tab === 'createdRecipe') {
            setDisplayedRecipes(myRecipes);
        } else if (tab === 'apiRecipe') {
            setDisplayedRecipes(discoverRecipes);
        } else if (tab === 'all') {
            setDisplayedRecipes([...myRecipes, ...discoverRecipes]);
        }
        
        // RESET SCROLL POSITION when tab changes
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }, [tab, myRecipes, discoverRecipes]);

    // Search effect - with debounce
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

    // CONSOLIDATED: Handle initial load when screen mounts or tab changes
    useFocusEffect(
        React.useCallback(() => {
            if (tab === 'createdRecipe') {
                if (myRecipes.length === 0 || searchQuery.trim().length > 0) {
                    fetchCreatedRecipes();
                }
            } else if (tab === 'apiRecipe') {
                if (discoverRecipes.length === 0) {
                    fetchDiscoverRecipes(true);
                }
            } else if (tab === 'all') {
                const promises = [];
                if (myRecipes.length === 0 || searchQuery.trim().length > 0) {
                    promises.push(fetchCreatedRecipes());
                }
                if (discoverRecipes.length === 0) {
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
        if (tab === 'createdRecipe') {
            fetchCreatedRecipes().finally(() => setRefreshing(false));
        } else if (tab === 'apiRecipe') {
            fetchDiscoverRecipes(true).finally(() => setRefreshing(false));
        } else {
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
        <View className="flex-1 bg-gray-50">
            <Header
                title="Search Recipes"
                showBackButton={false}
                onBack={() => navigation.goBack()}
            />

            {/* Search Bar */}
            <View className="bg-white border-b border-gray-100 pb-2">
                <View className="flex-row items-center px-4 pt-2">
                    <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2 flex-1 mr-3">
                        <Ionicons name="search" size={18} color="#FF9966" />
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
                                <Ionicons name="close" size={18} color="#FF9966" />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={takePhoto}>
                                <Entypo name="camera" size={18} color="#FF9966" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity
                        className="w-10 h-10 items-center justify-center rounded-xl bg-gray-100"
                        onPress={() => navigation.navigate('AddRecipe')}
                    >
                        <AntDesign name="plussquareo" size={24} color="#FF9966" />
                    </TouchableOpacity>
                </View>

                {/* TABS */}
                <View className="flex-row justify-around mt-3 mx-4 px-2">
                    <TouchableOpacity
                        className={`flex-1 py-2.5 rounded-xl ${tab === 'createdRecipe' ? 'bg-[#FF9966]' : 'bg-gray-100'}`}
                        onPress={() => {
                            setSearchQuery('');
                            setTab('createdRecipe');
                        }}
                    >
                        <Text className={`text-center font-semibold text-sm ${tab === 'createdRecipe' ? 'text-white' : 'text-gray-600'}`}>
                            Created Recipes
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        className={`flex-1 py-2.5 rounded-xl mx-2 ${tab === 'apiRecipe' ? 'bg-[#FF9966]' : 'bg-gray-100'}`}
                        onPress={() => {
                            setSearchQuery('');
                            setTab('apiRecipe');
                        }}
                    >
                        <Text className={`text-center font-semibold text-sm ${tab === 'apiRecipe' ? 'text-white' : 'text-gray-600'}`}>
                            Discover
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        className={`flex-1 py-2.5 rounded-xl ${tab === 'all' ? 'bg-[#FF9966]' : 'bg-gray-100'}`}
                        onPress={() => {
                            setSearchQuery('');
                            setTab('all');
                        }}
                    >
                        <Text className={`text-center font-semibold text-sm ${tab === 'all' ? 'text-white' : 'text-gray-600'}`}>
                            All
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Recipe Grid */}
            {loading ? (
                <View className='flex-1 bg-gray-50 justify-center items-center'>
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
                    ref={scrollViewRef} // ADD REF HERE
                    className="flex-1 bg-gray-50 px-4 pt-4"
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
        </View>
    )
}