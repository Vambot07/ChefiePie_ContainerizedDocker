import { useEffect, useState, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Linking, Modal, Alert, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { deleteRecipe, saveRecipe, unsaveRecipe, isRecipeSaved, saveApiRecipe } from '../../../controller/recipe';
import { NavigationProps } from '~/navigation/AppStack';
import Header from '../../../components/partials/Header';
import { getAuth, type Auth } from 'firebase/auth';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '~/context/AuthContext';

const auth: Auth = getAuth();

// Spoonacular API Key
const SPOONACULAR_API_KEY = process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY;

const ViewRecipeScreen = () => {
    const route = useRoute();
    const navigation = useNavigation<NavigationProps>();
    const { user } = useAuth(); // Get user data including role

    const [modalVisible, setModalVisible] = useState(false);
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [isSaved, setIsSaved] = useState(false);
    const [savedStatusLoading, setSavedStatusLoading] = useState(true);
    const [ownerRecipeId, setOwnerRecipeId] = useState<string | null>(null);
    const [tab, setTab] = useState<'ingredient' | 'procedure'>('ingredient');
    const [isSummaryFullModal, setIsSummaryFullModal] = useState<boolean>(false);

    // API Recipe state
    const [apiRecipeDetails, setApiRecipeDetails] = useState<any>(null);
    const [loadingApiDetails, setLoadingApiDetails] = useState(false);

    // ✅ Get recipe and viewMode from params
    const {
        recipe,
        viewMode = 'discover',
        profileUserId
    } = (route.params as any) || {
        recipe: {},
        viewMode: 'discover',
        profileUserId: ''
    };

    // Detect if it's an API recipe (Spoonacular) or user-created recipe (Firebase)
    const isApiRecipe = recipe?.source === 'api';

    // Get current user ID and check ownership (only for user recipes)
    const currentUserId = auth.currentUser?.uid;
    const isOwner = recipe?.userId === currentUserId;

    // Check if user is admin
    const isAdmin = user?.role === 'admin';


    const shouldShowSaveButton = () => {
        // Always show for discover mode (Home/Search/Saved pages)
        if (viewMode === 'discover') return true;

        // For profile mode - only show if viewing own recipe
        if (viewMode === 'profile') {
            // If profileUserId exists and is NOT current user - hide
            if (profileUserId && profileUserId !== currentUserId) {
                return false;
            }
            // Own profile - show
            return true;
        }

        return true; // Default: show
    };


    const canSaveRecipe = shouldShowSaveButton();


    const shouldShowManageButton = () => {
        // Never show for API recipes
        if (isApiRecipe) return false;

        // ✅ ADMIN can manage any user-created recipe
        if (isAdmin) return true;

        // For non-admin users, only show if they own the recipe
        if (!isOwner) return false;

        // If viewing from someone else's profile - hide
        if (profileUserId && profileUserId !== currentUserId) {
            return false;
        }

        // If in profile mode and viewing someone else's recipe - hide
        if (viewMode === 'profile' && recipe?.userId !== currentUserId) {
            return false;
        }

        // All checks passed - show manage button
        return true;
    };
    const canManageRecipe = shouldShowManageButton();

    // Helper function for Difficulty Badge styling ⭐️
    const getDifficultyStyles = (difficulty: string | undefined) => {
        switch (difficulty?.toLowerCase()) {
            case 'easy':
                return {
                    bgColor: 'bg-green-50',
                    borderColor: 'border-green-200',
                    textColor: 'text-green-600',
                    iconName: 'leaf-outline',
                    iconColor: '#10B981', // Emerald 500
                };
            case 'medium':
                return {
                    bgColor: 'bg-yellow-50',
                    borderColor: 'border-yellow-200',
                    textColor: 'text-yellow-700',
                    iconName: 'star-half-outline',
                    iconColor: '#F59E0B', // Amber 500
                };
            case 'hard':
                return {
                    bgColor: 'bg-red-50',
                    borderColor: 'border-red-200',
                    textColor: 'text-red-600',
                    iconName: 'flame-outline',
                    iconColor: '#EF4444', // Red 500
                };
            default:
                // Fallback for N/A or unknown
                return {
                    bgColor: 'bg-gray-100',
                    borderColor: 'border-gray-300',
                    textColor: 'text-gray-500',
                    iconName: 'help-circle-outline',
                    iconColor: '#9CA3AF', // Gray 400
                };
        }
    };

    // Fetch full API recipe details
    useEffect(() => {
        console.log(recipe);
        const fetchApiRecipeDetails = async () => {
            if (!isApiRecipe || !recipe?.id) return;
            try {
                setLoadingApiDetails(true);
                const response = await fetch(
                    `https://api.spoonacular.com/recipes/${recipe.id}/information?apiKey=${SPOONACULAR_API_KEY}`
                );

                if (!response.ok) {
                    throw new Error('Failed to fetch recipe details');
                }

                const data = await response.json();
                console.log('✅ API Recipe Details:', data);
                setApiRecipeDetails(data);
            } catch (error) {
                console.error('❌ Error fetching API recipe details:', error);
                Alert.alert('Error', 'Failed to load full recipe details');
            } finally {
                setLoadingApiDetails(false);
            }
        };

        fetchApiRecipeDetails();
    }, [recipe?.id, isApiRecipe]);

    useFocusEffect(
        useCallback(() => {
            const checkSavedStatus = async () => {
                setSavedStatusLoading(true);

                if (!auth.currentUser || !recipe?.id) {
                    setIsSaved(false);
                    setSavedStatusLoading(false);
                    return;
                }

                try {
                    const saved = await isRecipeSaved(recipe.id.toString());
                    setIsSaved(saved);
                } catch (error) {
                    console.error('Error checking saved status:', error);
                    setIsSaved(false);
                } finally {
                    setSavedStatusLoading(false);
                }
            };

            checkSavedStatus();
        }, [recipe?.id])
    );

    useEffect(() => {
        const ownerId = getOwnerId();
        setOwnerRecipeId(ownerId);
    }, []);

    const getOwnerId = () => {
        if (!isApiRecipe) {
            return recipe.userId;
        }
        return null;
    }

    // Get YouTube link from recipe data (only user recipes have this)
    const youtubeLink = recipe?.youtube;

    // Prepare data based on recipe type
    let image, title, time, ingredients, items, profileImage, steps, intro, sourceUrl, difficulty, serving;

    if (isApiRecipe && apiRecipeDetails) {
        // Use API recipe details
        image = apiRecipeDetails.image || recipe.image;
        title = apiRecipeDetails.title || recipe.title;
        time = apiRecipeDetails.readyInMinutes ? `${apiRecipeDetails.readyInMinutes}` : 'N/A';
        serving = apiRecipeDetails.servings || 'N/A'; // Corrected to use 'serving'
        sourceUrl = apiRecipeDetails.sourceUrl || null;
        difficulty = 'N/A (API Recipe)';

        // Transform API ingredients to our format
        ingredients = apiRecipeDetails.extendedIngredients?.map((ing: any) => ({
            name: ing.name || ing.original,
            amount: ing.amount?.toString() || '',
            unit: ing.unit || ''
        })) || [];

        items = ingredients.length;

        // Transform API instructions to our format
        steps = apiRecipeDetails.analyzedInstructions?.[0]?.steps?.map((step: any, idx: number) => ({
            title: `Step ${idx + 1}`,
            details: step.step,
            time: ''
        })) || [];

        intro = apiRecipeDetails.summary?.replace(/<[^>]*>/g, '') || '';

    } else {
        // Use user-created recipe data
        image = recipe?.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836';
        title = recipe?.title || 'Recipe';
        time = recipe?.totalTime || recipe?.time || 'N/A';
        ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
        items = recipe?.items;
        profileImage = recipe?.profileImage || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836';
        steps = recipe?.steps || [];
        intro = recipe?.intro;
        sourceUrl = recipe?.sourceUrl || null;
        difficulty = recipe?.difficulty || 'N/A';
        serving = recipe?.serving || 'N/A'; // Corrected to use 'serving'
    }

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
            if (isApiRecipe) {
                console.log('Saving API recipe:', apiRecipeDetails);
                await saveApiRecipe(apiRecipeDetails);
            } else {
                const { id, title, source, image, totalTime, sourceUrl } = recipe;
                await saveRecipe({ id, title, source, image, totalTime, sourceUrl });
            }

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

    // Show loading while fetching API details
    if (isApiRecipe && loadingApiDetails) {
        return (
            <View className="flex-1 bg-[#FFF6F0]">
                <Header
                    title="Loading..."
                    showBackButton={true}
                    onBack={() => navigation.goBack()}
                    backgroundColor="#FFF6F0"
                    textColor="#222"
                />
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#FFB47B" />
                    <Text className="mt-4 text-gray-600">Loading recipe details...</Text>
                </View>
            </View>
        );
    }

    const handleShowModalVisible = () => {
        setModalVisible(true);
    }

    return (
        <View className="flex-1 bg-[#FFF6F0]">
            <Header
                title={title}
                showBackButton={true}
                onBack={() => navigation.goBack()}
                rightIcon={canManageRecipe ? ("menu-sharp") : undefined}
                onRightAction={handleShowModalVisible}
                backgroundColor="#FFF6F0"
                textColor="#222"
            />

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
                                        : 'Processing...'}
                        </Text>
                    </View>
                </View>
            )}

            {/* Modal - ONLY if canManageRecipe */}
            {canManageRecipe && (
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
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Recipe Image */}
                <View className="relative items-center">
                    <Image source={{ uri: image }} className="w-11/12 h-44 rounded-2xl" />

                    {/* YouTube overlay - ONLY for user recipes */}
                    {!isApiRecipe && youtubeLink && (
                        <>
                            <TouchableOpacity className="absolute top-3 left-5 bg-black/60 px-3 py-1 rounded-full flex-row items-center">
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
                    )}

                    {/* Time badge */}
                    <View className="absolute bottom-3 right-5 bg-black/60 px-2 py-1 rounded-full flex-row items-center">
                        <Ionicons name="time-outline" size={14} color="#fff" />
                        <Text className="ml-1 text-xs text-white">{time} Mins</Text>
                    </View>
                </View>

                {/* Recipe Info */}
                <View className="px-5 mt-3">
                    <Text className="text-lg font-bold text-gray-900">{title}</Text>
                    {intro && (
                        <Text className="text-gray-700 mt-2" numberOfLines={4}>{intro}</Text>
                    )}

                    {/* Badge for API recipes */}
                    {isApiRecipe && (
                        <View className="mt-3 bg-orange-50 border border-orange-200 p-3 rounded-xl flex-row items-center">
                            <Ionicons name="globe-outline" size={20} color="#FF9966" />
                            <Text className="text-sm text-gray-700 ml-2 flex-1">
                                Recipe from Spoonacular • ID: {recipe?.id}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Author Info - ONLY for user recipes */}
                {!isApiRecipe && (
                    <View className="flex-row items-center px-5 mt-3">
                        <TouchableOpacity onPress={() => {
                            if (ownerRecipeId) {
                                console.log(ownerRecipeId);
                                navigation.navigate('Profile', {
                                    userId: ownerRecipeId,
                                    viewMode: 'discover'
                                });
                            } else {
                                console.warn('No owner ID found');
                            }
                        }}>
                            <Image source={{ uri: profileImage }} className="w-10 h-10 rounded-full" />
                        </TouchableOpacity>

                        <View className="ml-3 flex-1">
                            <Text className="text-xs text-gray-400">By</Text>
                            <Text className="font-semibold text-gray-800">{recipe?.username || 'Unknown'}</Text>
                        </View>

                        {/* Only show Save button if canSaveRecipe */}
                        {canSaveRecipe && (
                            <TouchableOpacity
                                className={`px-4 py-2 rounded-full ${isSaved ? 'bg-green-500' : 'bg-[#FFB47B]'}`}
                                onPress={toggleSave}
                                disabled={!!loadingAction}
                            >
                                <Text className="text-white font-semibold">
                                    {isSaved ? 'Saved' : 'Save for Cooking'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Simple action for API recipes */}
                {isApiRecipe && (
                    <View className="px-5 mt-4">
                        {/* Only show Save button if canSaveRecipe */}
                        {canSaveRecipe && (
                            <TouchableOpacity
                                className={`py-3 rounded-full flex-row items-center justify-center ${isSaved ? 'bg-green-500' : 'bg-orange-400'
                                    }`}
                                onPress={toggleSave}
                                disabled={savedStatusLoading || !!loadingAction}
                            >
                                {savedStatusLoading ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <>
                                        <Feather
                                            name={isSaved ? "check" : "bookmark"}
                                            size={20}
                                            color="white"
                                        />
                                        <Text className="text-white font-bold ml-2">
                                            {isSaved ? 'Saved' : 'Save Recipe'}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Ensures both are displayed side-by-side for user recipes */}
                {(!isApiRecipe && (difficulty || serving)) && (
                    <View className="px-5 mt-4">
                        {/* Outer container to hold badges side-by-side */}
                        <View className="flex-row gap-3">

                            {/* 1. Difficulty Badge */}
                            {difficulty && difficulty !== 'N/A' && (
                                (() => {
                                    const styles = getDifficultyStyles(difficulty);
                                    return (
                                        <View
                                            className={`${styles.bgColor} ${styles.borderColor} border p-3 rounded-xl flex-row items-center flex-shrink-0`}
                                        >
                                            <Ionicons name={styles.iconName as any} size={20} color={styles.iconColor} />
                                            <Text className={`text-lg font-bold ${styles.textColor} ml-2 capitalize`}>
                                                {difficulty}
                                            </Text>
                                        </View>
                                    );
                                })()
                            )}
                        </View>
                    </View>
                )}

                {/* Tabs - Show for both user recipes and API recipes with data */}
                {((isApiRecipe && apiRecipeDetails) || (!isApiRecipe && recipe?.ingredients)) && (
                    <>
                        <View className="flex-row px-5 mt-5">
                            <TouchableOpacity
                                className={`flex-1 py-2 rounded-full ${tab === 'ingredient' ? 'bg-[#FFB47B]' : 'bg-gray-100'}`}
                                onPress={() => setTab('ingredient')}
                            >
                                <Text className={`text-center font-semibold ${tab === 'ingredient' ? 'text-white' : 'text-gray-700'}`}>
                                    Ingredients
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className={`flex-1 py-2 rounded-full ml-2 ${tab === 'procedure' ? 'bg-[#FFB47B]' : 'bg-gray-100'}`}
                                onPress={() => setTab('procedure')}
                            >
                                <Text className={`text-center font-semibold ${tab === 'procedure' ? 'text-white' : 'text-gray-700'}`}>
                                    Procedure
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Serving & Items (Removed 'serves' variable here for consistency) */}
                        {(serving || items) && (
                            <View className="flex-row justify-between px-5 mt-4 mb-2">
                                {serving && serving !== 'N/A' && <Text className="text-xs text-gray-400">{serving} serve{Number(serving) > 1 ? 's' : ''}</Text>}
                                {items && <Text className="text-xs text-gray-400">{items} item{items > 1 ? 's' : ''}</Text>}
                            </View>
                        )}

                        {/* Ingredient List */}
                        {tab === 'ingredient' && (
                            <View className="px-5 pb-6">
                                <View className="flex-row justify-between items-center mb-4">
                                    <Text className="text-lg font-semibold text-gray-800">Ingredients</Text>
                                </View>
                                {Array.isArray(ingredients) && ingredients.length > 0 ? (
                                    ingredients.map((ing: { name: string; amount: string; unit: string }, idx: number) => (
                                        <View key={idx} className="flex-row items-center bg-white rounded-xl mb-3 px-4 py-3 shadow-sm">
                                            <Text className="flex-1 font-semibold text-gray-800 capitalize">{ing.name}</Text>
                                            {(ing.amount || ing.unit) && (
                                                <Text className="text-gray-400">
                                                    {ing.amount} {ing.unit}
                                                </Text>
                                            )}
                                        </View>
                                    ))
                                ) : (
                                    <Text className="text-gray-400 text-center">No ingredients available.</Text>
                                )}
                            </View>
                        )}

                        {/* Procedure */}
                        {tab === 'procedure' && (
                            <View className="px-5 py-6">
                                <Text className="text-lg font-semibold text-gray-800 mb-4">Step-by-Step Instructions</Text>
                                {Array.isArray(steps) && steps.length > 0 ? (
                                    steps.map((step: any, idx: number) => (
                                        <View key={idx} className="mb-6 bg-white rounded-xl p-4 shadow-sm">
                                            <View className="flex-row items-center mb-2">
                                                <Text className="text-[#FFB47B] font-bold mr-2">{idx + 1}.</Text>
                                                <Text className="font-semibold text-gray-800 flex-1">{step.title || `Step ${idx + 1}`}</Text>
                                                {step.time && (
                                                    <View className="flex-row items-center ml-2">
                                                        <Ionicons name="time-outline" size={14} color="#FFB47B" />
                                                        <Text className="ml-1 text-xs text-gray-500">{step.time}</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text className="text-gray-700">{step.details}</Text>
                                        </View>
                                    ))
                                ) : (
                                    <Text className="text-gray-400 text-center">No procedure steps available.</Text>
                                )}
                            </View>
                        )}
                    </>
                )}

                {/* Show message if no API details could be loaded */}
                {isApiRecipe && !apiRecipeDetails && !loadingApiDetails && (
                    <View className="px-5 py-6">
                        <View className="bg-white rounded-2xl p-6 items-center">
                            <Ionicons name="information-circle-outline" size={48} color="#FF9966" />
                            <Text className="text-lg font-semibold text-gray-800 mt-4 text-center">
                                Could Not Load Full Details
                            </Text>
                            <Text className="text-gray-600 mt-2 text-center">
                                Unable to fetch detailed recipe information. Please check your API key or try again later.
                            </Text>
                        </View>
                    </View>
                )}
            </ScrollView>

            {isSummaryFullModal && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                    <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />

                </View>
            )}
        </View>
    );
};

export default ViewRecipeScreen;