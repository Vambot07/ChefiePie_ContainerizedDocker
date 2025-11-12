import { View, Text, TouchableOpacity, ScrollView, Image, Alert, RefreshControl, ActivityIndicator } from 'react-native'
import { useState, useCallback } from 'react'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { getSavedRecipes } from '~/controller/recipe'
import Header from '../../components/Header'
import { Ionicons } from '@expo/vector-icons'

// Add navigation type
type RootStackParamList = {
    AddRecipe: undefined;
    ViewSavedRecipe: { recipeId: string };
};
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Recipe {
    id: string;
    title: string;
    image: string;
    totalTime?: string;
    difficulty?: string;
}

interface RecipeCardProps {
    recipe: Recipe;
    navigation: NavigationProp;
}

const RecipeCard = ({ recipe, navigation }: RecipeCardProps) => (
    <TouchableOpacity className="bg-white rounded-2xl mb-4 overflow-hidden shadow-sm" onPress={() => navigation.navigate('ViewSavedRecipe', { recipeId: recipe.id })}>
        <Image
            source={{ uri: recipe.image }}
            className="w-full h-36"
        />
        <View className="p-4">
            <Text className="font-bold text-base text-gray-800 mb-1" numberOfLines={1}>{recipe.title}</Text>
            <View className="flex-row items-center justify-between">
                <View className="flex-row items-center space-x-2">
                    <Text className="text-sm font-bold text-gray-500">See More</Text>
                </View>
            </View>
        </View>
    </TouchableOpacity>
);

export default function SavedScreen() {
    const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const navigation = useNavigation<NavigationProp>();

    const fetchSavedRecipes = useCallback(async () => {
        setLoading(true);
        try {
            const results = await getSavedRecipes();
            setSavedRecipes(results as Recipe[]);
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch saved recipes');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchSavedRecipes();
        }, [fetchSavedRecipes])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchSavedRecipes();
    };

    return (
        <View className="flex-1 bg-gray-50">
            <Header
                title="Saved Recipes"
                showBackButton={false}
            />

            {loading ? (
                <View className="flex-1 bg-gray-150 justify-center items-center">
                    <ActivityIndicator size="large" color="#FFB47B" />
                </View>
            ) : savedRecipes.length > 0 ? (
                <ScrollView
                    className="flex-1 px-4 pt-4"
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {savedRecipes.map((recipe) => (
                        <RecipeCard key={recipe.id} recipe={recipe} navigation={navigation} />
                    ))}
                </ScrollView>
            ) : (
                <View className="flex-1 justify-center items-center p-8">
                    <Ionicons name="bookmark-outline" size={64} color="#D1D5DB" />
                    <Text className="text-xl font-bold text-gray-700 mt-4">No Saved Recipes</Text>
                    <Text className="text-gray-500 text-center mt-2">
                        You haven't saved any recipes yet. Start exploring and save your favorites!
                    </Text>
                </View>
            )}
        </View>
    );
}