import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
    getAllUserItems,
    toggleChecklistItem,
    clearCheckedShoppingItems,
    deleteChecklistItem,
    moveItemsToFoodList,
} from '../../controller/checklist';
import Header from '../../components/Header';

// Interfaces
interface ChecklistItem {
    id: string;
    name: string;
    amount: string;
    unit: string;
    checked: boolean;
    status: 'shopping' | 'pantry';
}

// Main Component
const ChecklistScreen = () => {
    const [items, setItems] = useState<ChecklistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'shopping' | 'food'>('shopping');
    const navigation = useNavigation();

    // Fetching data
    const fetchItems = useCallback(async () => {
        try {
            if (!refreshing) setLoading(true);
            const fetchedItems = await getAllUserItems();
            setItems(fetchedItems as ChecklistItem[]);
        } catch (error) {
            Alert.alert('Error', 'Failed to load your shopping list.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [refreshing]);

    useFocusEffect(
        useCallback(() => {
            fetchItems();
        }, [])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchItems();
    }, []);

    // Actions
    const handleToggleItem = async (item: ChecklistItem) => {
        setActionLoading(`toggle-${item.id}`);
        const originalItems = [...items];

        // Optimistic UI update
        const updatedItems = items.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i);
        setItems(updatedItems);

        try {
            await toggleChecklistItem(item.id, !item.checked);
        } catch (error) {
            Alert.alert('Error', 'Failed to update item. Please try again.');
            setItems(originalItems); // Revert on failure
        } finally {
            setActionLoading(null);
        }
    };

    const handleMoveToFoodList = async () => {
        const checkedShoppingItems = items.filter(item => item.status === 'shopping' && item.checked);
        if (checkedShoppingItems.length === 0) return;

        Alert.alert(
            "Move to Food List",
            `Move ${checkedShoppingItems.length} purchased item(s) to your food list?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Move",
                    onPress: async () => {
                        setActionLoading('move');
                        try {
                            await moveItemsToFoodList();
                            await fetchItems(); // Refresh the list
                        } catch (error) {
                            Alert.alert("Error", "Failed to move items to food list.");
                        } finally {
                            setActionLoading(null);
                        }
                    },
                },
            ]
        );
    };

    const handleClearChecked = async () => {
        const checkedShoppingItems = items.filter(item => item.status === 'shopping' && item.checked);
        if (checkedShoppingItems.length === 0) return;

        Alert.alert(
            "Clear Purchased Items",
            "Are you sure you want to remove all purchased items from the shopping list?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear",
                    style: "destructive",
                    onPress: async () => {
                        setActionLoading('clear');
                        const originalItems = [...items];
                        setItems(items.filter(i => !(i.status === 'shopping' && i.checked))); // Optimistic UI update
                        try {
                            await clearCheckedShoppingItems();
                        } catch (error) {
                            Alert.alert("Error", "Failed to clear items.");
                            setItems(originalItems); // Revert
                        } finally {
                            setActionLoading(null);
                        }
                    },
                },
            ]
        );
    };

    const handleDeleteFoodItem = async (item: ChecklistItem) => {
        Alert.alert(
            "Delete Item",
            `Are you sure you want to delete "${item.name}" from your food list?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setActionLoading(`delete-${item.id}`);
                        const originalItems = [...items];
                        setItems(items.filter(i => i.id !== item.id)); // Optimistic UI update
                        try {
                            await deleteChecklistItem(item.id);
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete item.");
                            setItems(originalItems); // Revert
                        } finally {
                            setActionLoading(null);
                        }
                    },
                },
            ]
        );
    };

    // UI Render
    if (loading) {
        return (
            <View className="flex-1 bg-gray-50 justify-center items-center">
                <ActivityIndicator size="large" color="#FF9966" />
            </View>
        );
    }

    const shoppingItems = items.filter(item => item.status === 'shopping');
    const foodItems = items.filter(item => item.status === 'pantry');
    const uncheckedShoppingItems = shoppingItems.filter(item => !item.checked);
    const checkedShoppingItems = shoppingItems.filter(item => item.checked);

    const renderShoppingList = () => (
        <>
            {/* My Items (To Buy) */}
            <View className="bg-white rounded-2xl p-4 mt-4">
                <Text className="text-xl font-bold text-gray-800 mb-2">My items</Text>
                {uncheckedShoppingItems.length > 0 ? (
                    uncheckedShoppingItems.map((item, index) => (
                        <TouchableOpacity key={item.id} onPress={() => handleToggleItem(item)} disabled={!!actionLoading} className={`flex-row items-center justify-between py-3 ${index < uncheckedShoppingItems.length - 1 ? 'border-b border-gray-100' : ''}`}>
                            <View className="flex-row items-center flex-1">
                                <View className="w-12 h-12 rounded-full bg-orange-100 items-center justify-center mr-4">
                                    <Text className="text-2xl">🛒</Text>
                                </View>
                                <View className="flex-1">
                                    <Text className="text-gray-800 text-base font-semibold">{item.name}</Text>
                                    <Text className="text-gray-500 text-sm">{item.amount + ' ' + item.unit}</Text>
                                </View>
                            </View>
                            <Ionicons name="square-outline" size={28} color="#D1D5DB" />
                        </TouchableOpacity>
                    ))
                ) : (
                    <Text className="text-gray-400 text-center py-4">No items to buy.</Text>
                )}
            </View>

            {/* Checked Items */}
            {checkedShoppingItems.length > 0 &&
                <View className="bg-white rounded-2xl p-4 mt-4">
                    <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-xl font-bold text-gray-800">Checked items</Text>
                        <View className="flex-row">
                            <TouchableOpacity onPress={handleMoveToFoodList} disabled={!!actionLoading} className="mr-4">
                                <Text className="text-green-600 font-semibold">Move to Food List</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleClearChecked} disabled={!!actionLoading}>
                                <Text className="text-orange-500 font-semibold">Clear</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {checkedShoppingItems.map((item, index) => (
                        <TouchableOpacity key={item.id} onPress={() => handleToggleItem(item)} disabled={!!actionLoading} className={`flex-row items-center justify-between py-3 ${index < checkedShoppingItems.length - 1 ? 'border-b border-gray-100' : ''}`}>
                            <View className="flex-row items-center flex-1">
                                <View className="w-12 h-12 rounded-full bg-green-100 items-center justify-center mr-4">
                                    <Text className="text-2xl">🛍️</Text>
                                </View>
                                <Text className="text-gray-500 text-base font-semibold line-through">{item.name}</Text>
                            </View>
                            <Ionicons name="checkbox" size={28} color="#FF9966" />
                        </TouchableOpacity>
                    ))}
                </View>
            }
        </>
    );

    const renderFoodList = () => (
        <View className="bg-white rounded-2xl p-4 mt-4">
            <Text className="text-xl font-bold text-gray-800 mb-2">My Food Items</Text>
            {foodItems.length > 0 ? (
                foodItems.map((item, index) => (
                    <View key={item.id} className={`flex-row items-center justify-between py-3 ${index < foodItems.length - 1 ? 'border-b border-gray-100' : ''}`}>
                        <TouchableOpacity
                            onPress={() => handleToggleItem(item)}
                            disabled={!!actionLoading}
                            className="flex-row items-center flex-1"
                        >
                            <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center mr-4">
                                <Text className="text-2xl">🍽️</Text>
                            </View>
                            <View className="flex-1">
                                <Text className={`text-gray-800 text-base font-semibold`}>
                                    {item.name}
                                </Text>
                                {item.amount && (
                                    <Text className="text-gray-500 text-sm">
                                        {item.amount} {item.unit}
                                    </Text>
                                )}
                            </View>
                        </TouchableOpacity>
                        <View className="flex-row items-center">
                            <TouchableOpacity
                                onPress={() => handleDeleteFoodItem(item)}
                                disabled={!!actionLoading}
                                className="ml-3 p-2"
                            >
                                <Ionicons
                                    name="trash-outline"
                                    size={20}
                                    color="#EF4444"
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))
            ) : (
                <Text className="text-gray-400 text-center py-4">No food items yet. Check off items from your shopping list to move them here!</Text>
            )}
        </View>
    );

    return (
        <View className="flex-1 bg-gray-50">
            <Header title="Your List" showBackButton={false} />

            {/* Tabs */}
            <View className="flex-row p-4">
                <TouchableOpacity
                    onPress={() => setActiveTab('shopping')}
                    className={`flex-1 py-3 rounded-full mr-2 ${activeTab === 'shopping' ? 'bg-orange-400' : 'bg-gray-200'}`}
                >
                    <Text className={`text-center font-bold ${activeTab === 'shopping' ? 'text-white' : 'text-gray-600'}`}>Shopping List</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveTab('food')}
                    className={`flex-1 py-3 rounded-full ml-2 ${activeTab === 'food' ? 'bg-orange-400' : 'bg-gray-200'}`}
                >
                    <Text className={`text-center font-bold ${activeTab === 'food' ? 'text-white' : 'text-gray-600'}`}>Food List</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                className="px-4"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#FFB47B']}
                    />
                }
            >
                {activeTab === 'shopping' ? (
                    shoppingItems.length > 0 ? (
                        renderShoppingList()
                    ) : (
                        <View className="mt-20 items-center p-8">
                            <Ionicons name="cart-outline" size={80} color="#D1D5DB" />
                            <Text className="text-2xl font-bold text-gray-700 mt-4">Shopping List is Empty</Text>
                            <Text className="text-gray-500 text-center mt-2">Add ingredients from a recipe to get started.</Text>
                        </View>
                    )
                ) : (
                    renderFoodList()
                )}
            </ScrollView>
        </View>
    );
};

export default ChecklistScreen;