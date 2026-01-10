import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, RefreshControl, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AntDesign } from '@react-native-vector-icons/ant-design';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
    getAllUserItems,
    toggleChecklistItem,
    clearHistoryListItems,
    deleteChecklistItem,
    addItemsToChecklist,
    moveItemsToHistoryList,
} from '../../controller/checklist';
import Header from '../../components/partials/Header';
import ConfirmationModal from '~/components/modal/ConfirmationModal';
import colors from '~/utils/color';

// Interfaces
interface ChecklistItem {
    id: string;
    name: string;
    amount: string;
    unit: string;
    checked: boolean;
    status: 'shopping' | 'history';
}

// Main Component
const ChecklistScreen = () => {
    const [items, setItems] = useState<ChecklistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'shopping' | 'history'>('shopping');
    const navigation = useNavigation();

    // Add ingredient input state
    const [newItemName, setNewItemName] = useState('');
    const [newItemAmount, setNewItemAmount] = useState('');
    const [newItemUnit, setNewItemUnit] = useState('Unit');

    const [showUnitModal, setShowUnitModal] = useState(false);

    // Confirmation modals state
    const [confirmationModal, setConfirmationModal] = useState<{
        visible: boolean;
        type: 'clearPurchased' | 'clearHistory' | 'deleteItem' | null;
        itemToDelete?: ChecklistItem;
    }>({
        visible: false,
        type: null,
    });

    // Units matching AddRecipeScreen
    const units = ['cup', 'piece', 'clove', 'tablespoon', 'teaspoon', 'ml', 'gram', 'kg', 'ounce', 'pound', 'pinch', 'slice', 'bunch', 'can', 'jar'];

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
        // Prevent toggling items with temporary IDs
        if (item.id.startsWith('temp-')) {
            Alert.alert('Please wait', 'Item is still being saved. Please try again in a moment.');
            return;
        }

        //console.log(`toggle-${item.id}`);
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

    const handleMoveToHistoryList = async () => {
        const checkedShoppingItems = items.filter(item => item.status === 'shopping' && item.checked);
        if (checkedShoppingItems.length === 0) return;

        setConfirmationModal({
            visible: true,
            type: 'clearPurchased',
        });
    };

    const executeMoveToPurchased = async () => {
        setActionLoading('move');
        try {
            await moveItemsToHistoryList();
            await fetchItems(); // Refresh the list
        } catch (error) {
            Alert.alert("Error", "Failed to move items to food list.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleClearHistoryList = async () => {
        console.log(items);
        const historyItems = items.filter(item => item.status === 'history' && !item.checked);
        if (historyItems.length === 0) return;

        setConfirmationModal({
            visible: true,
            type: 'clearHistory',
        });
    };

    const executeClearHistory = async () => {
        setActionLoading('clear');
        const originalItems = [...items];
        setItems(items.filter(i => !(i.status === 'history' && i.checked))); // Optimistic UI update
        try {
            await clearHistoryListItems();
            await fetchItems();
        } catch (error) {
            Alert.alert("Error", "Failed to clear items.");
            setItems(originalItems); // Revert
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteFoodItem = async (item: ChecklistItem) => {
        setConfirmationModal({
            visible: true,
            type: 'deleteItem',
            itemToDelete: item,
        });
    };

    const executeDeleteItem = async (item: ChecklistItem) => {
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
    };

    const handleAddItem = async () => {
        const trimmedName = newItemName.trim();
        if (!trimmedName) {
            Alert.alert('Error', 'Please enter an ingredient name.');
            return;
        }

        // Check if unit is selected
        if (newItemUnit === 'Unit') {
            Alert.alert('Error', 'Please select a unit for the ingredient.');
            return;
        }

        setActionLoading('add');

        // Create temporary item for optimistic UI
        const tempItem: ChecklistItem = {
            id: `temp-${Date.now()}`, // Temporary ID
            name: trimmedName,
            amount: newItemAmount || '1',
            unit: newItemUnit,
            checked: false,
            status: 'shopping',
        };

        // Optimistic UI update - add immediately
        setItems(prevItems => [...prevItems, tempItem]);

        // Clear inputs immediately for better UX
        setNewItemName('');
        setNewItemAmount('');
        setNewItemUnit('Unit');

        try {
            // Add to database in background
            await addItemsToChecklist([{
                name: trimmedName,
                amount: newItemAmount || '1',
                unit: newItemUnit,
            }]);

            // Fetch updated items to replace temp ID with real Firestore ID
            await fetchItems();
        } catch (error) {
            // Error - remove the temporary item
            setItems(prevItems => prevItems.filter(i => i.id !== tempItem.id));
            Alert.alert('Error', 'Failed to add item to shopping list.');
        } finally {
            setActionLoading(null);
        }
    };

    // UI Render
    const shoppingItems = items.filter(item => item.status === 'shopping');
    const historyItems = items.filter(item => item.status === 'history');
    const uncheckedShoppingItems = shoppingItems.filter(item => !item.checked);
    const checkedShoppingItems = shoppingItems.filter(item => item.checked);

    // Reusable Add Input Component
    const renderAddInput = () => (
        <View className="rounded-2xl p-4 mb-4"
            style={{ backgroundColor: colors.lightPeach }}>
            <Text className="text-base font-bold text-gray-800 mb-3">Add New Item</Text>
            <View className="flex-row items-center mb-3">
                <View className="flex-1 mr-2">
                    <TextInput
                        className="bg-white rounded-xl px-4 py-3"
                        placeholder="Ingredient name"
                        value={newItemName}
                        onChangeText={setNewItemName}
                        editable={!actionLoading}
                    />
                </View>
                <View className="w-20 mr-2">
                    <TextInput
                        className="bg-white rounded-xl px-4 py-3 text-center"
                        placeholder="Qty"
                        value={newItemAmount}
                        onChangeText={setNewItemAmount}
                        keyboardType="numeric"
                        editable={!actionLoading}
                    />
                </View>
                <TouchableOpacity
                    className="bg-orange-50 border-2 border-orange-200 rounded-xl px-3 py-3 w-24 justify-center items-center"
                    onPress={() => {
                        setShowUnitModal(true);
                    }}
                    activeOpacity={0.7}
                >
                    <View className="flex-row items-center">
                        <Text className="text-orange-600 font-bold text-sm mr-1">
                            {newItemUnit || 'Unit'}
                        </Text>
                        <Ionicons name="chevron-down" size={14} color="#EA580C" />
                    </View>
                </TouchableOpacity>
            </View>
            <TouchableOpacity
                className="rounded-xl py-3"
                style={{
                    backgroundColor: (!!actionLoading || !newItemName.trim() || newItemUnit === 'Unit')
                        ? '#D1D5DB'
                        : '#FB923C'
                }}
                onPress={handleAddItem}
                disabled={!!actionLoading || !newItemName.trim() || newItemUnit === 'Unit'}
            >
                {actionLoading === 'add' ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text className="text-white text-center font-bold">Add to Shopping List</Text>
                )}
            </TouchableOpacity>
        </View>
    );

    const renderShoppingList = () => (
        <>
            {renderAddInput()}
            {/* My Items (To Buy) */}
            <View className="rounded-2xl p-4 mt-4"
                style={{ backgroundColor: colors.secondary }}>
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
                            <TouchableOpacity onPress={handleMoveToHistoryList} disabled={!!actionLoading}>
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

    const renderHistoryList = () => (
        <View className="rounded-2xl p-4 mt-4"
        style={{backgroundColor: colors.secondary}}>
            <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xl font-bold text-gray-800 mb-2">My History Items</Text>
                {historyItems.length > 0 && (
                    <TouchableOpacity onPress={handleClearHistoryList} disabled={!!actionLoading}>
                        <Text className="text-orange-500 font-semibold">Clear All</Text>
                    </TouchableOpacity>
                )}
            </View>

            {historyItems.length > 0 ? (
                historyItems.map((item, index) => (
                    <View key={item.id} className={`flex-row items-center justify-between py-3 ${index < historyItems.length - 1 ? 'border-b border-gray-100' : ''}`}>
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
                <View className="items-center justify-center py-4">
                    <AntDesign name='history' size={80} color="#D1D5DB" />
                    <Text className="text-gray-400 text-center py-4">No history items. Check off items from your shopping list to move them here!</Text>
                </View>
            )}
        </View>

    );

    return (
        <View className="flex-1"
            style={{ backgroundColor: colors.secondary }}>
            <Header title="Your List" showBackButton={false} />
            {/* Tabs */}
            <View className="flex-row p-4">
                <TouchableOpacity
                    onPress={() => setActiveTab('shopping')}
                    className="flex-1 py-3 rounded-full mr-2"
                    style={{
                        backgroundColor: activeTab === 'shopping' ? colors.primary : colors.white
                    }}
                >
                    <Text className={`text-center font-bold ${activeTab === 'shopping' ? 'text-white' : 'text-black'}`}>Shopping List</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveTab('history')}
                    className="flex-1 py-3 rounded-full ml-2"
                    style={{
                        backgroundColor: activeTab === 'history' ? colors.primary : colors.white
                    }}
                >
                    <Text className={`text-center font-bold ${activeTab === 'history' ? 'text-white' : 'text-black'}`}>History</Text>
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
                {loading ? (
                    <View className="flex-1 justify-center items-center py-20">
                        <ActivityIndicator size="large" color="#FF9966" />
                        <Text className="mt-4 text-gray-600">Loading Checklist...</Text>
                    </View>
                ) : activeTab === 'shopping' ? (
                    shoppingItems.length > 0 ? (
                        renderShoppingList()
                    ) : (
                        <>
                            {renderAddInput()}
                            <View className="mt-8 items-center p-8">
                                <Ionicons name="cart-outline" size={80} color="#D1D5DB" />
                                <Text className="text-2xl font-bold text-gray-700 mt-4">Shopping List is Empty</Text>
                                <Text className="text-gray-500 text-center mt-2">Add ingredients manually or from a recipe to get started.</Text>
                            </View>
                        </>
                    )
                ) : (
                    renderHistoryList()
                )}
            </ScrollView>

            {/* Beautiful Unit Selection Modal */}
            {showUnitModal && (
                <View className="absolute inset-0 justify-center items-center px-6" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
                    <View className="bg-white rounded-3xl p-6 w-full max-w-sm" style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.3,
                        shadowRadius: 20,
                        elevation: 10,
                    }}>
                        {/* Header */}
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-2xl font-bold text-gray-800">Select Unit</Text>
                            <TouchableOpacity
                                onPress={() => setShowUnitModal(false)}
                                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                            >
                                <Ionicons name="close" size={20} color="#666" />
                            </TouchableOpacity>
                        </View>

                        {/* Unit Grid */}
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            className="max-h-96"
                            contentContainerStyle={{ paddingBottom: 8 }}
                        >
                            <View className="flex-row flex-wrap gap-2">
                                {units.map((unit) => {
                                    const isSelected = newItemUnit === unit;
                                    return (
                                        <TouchableOpacity
                                            key={unit}
                                            className={`px-4 py-3 rounded-xl border-2 ${isSelected
                                                ? 'bg-orange-500 border-orange-500'
                                                : 'bg-white border-gray-200'
                                                }`}
                                            onPress={() => {
                                                setNewItemUnit(unit);
                                                setShowUnitModal(false);
                                            }}
                                            activeOpacity={0.7}
                                            style={{
                                                shadowColor: isSelected ? '#FF9966' : '#000',
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: isSelected ? 0.3 : 0.05,
                                                shadowRadius: 4,
                                                elevation: isSelected ? 3 : 1,
                                            }}
                                        >
                                            <View className="flex-row items-center">
                                                <Text className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-700'
                                                    }`}>
                                                    {unit}
                                                </Text>
                                                {isSelected && (
                                                    <Ionicons
                                                        name="checkmark-circle"
                                                        size={18}
                                                        color="white"
                                                        style={{ marginLeft: 6 }}
                                                    />
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    </View>
                </View>
            )}

            {/* Confirmation Modals */}
            {confirmationModal.type === 'clearPurchased' && (
                <ConfirmationModal
                    visible={confirmationModal.visible}
                    onClose={() => setConfirmationModal({ visible: false, type: null })}
                    onConfirm={executeMoveToPurchased}
                    title="Clear Purchased Items"
                    message="Are you sure you want to remove all purchased items from the shopping list?"
                    confirmText="Clear"
                    cancelText="Cancel"
                    icon="checkmark-done-circle"
                    iconColor={colors.primary}
                    confirmColor={colors.primary}
                />
            )}

            {confirmationModal.type === 'clearHistory' && (
                <ConfirmationModal
                    visible={confirmationModal.visible}
                    onClose={() => setConfirmationModal({ visible: false, type: null })}
                    onConfirm={executeClearHistory}
                    title="Clear History Items"
                    message="Are you sure you want to remove all history items? This action cannot be undone."
                    confirmText="Clear All"
                    cancelText="Cancel"
                    icon="trash"
                    isDestructive={true}
                />
            )}

            {confirmationModal.type === 'deleteItem' && confirmationModal.itemToDelete && (
                <ConfirmationModal
                    visible={confirmationModal.visible}
                    onClose={() => setConfirmationModal({ visible: false, type: null })}
                    onConfirm={() => executeDeleteItem(confirmationModal.itemToDelete!)}
                    title="Delete Item"
                    message={`Are you sure you want to delete "${confirmationModal.itemToDelete.name}" from your food list?`}
                    confirmText="Delete"
                    cancelText="Cancel"
                    icon="trash-bin"
                    isDestructive={true}
                />
            )}
        </View>
    );
};

export default ChecklistScreen;