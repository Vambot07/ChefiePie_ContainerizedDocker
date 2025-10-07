import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, FlatList, Alert } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NavigationProps } from '~/navigation/AppStack';
import Header from '../../components/Header';
import { useAuth } from '~/context/AuthContext';
import { fetchRecipes } from '~/api/spoonacular';


const categories = ['All', 'Asian', 'Italian', 'Indian', 'Chinese', 'Mexican'];


// --- HELPER COMPONENTS ---

const FeaturedRecipeCard = ({ recipe }: { recipe: any }) => (
    <View className="flex-1 mx-2 mb-4 mt-8">
        <View className="bg-slate-100 rounded-2xl p-4 h-56 relative justify-end">
            <View className="absolute -top-2 left-1/2 -ml-12">
                <Image source={{ uri: recipe.image }} className="w-24 h-24 rounded-full" />
            </View>
            <Text className="text-base font-bold text-gray-800 text-center">
                {recipe.title.length > 20
                    ? recipe.title.substring(0, 20).trim() + '....'
                    : recipe.title}
            </Text>
            <View className="flex-row justify-between items-center mt-4">
                <Text className="text-gray-500 text-sm">Time</Text>
                <TouchableOpacity className="bg-white p-2 rounded-lg">
                    <Feather name="bookmark" size={14} color="gray" />
                </TouchableOpacity>
            </View>
            <Text className="text-gray-800 font-semibold text-sm">{recipe.time}</Text>
        </View>
        {/* <View className="absolute top-2 right-2 bg-white/80 rounded-full px-2 py-1 flex-row items-center">
            <Ionicons name="star" color="#FFC107" size={10} />
            <Text className="text-xs font-bold ml-1">{recipe.rating}</Text>
        </View> */}
    </View>
);



// const NewRecipeCard = ({ recipe }: { recipe: any }) => (
//     <View className="bg-slate-100 rounded-2xl p-4 flex-row items-center mb-4">
//         <View className="flex-1 mr-4">
//             <Text className="font-bold text-gray-800 mb-2">{recipe.title}</Text>
//             <View className="flex-row mb-2">
//                 {[...Array(recipe.rating)].map((_, i) => (
//                     <Ionicons key={i} name="star" color="#FFC107" size={14} />
//                 ))}
//             </View>
//             <View className="flex-row items-center mb-2">
//                 <Image source={{ uri: recipe.authorAvatar }} className="w-6 h-6 rounded-full" />
//                 <Text className="text-xs text-gray-600 ml-2">By {recipe.author}</Text>
//             </View>
//         </View>
//         <View className="items-center">
//             <Image source={{ uri: recipe.image }} className="w-16 h-16 rounded-full mb-2" />
//             <View className="flex-row items-center">
//                 <Ionicons name="time-outline" size={14} color="gray" />
//                 <Text className="text-xs text-gray-600 ml-1">{recipe.time}</Text>
//             </View>
//         </View>
//     </View>
// );


// --- MAIN HOME SCREEN ---

export const HomeScreen = () => {
    const [activeCategory, setActiveCategory] = useState('All');
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation<NavigationProps>();
    const { user } = useAuth();

    const profileImage = user?.profileImage || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836';
    const username = user?.username;

    const loadRecipes = async () => {
        try {
            setLoading(true);
            const results = await fetchRecipes(activeCategory, 30);

            // Handle different response structures
            let recipesData = [];
            if (activeCategory === 'All') {
                // Random recipes endpoint returns { recipes: [...] }
                recipesData = results.recipes || [];
            } else {
                // ComplexSearch endpoint returns { results: [...] }
                recipesData = results.results || [];
            }

            // Transform the API response to match our card format
            const transformedRecipes = recipesData.map((recipe: any, index: number) => ({
                id: recipe.id?.toString() || index.toString(),
                title: recipe.title || 'Untitled Recipe',
                image: recipe.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
                time: recipe.readyInMinutes ? `${recipe.readyInMinutes} Mins` : 'N/A'
            }));

            setRecipes(transformedRecipes);
        } catch (error) {
            console.error('Error fetching recipes:', error);
            Alert.alert('Error', 'Failed to fetch recipes');
        } finally {
            setLoading(false);
        }
    };

    // Load recipes when component mounts or category changes
    useEffect(() => {
        loadRecipes();
    }, [activeCategory]);

    return (
        <SafeAreaView className="flex-1 bg-white">
            {/* TEMPORARY: Migration Button for Admin */}
            {/* <View style={{ padding: 16 }}>
                <TouchableOpacity
                    style={{ backgroundColor: '#FFB47B', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 8 }}
                    onPress={() => navigation.navigate('MigrateImages')}
                >
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Migrate Images (Admin)</Text>
                </TouchableOpacity>
            </View> */}
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View className="px-6 pt-4">
                    <View className="flex-row justify-between items-center">
                        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                            <View className="bg-black rounded-full w-10 h-10 items-center justify-center">
                                <Image source={{ uri: profileImage }} className="w-10 h-10 rounded-full" />
                            </View>
                        </TouchableOpacity>
                        <View className="flex-row items-center space-x-2">
                            <TouchableOpacity className="bg-orange-400 p-2 rounded-lg">
                                <Feather name="sliders" size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View className="mt-4">
                        <Text className="text-3xl font-bold text-gray-800">
                            Hello {username || 'Guest'}
                        </Text>
                        <Text className="text-gray-500 mt-1">What are we cooking today?</Text>
                    </View>
                </View>

                {/* Category Filter */}
                <View className="mt-6">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
                        {categories.map((category) => (
                            <TouchableOpacity
                                key={category}
                                className={`mr-3 px-4 py-2 rounded-lg ${activeCategory === category ? 'bg-orange-400' : 'bg-slate-100'} ${loading ? 'opacity-50' : ''}`}
                                onPress={() => !loading && setActiveCategory(category)}
                                disabled={loading}
                            >
                                <Text className={`font-semibold ${activeCategory === category ? 'text-white' : 'text-gray-600'}`}>
                                    {category}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Featured Recipes */}
                {/* Featured Recipes */}
                <View className="mt-16 px-6">
                    <Text className="text-2xl font-bold text-gray-800 mb-4">
                        {activeCategory === 'All' ? 'Featured Recipes' : `${activeCategory} Recipes`}
                    </Text>
                    {loading ? (
                        <View className="flex-1 justify-center items-center py-8">
                            <Text className="text-gray-500">Loading recipes...</Text>
                        </View>
                    ) : recipes.length > 0 ? (
                        <FlatList
                            data={recipes} // Fixed: was recipes.length
                            keyExtractor={(item: any) => item.id?.toString() || Math.random().toString()} // ---> Check balikk
                            showsVerticalScrollIndicator={false}
                            numColumns={2}
                            columnWrapperStyle={{ justifyContent: 'space-between' }}
                            scrollEnabled={false}
                            renderItem={({ item }) => <FeaturedRecipeCard recipe={item} />}
                        />
                    ) : (
                        <View className="flex-1 justify-center items-center py-8">
                            <Text className="text-gray-600 text-center">
                                Sorry, we have some trouble loading recipes
                            </Text>
                        </View>
                    )}
                </View>

                {/* New Recipes */}
                {/* <View className="mt-8 px-6">
                    <Text className="text-2xl font-bold text-gray-800">New Recipes</Text>
                    <View className="mt-4">
                        {newRecipes.map((recipe) => (
                            <NewRecipeCard key={recipe.id} recipe={recipe} />
                        ))}
                    </View>
                </View> */}
                <View className="h-24" />{/* Spacer for bottom tab bar */}
            </ScrollView>
        </SafeAreaView>
    );
};