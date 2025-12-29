import { View, Text, TouchableOpacity, FlatList, Alert, ActivityIndicator, Image } from 'react-native'
import { useState, useCallback, memo } from 'react'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { getSavedRecipes } from '~/controller/recipe'
import Header from '../../components/partials/Header'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '~/context/AuthContext'

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
    isPrivate?: boolean;
    userId?: string;
}

interface RecipeCardProps {
    recipe: Recipe;
}

const RecipeCard = memo(({ recipe }: RecipeCardProps) => {
    const navigation = useNavigation<NavigationProp>();

    return (
        <TouchableOpacity
            className="bg-white rounded-2xl mb-4 overflow-hidden shadow-sm"
            onPress={() => navigation.navigate('ViewSavedRecipe', { recipeId: recipe.id })}
        >
            <Image
                source={{ uri: recipe.image }}
                className="w-full h-36"
                resizeMode="cover"
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
});

export default function SavedScreen() {
    const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const navigation = useNavigation<NavigationProp>();
    const { user } = useAuth();

    const fetchSavedRecipes = useCallback(async () => {
        setLoading(true);
        try {
            const results = await getSavedRecipes();

            // Filter out private recipes that don't belong to the current user
            const currentUserId = user?.uid;
            const visibleRecipes = (results as Recipe[]).filter(recipe => {
                // Show if recipe is not private
                if (!recipe.isPrivate) return true;

                // Show if recipe is private but belongs to current user
                if (recipe.isPrivate && recipe.userId === currentUserId) return true;

                // Hide if recipe is private and belongs to someone else
                return false;
            });

            setSavedRecipes(visibleRecipes);
            console.log(`✅ Filtered ${results.length - visibleRecipes.length} private recipes from other users`);
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch saved recipes');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            fetchSavedRecipes();
        }, [fetchSavedRecipes])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchSavedRecipes();
    };

    // Optimized callbacks for FlatList
    const keyExtractor = useCallback((item: Recipe) => item.id, []);

    const renderItem = useCallback(({ item }: { item: Recipe }) => (
        <RecipeCard recipe={item} />
    ), []);

    const ListEmptyComponent = useCallback(() => (
        <View className="flex-1 justify-center items-center p-8">
            <Ionicons name="bookmark-outline" size={64} color="#D1D5DB" />
            <Text className="text-xl font-bold text-gray-700 mt-4">No Saved Recipes</Text>
            <Text className="text-gray-500 text-center mt-2">
                You haven't saved any recipes yet. Start exploring and save your favorites!
            </Text>
        </View>
    ), []);

    return (
        <View className="flex-1 bg-gray-50">
            <Header
                title="Saved Recipes"
                showBackButton={false}
            />

            {loading ? (
                <View className="flex-1 bg-gray-150 justify-center items-center">
                    <ActivityIndicator size="large" color="#FFB47B" />
                    <Text className="mt-4 text-gray-600">Loading Saved Recipe...</Text>
                </View>
            ) : (
                <FlatList
                    data={savedRecipes}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, flexGrow: 1 }}
                    showsVerticalScrollIndicator={false}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    ListEmptyComponent={ListEmptyComponent}
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={10}
                    updateCellsBatchingPeriod={50}
                    initialNumToRender={10}
                    windowSize={5}
                />
            )}
        </View>
    );
}