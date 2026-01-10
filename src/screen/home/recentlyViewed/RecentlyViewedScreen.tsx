import { View, Text, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Header from '~/components/partials/Header';
import { useAuth } from '~/context/AuthContext';
import { getRecipeById } from '~/controller/recipe';
import { fetchRecipeById } from '~/api/spoonacular';
import colors from '~/utils/color';

type RootStackParamList = {
    ViewRecipe: { recipe: any; viewMode: string };
};
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Recipe {
    id: string;
    title: string;
    image: string;
    time: string;
    source?: 'created' | 'api';  // Track if recipe is created or from API
    viewedAt: string;
}

export default function RecentlyViewedScreen() {
    const [recentlyViewed, setRecentlyViewed] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingRecipe, setLoadingRecipe] = useState(false);
    const navigation = useNavigation<NavigationProp>();
    const { user } = useAuth();
    const userId = user?.uid || user?.userId;

    const loadRecentlyViewed = useCallback(async () => {
        console.log('🔄 Loading recently viewed for userId:', userId);

        if (!userId) {
            console.log('❌ No userId, skipping load');
            setRecentlyViewed([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const key = `recentlyViewed_${userId}`;
            const stored = await AsyncStorage.getItem(key);

            console.log('📦 AsyncStorage key:', key);
            console.log('📦 Stored data exists:', !!stored);

            if (stored) {
                let recipes = JSON.parse(stored);
                let needsMigration = false;

                // Migrate old recipes without source field
                recipes = recipes.map((r: any) => {
                    if (!r.source) {
                        needsMigration = true;
                        // Detect recipe type by ID format
                        // API recipes have numeric IDs (like "654959")
                        // Created recipes have alphanumeric IDs (like "ArW06T5M49Z5U0cJKkIJ")
                        const isNumericId = /^\d+$/.test(r.id);
                        const detectedSource = isNumericId ? 'api' : 'created';

                        console.log(`🔧 Migrating: ${r.title} → ${detectedSource} (ID: ${r.id})`);

                        return {
                            ...r,
                            source: detectedSource
                        };
                    }
                    return r;
                });

                // Save migrated data back to AsyncStorage
                if (needsMigration) {
                    await AsyncStorage.setItem(key, JSON.stringify(recipes));
                    console.log('✅ Migrated recently viewed recipes with source field');
                }

                console.log('✅ Loaded recently viewed recipes:', recipes.length);
                recipes.forEach((r: any, i: number) => {
                    console.log(`   ${i + 1}. ${r.title} (source: ${r.source})`);
                });
                setRecentlyViewed(recipes);
            } else {
                console.log('ℹ️ No recently viewed recipes found');
                setRecentlyViewed([]);
            }
        } catch (error) {
            console.error('❌ Error loading recently viewed:', error);
            setRecentlyViewed([]);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useFocusEffect(
        useCallback(() => {
            loadRecentlyViewed();
        }, [loadRecentlyViewed])
    );

    const handleDeleteRecipe = async (recipeId: string) => {
        Alert.alert(
            'Delete Recipe',
            'Remove this recipe from recently viewed?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (!userId) return;

                            const key = `recentlyViewed_${userId}`;
                            const stored = await AsyncStorage.getItem(key);
                            if (stored) {
                                let recipes = JSON.parse(stored);
                                recipes = recipes.filter((r: Recipe) => r.id !== recipeId);
                                await AsyncStorage.setItem(key, JSON.stringify(recipes));
                                setRecentlyViewed(recipes);
                            }
                        } catch (error) {
                            console.error('Error deleting recipe:', error);
                            Alert.alert('Error', 'Failed to delete recipe');
                        }
                    }
                }
            ]
        );
    };

    const handleClearAll = async () => {
        Alert.alert(
            'Clear All',
            'Delete all recently viewed recipes?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (!userId) return;
                            const key = `recentlyViewed_${userId}`;
                            await AsyncStorage.removeItem(key);
                            setRecentlyViewed([]);
                        } catch (error) {
                            console.error('Error clearing all:', error);
                            Alert.alert('Error', 'Failed to clear history');
                        }
                    }
                }
            ]
        );
    };

    // Helper function to remove a recipe from recently viewed
    const removeFromRecentlyViewed = async (recipeId: string) => {
        try {
            const storageKey = `recentlyViewed_${userId}`;
            const stored = await AsyncStorage.getItem(storageKey);

            if (stored) {
                const recentRecipes: Recipe[] = JSON.parse(stored);
                const updated = recentRecipes.filter(r => r.id !== recipeId);
                await AsyncStorage.setItem(storageKey, JSON.stringify(updated));

                // Update local state to remove from UI immediately
                setRecentlyViewed(updated);
                console.log(`✅ Removed recipe ${recipeId} from recently viewed`);
            }
        } catch (error) {
            console.error('❌ Error removing from recently viewed:', error);
        }
    };

    const handleRecipePress = async (recipe: Recipe) => {
        console.log('Fetching full details for recipe:', recipe.id, 'Source:', recipe.source);

        setLoadingRecipe(true);

        try {
            // Check if it's a created recipe or API recipe
            if (recipe.source === 'created') {
                // Fetch from Firestore (user-created recipes)
                const fullRecipe = await getRecipeById(recipe.id);

                if (!fullRecipe) {
                    // Auto-cleanup: Remove this deleted recipe from recently viewed
                    console.log(`🧹 Recipe ${recipe.id} was deleted, removing from recently viewed`);
                    await removeFromRecentlyViewed(recipe.id);

                    // Show user-friendly message
                    Alert.alert(
                        'Recipe Unavailable',
                        'This recipe has been deleted by its creator.',
                        [{ text: 'OK' }]
                    );
                    setLoadingRecipe(false);
                    return; // Don't navigate
                }

                console.log('✅ Created recipe loaded:', fullRecipe.title);
                navigation.navigate('ViewRecipe', {
                    recipe: fullRecipe,
                    viewMode: 'recentlyViewed'
                });
            } else {
                // Fetch from Spoonacular API
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

                console.log('✅ API recipe loaded:', completeRecipe.title);
                navigation.navigate('ViewRecipe', {
                    recipe: completeRecipe,
                    viewMode: 'recentlyViewed'
                });
            }
        } catch (error) {
            console.error('❌ Error fetching recipe details:', error);
            Alert.alert('Error', 'Failed to load recipe details. Please try again.');
        } finally {
            setLoadingRecipe(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    const renderItem = useCallback(({ item }: { item: Recipe }) => (
        <TouchableOpacity
            className="bg-white rounded-2xl mb-3 overflow-hidden flex-row shadow-sm"
            onPress={() => handleRecipePress(item)}
        >
            <Image
                source={{ uri: item.image }}
                className="w-24 h-24"
                style={{ resizeMode: 'cover' }}
            />
            <View className="flex-1 p-3 justify-between">
                <View>
                    <Text className="font-bold text-base text-gray-800" numberOfLines={1}>
                        {item.title}
                    </Text>
                    <View className="flex-row items-center mt-1">
                        <Ionicons name="time-outline" size={14} color="#FF9966" />
                        <Text className="text-xs text-gray-500 ml-1">{item.time}</Text>
                    </View>
                </View>
                <Text className="text-xs text-gray-400">{formatDate(item.viewedAt)}</Text>
            </View>
            <TouchableOpacity
                className="p-3 justify-center"
                onPress={() => handleDeleteRecipe(item.id)}
            >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
        </TouchableOpacity>
    ), []);

    const keyExtractor = useCallback((item: Recipe) => item.id, []);

    const ListEmptyComponent = useCallback(() => (
        <View className="flex-1 justify-center items-center p-8 mt-20">
            <Ionicons name="time-outline" size={64} color="#D1D5DB" />
            <Text className="text-xl font-bold text-gray-700 mt-4">No Recently Viewed</Text>
            <Text className="text-gray-500 text-center mt-2">
                Recipes you view will appear here
            </Text>
        </View>
    ), []);

    return (
        <View className="flex-1 bg-gray-50"
            style={{ backgroundColor: colors.secondary }}>
            <Header
                title="Recently Viewed"
                showBackButton={true}
                onBack={() => navigation.goBack()}
                rightComponent={
                    recentlyViewed.length > 0 ? (
                        <TouchableOpacity onPress={handleClearAll}>
                            <Text className="text-orange-500 font-semibold">Clear All</Text>
                        </TouchableOpacity>
                    ) : undefined
                }
            />

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#FF9966" />
                </View>
            ) : (
                <FlatList
                    data={recentlyViewed}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, flexGrow: 1 }}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={ListEmptyComponent}
                />
            )}

            {/* Loading Modal */}
            {loadingRecipe && (
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
                            Loading recipe details...
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
}
