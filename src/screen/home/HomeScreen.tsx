import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, FlatList, Alert, ActivityIndicator } from 'react-native';
import { Ionicons, Feather, Fontisto } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NavigationProps } from '~/navigation/AppStack';
import { useAuth } from '~/context/AuthContext';
import { fetchRecipes } from '~/api/spoonacular';
import colors from '~/utils/color';

const categories = ['All', 'Asian', 'Italian', 'Indian', 'Chinese', 'Mexican'];
const ingredients = ['Chicken', 'Tomato', 'Curry', 'Salad', 'Chilli', 'Onion'];

// --- FEATURED RECIPE CARD ---
const FeaturedRecipeCard = ({ recipe }: { recipe: any }) => (
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
                    <TouchableOpacity className="bg-white p-2 rounded-lg ml-2">
                        <Feather name="bookmark" size={14} color="gray" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </View>
);

// --- HOME SCREEN ---
export const HomeScreen = () => {
    const [activeCategory, setActiveCategory] = useState('All');
    const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
    const [recipes, setRecipes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const navigation = useNavigation<NavigationProps>();
    const { user } = useAuth();

    const profileImage = user?.profileImage;
    const username = user?.username;

    const displayedRecipes = recipes.slice(0, 10);
    const finalData = [...displayedRecipes, { id: 'see-more', type: 'seeMore' }];

    // --- LOAD RECIPES ---
    const loadRecipes = async () => {
        try {
            setLoading(true);
            const results = await fetchRecipes(activeCategory, 30);

            const recipesData =
                activeCategory === 'All' ? results.recipes || [] : results.results || [];

            const transformedRecipes = recipesData.map((recipe: any, index: number) => ({
                id: recipe.id?.toString() || index.toString(),
                title: recipe.title || 'Untitled Recipe',
                image: recipe.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
                time: recipe.readyInMinutes ? `${recipe.readyInMinutes} Mins` : 'N/A',
            }));

            setRecipes(transformedRecipes);
        } catch (error) {
            console.error('Error fetching recipes:', error);
            Alert.alert('Error', 'Failed to fetch recipes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRecipes();
    }, [activeCategory]);

    // --- HANDLE CATEGORY SELECTION ---
    const toggleIngredient = (ingredient: string) => {
        setSelectedIngredients(prev =>
            prev.includes(ingredient) ? prev.filter(i => i !== ingredient) : [...prev, ingredient]
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View style={{ flex: 1, overflow: 'visible' }}>
                {loading ? (
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="large" color="#FF9966" />
                    </View>
                ) : (
                    <ScrollView className="px-2 pt-4" showsVerticalScrollIndicator={false}>
                        {/* HEADER */}
                        <View className="flex-row justify-between px-4">
                            <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
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
                                    const isSelected = selectedIngredients.includes(ingredient);
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

                            <FlatList
                                data={finalData}
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
                                        <FeaturedRecipeCard recipe={item} />
                                    )
                                }
                            />
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

                                <FlatList
                                    data={finalData}
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
                                            <FeaturedRecipeCard recipe={item} />
                                        )
                                    }
                                />
                            </View>
                        </View>
                    </ScrollView>
                )}
            </View>
        </SafeAreaView>
    );
};
