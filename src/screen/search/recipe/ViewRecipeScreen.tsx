import { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Linking, Modal, Alert, ActivityIndicator } from 'react-native';
import { Ionicons, } from '@expo/vector-icons';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { deleteRecipe, saveRecipe, unsaveRecipe, isRecipeSaved } from '../../../controller/recipe';
import Header from '../../../components/Header';
import { getAuth, type Auth } from 'firebase/auth';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const auth: Auth = getAuth();

interface Ingredient {
    name: string;
    amount: string;
    unit: string;
}

const mockIngredients: Ingredient[] = [
    { name: 'Tomatos', amount: '500', unit: 'g' },
    { name: 'Cabbage', amount: '300', unit: 'g' },
    { name: 'Taco', amount: '', unit: '' },
];

const ViewRecipeScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const [modalVisible, setModalVisible] = useState(false);
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [isSaved, setIsSaved] = useState(false);
    const [savedStatusLoading, setSavedStatusLoading] = useState(true);

    // Get recipe from params, fallback to mock for dev
    const { recipe } = (route.params as any) || { recipe: {} };

    // Get current user ID and check ownership
    const currentUserId = auth.currentUser?.uid;
    const isOwner = recipe?.userId === currentUserId;

    useFocusEffect(() => {
        const checkSavedStatus = async () => {
            setSavedStatusLoading(true);
            const currentRecipeId = (route.params as any)?.recipe?.id;
            if (auth.currentUser && currentRecipeId) {
                try {
                    const saved = await isRecipeSaved(currentRecipeId);
                    setIsSaved(saved);
                } catch (error) {
                    console.error('Error checking saved status:', error);
                    setIsSaved(false);
                }
            } else {
                setIsSaved(false);
            }
            setSavedStatusLoading(false);
        };
        checkSavedStatus();
    });

    useEffect(() => {

    })



    // Get YouTube link from recipe data
    const youtubeLink = recipe?.youtube;

    // Fallbacks for demo
    const image = recipe?.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836';
    const title = recipe?.title;
    const time = recipe?.totalTime;
    const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : mockIngredients;
    const serves = recipe?.serves;
    const items = recipe?.items;
    const profileImage = recipe?.profileImage || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836';

    const [tab, setTab] = useState<'ingredient' | 'procedure'>('ingredient');

    const handleOptionLink = () => {
        if (!youtubeLink) {
            Alert.alert('No Video', 'This recipe does not have a video tutorial.');
            return;
        }
        Linking.openURL(youtubeLink).catch((error) => {
            console.error('Error opening link:', error);
            Alert.alert('Error', 'Could not open the video link. Please try again.');
        });
    };



    const handleSaveRecipe = async () => {
        setLoadingAction('saving');
        try {
            await saveRecipe(recipe.id);
            setIsSaved(true);
            Alert.alert('Success', 'Recipe saved successfully!');
        } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save recipe');
        } finally {
            setLoadingAction(null);
        }
    };

    const handleUnsaveRecipe = async () => {
        setLoadingAction('unsaving');
        try {
            await unsaveRecipe(recipe.id);
            setIsSaved(false);
            Alert.alert('Success', 'Recipe has been unsaved.');
        } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to unsave recipe');
        } finally {
            setLoadingAction(null);
        }
    };


    const handleDelete = async () => {
        setLoadingAction('deleting');
        try {
            await deleteRecipe(recipe.id);
            Alert.alert('Success', 'Recipe deleted successfully', [
                {
                    text: 'OK',
                    onPress: () => {
                        setModalVisible(false);
                        navigation.goBack();
                    },
                },
            ]);
        } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete recipe');
        } finally {
            setLoadingAction(null);
        }
    };


    const toggleSave = () => {
        if (isSaved) {
            handleUnsaveRecipe();
        } else {
            handleSaveRecipe();
        }
    };

    const showDeleteConfirmation = () => {
        Alert.alert(
            'Delete Recipe',
            'Are you sure you want to delete this recipe?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                    onPress: () => setModalVisible(false),
                },
                {
                    text: loadingAction === 'deleting' ? 'Deleting...' : 'Delete',
                    style: 'destructive',
                    onPress: handleDelete,
                },
            ]
        );
    };


    return (
        <View className="flex-1 bg-[#FFF6F0]">
            <Header
                title={title}
                showBackButton={true}
                onBack={() => navigation.goBack()}
                rightIcon={undefined}
                onRightAction={undefined}
                backgroundColor="#FFF6F0"
                textColor="#222"
            />
            {/* Show Manage button if owner */}
            {isOwner && (
                <View style={{ position: 'absolute', top: 50, right: 20, zIndex: 10 }}>
                    <TouchableOpacity
                        className="bg-orange-400 p-2 rounded-full"
                        onPress={() => setModalVisible(true)}
                    >
                        <MaterialCommunityIcons name="playlist-edit" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Loading Overlay */}
            {loadingAction && (
                <View className="absolute inset-0 bg-black/50 z-50 items-center justify-center">
                    <View className="bg-white rounded-xl p-6 items-center">
                        <ActivityIndicator size="large" color="#FFB47B" />
                        <Text className="mt-3 text-gray-700 font-medium">
                            {loadingAction === 'deleting'
                                ? 'Deleting recipe...'
                                : loadingAction === 'saving'
                                    ? 'Saving recipe...'
                                    : loadingAction === 'unsaving'
                                        ? 'Unsaving recipe...'
                                        : loadingAction === 'adding-to-checklist'
                                            ? 'Adding to checklist...'
                                            : 'Processing...'}
                        </Text>
                    </View>
                </View>
            )}

            {/* Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => !loadingAction && setModalVisible(false)}
            >
                <TouchableOpacity
                    className="flex-1 justify-end bg-black/50"
                    activeOpacity={1}
                    onPress={() => !loadingAction && setModalVisible(false)}
                    disabled={!!loadingAction}
                >
                    <View className="bg-white rounded-t-3xl">
                        <View className="w-12 h-1 bg-gray-300 rounded-full mx-auto mt-2 mb-4" />
                        <TouchableOpacity
                            className={`flex-row items-center px-6 py-4 border-b border-gray-200 ${loadingAction ? 'opacity-50' : ''}`}
                            onPress={showDeleteConfirmation}
                            disabled={!!loadingAction}
                        >
                            {loadingAction === 'deleting' ? (
                                <ActivityIndicator size="small" color="#FF3B30" />
                            ) : (
                                <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                            )}
                            <Text className="text-[#FF3B30] text-lg font-semibold ml-3">
                                {loadingAction === 'deleting' ? 'Deleting...' : 'Delete Recipe'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="flex-row items-center px-6 py-4"
                            onPress={() => setModalVisible(false)}
                            disabled={!!loadingAction}
                        >
                            <Ionicons name="close-circle-outline" size={24} color="#666" />
                            <Text className="text-gray-600 text-lg font-semibold ml-3">Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Recipe Image with YouTube overlay */}
                <View className="relative items-center">
                    <Image source={{ uri: image }} className="w-11/12 h-44 rounded-2xl" />
                    {youtubeLink ? (
                        <>
                            <TouchableOpacity
                                className="absolute top-3 left-5 bg-black/60 px-3 py-1 rounded-full flex-row items-center"
                            >
                                <Ionicons name="logo-youtube" size={16} color="#fff" />
                                <Text className="text-white ml-2 text-xs">Watch on YouTube</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="absolute top-1/2 left-1/2"
                                onPress={handleOptionLink}
                                style={{ transform: [{ translateX: -24 }, { translateY: -24 }] }}
                            >
                                <Ionicons name="play-circle" size={48} color="#fff" />
                            </TouchableOpacity>
                        </>
                    ) : null}
                    <View className="absolute bottom-3 right-5 bg-black/60 px-2 py-1 rounded-full flex-row items-center">
                        <Ionicons name="time-outline" size={14} color="#fff" />
                        <Text className="ml-1 text-xs text-white">{time}</Text>
                    </View>
                </View>

                {/* Recipe Info */}
                <View className="px-5 mt-3">
                    <Text className="text-lg font-bold text-gray-900">{title}</Text>
                    {recipe?.intro ? (
                        <Text className="text-gray-700 mt-2">{recipe.intro}</Text>
                    ) : null}
                </View>

                {/* Author Info */}
                <View className="flex-row items-center px-5 mt-3">
                    <Image source={{ uri: profileImage }} className="w-10 h-10 rounded-full" />
                    <View className="ml-3 flex-1">
                        <Text className="text-xs text-gray-400">By</Text>
                        <Text className="font-semibold text-gray-800">{recipe.username}</Text>

                    </View>
                    <TouchableOpacity
                        className={`px-4 py-2 rounded-full ${isSaved ? 'bg-green-500' : 'bg-[#FFB47B]'}`}
                        onPress={toggleSave}
                        disabled={!!loadingAction}
                    >
                        <Text className="text-white font-semibold">
                            {isSaved ? 'Saved' : 'Save for Cooking'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Tabs */}
                <View className="flex-row px-5 mt-5">
                    <TouchableOpacity
                        className={`flex-1 py-2 rounded-full ${tab === 'ingredient' ? 'bg-[#FFB47B]' : 'bg-gray-100'}`}
                        onPress={() => setTab('ingredient')}
                    >
                        <Text className={`text-center font-semibold ${tab === 'ingredient' ? 'text-white' : 'text-gray-700'}`}>Ingredient</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className={`flex-1 py-2 rounded-full ml-2 ${tab === 'procedure' ? 'bg-[#FFB47B]' : 'bg-gray-100'}`}
                        onPress={() => setTab('procedure')}
                    >
                        <Text className={`text-center font-semibold ${tab === 'procedure' ? 'text-white' : 'text-gray-700'}`}>Procedure</Text>
                    </TouchableOpacity>
                </View>

                {/* Serving & Items */}
                <View className="flex-row justify-between px-5 mt-4 mb-2">
                    <Text className="text-xs text-gray-400">{serves} serve</Text>
                    <Text className="text-xs text-gray-400">{items} items</Text>
                </View>

                {/* Ingredient List */}
                {tab === 'ingredient' && (
                    <View className="px-5">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-lg font-semibold text-gray-800">Ingredients</Text>
                        </View>
                        {Array.isArray(ingredients) &&
                            ingredients.map((ing: { name: string; amount: string; unit: string }, idx: number) => (
                                <TouchableOpacity key={idx} className="flex-row items-center bg-white rounded-xl mb-3 px-4 py-3 shadow-sm">
                                    <Text className="flex-1 font-semibold text-gray-800">{ing.name}</Text>
                                    <Text className="text-gray-400">{ing.amount + ' ' + ing.unit}</Text>
                                </TouchableOpacity>
                            ))}
                    </View>
                )}

                {/* Procedure Tab Placeholder */}
                {tab === 'procedure' && (
                    <View className="px-5 py-6">
                        <Text className="text-lg font-semibold text-gray-800 mb-4">Step-by-Step Instructions</Text>
                        {Array.isArray(recipe?.steps) && recipe.steps.length > 0 ? (
                            recipe.steps.map((step: any, idx: number) => (
                                <View key={idx} className="mb-6 bg-white rounded-xl p-4 shadow-sm">
                                    <View className="flex-row items-center mb-2">
                                        <Text className="text-[#FFB47B] font-bold mr-2">{idx + 1}.</Text>
                                        <Text className="font-semibold text-gray-800 flex-1">{step.title || `Step ${idx + 1}`}</Text>
                                        {step.time ? (
                                            <View className="flex-row items-center ml-2">
                                                <Ionicons name="time-outline" size={14} color="#FFB47B" />
                                                <Text className="ml-1 text-xs text-gray-500">{step.time}</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                    <Text className="text-gray-700">{step.details}</Text>
                                </View>
                            ))
                        ) : (
                            <Text className="text-gray-400 text-center">No procedure steps available.</Text>
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

export default ViewRecipeScreen;
