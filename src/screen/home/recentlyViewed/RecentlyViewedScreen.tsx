import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    Image,
    ActivityIndicator,
    Alert,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Header from '~/components/partials/Header';
import ConfirmationModal from '~/components/modal/ConfirmationModal';
import { useAuth } from '~/context/AuthContext';
import { getRecipeById } from '~/controller/recipe';
import { fetchRecipeById } from '~/api/spoonacular';
import colors from '~/utils/color';

/* ------------------------------- Interfaces ------------------------------- */

interface Recipe {
    id: string;
    title: string;
    image: string;
    time: string;
    viewedAt: string;
    source?: 'created' | 'api';
}

type RootStackParamList = {
    ViewRecipe: { recipe: any; viewMode: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/* ------------------------------ Main Screen ------------------------------ */

const RecentlyViewedScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const { user } = useAuth();
    const userId = user?.uid || user?.userId;

    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const [confirmationModal, setConfirmationModal] = useState<{
        visible: boolean;
        type: 'delete' | 'clearAll' | null;
        recipe?: Recipe;
    }>({
        visible: false,
        type: null,
    });

    /* ------------------------------ Fetching ------------------------------ */

    const fetchRecentlyViewed = useCallback(async () => {
        if (!userId) {
            setRecipes([]);
            setLoading(false);
            return;
        }

        try {
            if (!refreshing) setLoading(true);

            const key = `recentlyViewed_${userId}`;
            const stored = await AsyncStorage.getItem(key);

            if (stored) {
                let parsed = JSON.parse(stored);
                let needsMigration = false;

                parsed = parsed.map((r: any) => {
                    if (!r.source) {
                        needsMigration = true;
                        const isNumericId = /^\d+$/.test(r.id);
                        return { ...r, source: isNumericId ? 'api' : 'created' };
                    }
                    return r;
                });

                if (needsMigration) {
                    await AsyncStorage.setItem(key, JSON.stringify(parsed));
                }

                setRecipes(parsed);
            } else {
                setRecipes([]);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to load recently viewed recipes.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [userId, refreshing]);

    useFocusEffect(
        useCallback(() => {
            fetchRecentlyViewed();
        }, [fetchRecentlyViewed])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchRecentlyViewed();
    }, [fetchRecentlyViewed]);

    /* ----------------------------- Confirmation ---------------------------- */

    const showDeleteConfirmation = (recipe: Recipe) => {
        setConfirmationModal({
            visible: true,
            type: 'delete',
            recipe,
        });
    };

    const showClearAllConfirmation = () => {
        setConfirmationModal({
            visible: true,
            type: 'clearAll',
        });
    };

    const closeModal = () => {
        setConfirmationModal({ visible: false, type: null });
    };

    const executeDeleteRecipe = async (recipe: Recipe) => {
        if (!userId) return;

        setActionLoading(`delete-${recipe.id}`);
        const original = [...recipes];
        setRecipes(recipes.filter(r => r.id !== recipe.id));

        try {
            const key = `recentlyViewed_${userId}`;
            await AsyncStorage.setItem(
                key,
                JSON.stringify(original.filter(r => r.id !== recipe.id))
            );
        } catch {
            setRecipes(original);
            Alert.alert('Error', 'Failed to delete recipe.');
        } finally {
            setActionLoading(null);
        }
    };

    const executeClearAll = async () => {
        if (!userId) return;

        setActionLoading('clear');
        try {
            const key = `recentlyViewed_${userId}`;
            await AsyncStorage.removeItem(key);
            setRecipes([]);
        } catch {
            Alert.alert('Error', 'Failed to clear history.');
        } finally {
            setActionLoading(null);
        }
    };

    /* ----------------------------- Navigation ------------------------------ */

    const handleRecipePress = async (recipe: Recipe) => {
        setActionLoading('open');

        try {
            if (recipe.source === 'created') {
                const fullRecipe = await getRecipeById(recipe.id);

                if (!fullRecipe) {
                    executeDeleteRecipe(recipe);
                    Alert.alert('Recipe Deleted', 'This recipe no longer exists.');
                    return;
                }

                navigation.navigate('ViewRecipe', {
                    recipe: fullRecipe,
                    viewMode: 'recentlyViewed',
                });
            } else {
                const fullRecipe = await fetchRecipeById(recipe.id);

                navigation.navigate('ViewRecipe', {
                    recipe: {
                        id: fullRecipe.id.toString(),
                        title: fullRecipe.title,
                        image: fullRecipe.image,
                        totalTime: fullRecipe.readyInMinutes,
                        ingredients: fullRecipe.extendedIngredients?.map((i: any) => i.original) || [],
                        instructions:
                            fullRecipe.instructions ||
                            fullRecipe.analyzedInstructions?.[0]?.steps
                                ?.map((s: any, i: number) => `${i + 1}. ${s.step}`)
                                .join('\n'),
                        source: 'api',
                    },
                    viewMode: 'recentlyViewed',
                });
            }
        } catch {
            Alert.alert('Error', 'Failed to load recipe.');
        } finally {
            setActionLoading(null);
        }
    };

    /* ------------------------------ Utilities ------------------------------ */

    const formatDate = (dateString: string) => {
        const diff = Date.now() - new Date(dateString).getTime();
        const hours = Math.floor(diff / 36e5);
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        return new Date(dateString).toLocaleDateString();
    };

    /* ------------------------------ Renderers ------------------------------ */

    const renderRecipeItem = ({ item }: { item: Recipe }) => (
        <TouchableOpacity
            onPress={() => handleRecipePress(item)}
            disabled={!!actionLoading}
            className="bg-white rounded-2xl mb-3 flex-row overflow-hidden"
        >
            <Image source={{ uri: item.image }} className="w-24 h-24" />

            <View className="flex-1 p-3 justify-between">
                <Text className="font-bold text-gray-800" numberOfLines={1}>
                    {item.title}
                </Text>
                <Text className="text-xs text-gray-400">
                    {formatDate(item.viewedAt)}
                </Text>
            </View>

            <TouchableOpacity
                onPress={() => showDeleteConfirmation(item)}
                disabled={!!actionLoading}
                className="p-3 justify-center"
            >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    /* --------------------------------- UI --------------------------------- */

    return (
        <View className="flex-1" style={{ backgroundColor: colors.secondary }}>
            <Header
                title="Recently Viewed"
                showBackButton
                onBack={() => navigation.goBack()}
                rightComponent={
                    recipes.length > 0 ? (
                        <TouchableOpacity onPress={showClearAllConfirmation}>
                            <Text className="text-orange-500 font-semibold">Clear All</Text>
                        </TouchableOpacity>
                    ) : undefined
                }
            />

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text className="mt-4 text-gray-600">Loading history...</Text>
                </View>
            ) : (
                <FlatList
                    data={recipes}
                    renderItem={renderRecipeItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 16, flexGrow: 1 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[colors.primary]}
                        />
                    }
                    ListEmptyComponent={
                        <View className="items-center mt-20">
                            <Ionicons name="time-outline" size={80} color="#D1D5DB" />
                            <Text className="text-xl font-bold text-gray-700 mt-4">
                                No Recently Viewed
                            </Text>
                            <Text className="text-gray-500 text-center mt-2">
                                Recipes you view will appear here
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Confirmation Modals */}
            {confirmationModal.type === 'delete' && confirmationModal.recipe && (
                <ConfirmationModal
                    visible={confirmationModal.visible}
                    onClose={closeModal}
                    onConfirm={() => executeDeleteRecipe(confirmationModal.recipe!)}
                    title="Delete Recipe"
                    message={`Delete "${confirmationModal.recipe.title}" from recently viewed?`}
                    confirmText="Delete"
                    icon="trash-bin"
                    isDestructive={true}
                />
            )}

            {confirmationModal.type === 'clearAll' && (
                <ConfirmationModal
                    visible={confirmationModal.visible}
                    onClose={closeModal}
                    onConfirm={executeClearAll}
                    title="Clear Recently Viewed"
                    message="This will remove all recently viewed recipes. This action cannot be undone."
                    confirmText="Clear All"
                    icon="trash"
                    isDestructive={true}
                />
            )}
        </View>
    );
};

export default RecentlyViewedScreen;
