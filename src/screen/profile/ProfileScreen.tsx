import { View, Text, TouchableOpacity, Image, ScrollView, Alert, Linking, Modal, ActivityIndicator, RefreshControl } from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import { Ionicons, Feather, MaterialIcons, MaterialCommunityIcons, Fontisto } from '@expo/vector-icons';
import Header from '~/components/partials/Header';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '~/context/AuthContext';
import { getSavedRecipes, getRecipeByUser, getUserProfileById } from '~/controller/recipe';
import colors from '~/utils/color';

type RootStackParamList = {
    EditProfile: undefined;
    FoodPreference: undefined;
    Setting: undefined;
    ViewRecipe: {
        recipe: Recipe,
        viewMode: string,
        profileUserId?: string;
    }
}
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Recipe {
    id: string;
    title: string;
    username: string;
    profileImage: any;
    image: string;
    totalTime?: string;
    difficulty?: string;
    source: string;
    isPrivate?: boolean;
    userId?: string;
}

interface UserProfile {
    uid: string;
    username: string;
    email: string;
    profileImage: string | null;
    bio: string | null;
    instagram: string | null;
    youtube: string | null;
    tiktok: string | null;
    dietaryRestrictions?: string[];
    cookingGoal?: string;
    ingredientsToAvoid?: string[];
    servingSize?: number;
}


export default function ProfileScreen() {
    const [tab, setTab] = useState<'myrecipe' | 'savedrecipe' | 'privaterecipe'>('myrecipe');
    const [imageViewerVisible, setImageViewerVisible] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);
    const [modalImageLoading, setModalImageLoading] = useState(true);
    const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
    const [createdRecipes, setCreatedRecipes] = useState<Recipe[]>([]);
    const [privateRecipes, setPrivateRecipes] = useState<Recipe[]>([]);
    const [loadingUserRecipe, setLoadingUserRecipe] = useState<boolean>(true);
    const [loadingSavedRecipe, setLoadingSavedRecipe] = useState<boolean>(true);
    const [userDetails, setUserDetails] = useState<UserProfile | null>(null);
    const [loadingFetchData, setLoadingFetchData] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const scrollViewRef = React.useRef<ScrollView>(null);

    const navigation = useNavigation<NavigationProp>();
    const { user } = useAuth();
    const route = useRoute();

    const { userId, viewMode } = (route.params as any) || { userId: null };
    const currentUserId = user?.uid;

    const username = userDetails?.username || user?.username;
    const profileImage = userDetails?.profileImage || user?.profileImage;
    const bio = userDetails?.bio || user?.bio;
    const instagram = userDetails?.instagram || '';
    const youtube = userDetails?.youtube || '';
    const tiktok = userDetails?.tiktok || '';

    const handleSetting = () => {
        navigation.navigate('Setting');
    };

    // Function to open social media links
    const openSocialMedia = (url: string, platform: string) => {
        let fullUrl = url;

        if (!url.startsWith('http')) {
            if (platform === 'instagram') {
                fullUrl = `https://instagram.com/${url.replace('@', '')}`;
            } else if (platform === 'youtube') {
                fullUrl = url.includes('youtube.com') ? url : `https://youtube.com/@${url.replace('@', '')}`;
            } else if (platform === 'tiktok') {
                fullUrl = `https://www.tiktok.com/@${url.replace('@', '')}`;
            }
        }

        Linking.openURL(fullUrl).catch(() => {
            Alert.alert('Error', `Cannot open ${platform}`);
        });
    };

    // Build social media icons array dynamically
    const socialMediaIcons: {
        platform: string;
        icon: React.ReactElement;
        url: string;
    }[] = [];

    if (instagram) {
        socialMediaIcons.push({
            platform: 'instagram',
            icon: <Feather name="instagram" size={18} color={colors.darkBrown} />,
            url: instagram
        });
    }

    if (youtube) {
        socialMediaIcons.push({
            platform: 'youtube',
            icon: <Feather name="youtube" size={18} color={colors.darkBrown} />,
            url: youtube
        });
    }

    if (tiktok) {
        socialMediaIcons.push({
            platform: 'tiktok',
            icon: <Ionicons name="logo-tiktok" size={18} color={colors.darkBrown} />,
            url: tiktok
        });
    }

    // EXTRACT FETCH LOGIC TO REUSABLE FUNCTION
    const fetchAllData = async (isRefreshing = false) => {
        try {
            // Only show main loading on initial load, not on refresh
            if (!isRefreshing) {
                setLoadingFetchData(true);
            }
            setLoadingSavedRecipe(true);
            setLoadingUserRecipe(true);

            console.log(isRefreshing ? "🔄 Refreshing data..." : "⏳ Fetching initial data...");

            // STEP 1: Fetch user profile FIRST
            const userDetail = await getUserProfileById(userId);
            setUserDetails(userDetail);
            console.log("✅ User profile loaded!");

            // Profile is now visible!
            if (!isRefreshing) {
                setLoadingFetchData(false);
            }

            // STEP 2: Fetch recipes in PARALLEL
            console.log("⏳ Fetching recipes in parallel...");
            const [savedResults, createdResults] = await Promise.all([
                getSavedRecipes(userId),
                getRecipeByUser(userId)
            ]);

            // Filter out private recipes that don't belong to the current user
            const allSaved = savedResults as Recipe[];
            const visibleSavedRecipes = allSaved.filter(recipe => {
                // Show if recipe is not private
                if (!recipe.isPrivate) return true;

                // Show if recipe is private but belongs to current user
                if (recipe.isPrivate && recipe.userId === currentUserId) return true;

                // Hide if recipe is private and belongs to someone else
                return false;
            });

            setSavedRecipes(visibleSavedRecipes);
            console.log(`🔒 Filtered ${allSaved.length - visibleSavedRecipes.length} private saved recipes from other users`);

            // Separate public and private recipes
            const allCreated = createdResults as Recipe[];
            const publicRecipes = allCreated.filter(recipe => !recipe.isPrivate);
            const privateRecipesFiltered = allCreated.filter(recipe => recipe.isPrivate);

            setCreatedRecipes(publicRecipes);
            setPrivateRecipes(privateRecipesFiltered);

            console.log("✅ All recipes loaded!");
            console.log(`📊 Public: ${publicRecipes.length}, Private: ${privateRecipesFiltered.length}, Saved: ${visibleSavedRecipes.length}`);

        } catch (error) {
            console.error('❌ Error fetching data:', error);
            if (!isRefreshing) {
                setLoadingFetchData(false);
            }
            Alert.alert('Error', 'Failed to load data. Please try again.');
        } finally {
            setLoadingSavedRecipe(false);
            setLoadingUserRecipe(false);
        }
    };

    // Initial fetch on mount
    useEffect(() => {
        console.log("Current User ID: " + currentUserId);
        console.log("Profile User ID: " + userId);
        console.log("viewMode ", viewMode);

        fetchAllData(false);
    }, [userId, currentUserId]);

    // PULL TO REFRESH HANDLER
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        console.log("🔄 User pulled to refresh!");
        await fetchAllData(true);
        setRefreshing(false);
    }, [userId, currentUserId]);

    // Refetch user data when screen gains focus
    useFocusEffect(
        useCallback(() => {
            if (!userId || userId === currentUserId) {
                fetchAllData(true);
                const refetchUserData = async () => {
                    try {
                        const userDetail = await getUserProfileById(userId || currentUserId);
                        setUserDetails(userDetail);
                    } catch (error) {
                        console.error('Error refetching user data:', error);
                    }
                };

                refetchUserData();
            }
        }, [userId, currentUserId])
    );

    // Scroll to top when tab changes
    useEffect(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, [tab]);

    // Handle opening modal
    const handleOpenImageViewer = () => {
        if (profileImage) {
            setModalImageLoading(true);
            setImageViewerVisible(true);
        }
    };

    // Get current recipes based on tab
    const displayedRecipes =
        tab === 'myrecipe' ? createdRecipes :
            tab === 'privaterecipe' ? privateRecipes :
                savedRecipes;
    const isLoading = tab === 'myrecipe' || tab === 'privaterecipe' ? loadingUserRecipe : loadingSavedRecipe;

    return (
        <View className="flex-1"
            style={{ backgroundColor: colors.secondary }}>
            {loadingFetchData ? (
                // INITIAL LOADING SCREEN (only shows while profile loads)
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#FFB47B" />
                    <Text className="text-gray-500 mt-4 text-base">Loading profile...</Text>
                </View>
            ) : (
                <>
                    {/* Top Bar */}
                    <Header
                        title="Profile"
                        showBackButton={true}
                        onBack={() => navigation.goBack()}
                        rightIcon={(!userId || userId === currentUserId && viewMode === 'profile') ? "settings-outline" : undefined}
                        onRightAction={handleSetting}
                    />

                    {/* Main Content with Sticky Tabs and Pull-to-Refresh */}
                    <View className="flex-1">
                        <ScrollView
                            ref={scrollViewRef}
                            showsVerticalScrollIndicator={false}
                            stickyHeaderIndices={[1]}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    colors={['#FFB47B']} // Android
                                    tintColor="#FFB47B" // iOS
                                    title="Pull to refresh" // iOS
                                    titleColor="#666" // iOS
                                />
                            }
                        >
                            {/* Profile Header Section - This will scroll away */}
                            <View>
                                {/* Profile Card with Solid Background */}
                                <View
                                    className="mx-4 mt-4 rounded-3xl overflow-hidden p-6"
                                    style={{
                                        backgroundColor: colors.lightPeach,
                                        shadowColor: '#FF914D',
                                        shadowOffset: { width: 0, height: 6 },
                                        shadowOpacity: 0.2,
                                        shadowRadius: 12,
                                        elevation: 8
                                    }}
                                >
                                    {/* Profile Image & Basic Info */}
                                    <View className="items-center mb-4">
                                        <TouchableOpacity
                                            onPress={handleOpenImageViewer}
                                            activeOpacity={0.8}
                                        >
                                            <View
                                                className="w-28 h-28 rounded-full items-center justify-center"
                                                style={{
                                                    backgroundColor: colors.white,
                                                    borderWidth: 4,
                                                    borderColor: '#FF914D',
                                                    shadowColor: '#000',
                                                    shadowOffset: { width: 0, height: 4 },
                                                    shadowOpacity: 0.2,
                                                    shadowRadius: 8,
                                                    elevation: 6,
                                                }}
                                            >
                                                {profileImage ? (
                                                    <>
                                                        {imageLoading && (
                                                            <View style={{ position: 'absolute', zIndex: 1 }}>
                                                                <ActivityIndicator size="large" color="#FF914D" />
                                                            </View>
                                                        )}
                                                        <Image
                                                            source={{ uri: profileImage }}
                                                            className="w-28 h-28 rounded-full"
                                                            style={{ resizeMode: 'cover' }}
                                                            onLoadStart={() => setImageLoading(true)}
                                                            onLoadEnd={() => setImageLoading(false)}
                                                            onError={() => setImageLoading(false)}
                                                        />
                                                    </>
                                                ) : (
                                                    <Fontisto name="male" size={36} color="#FF914D" />
                                                )}
                                            </View>
                                        </TouchableOpacity>

                                        <Text className="font-bold text-2xl text-gray-800 mt-4">{username || 'User Name'}</Text>
                                        {bio && <Text className="text-sm text-gray-600 text-center mt-2 px-4">{bio}</Text>}
                                    </View>

                                    {/* Stats Section */}
                                    <View className="flex-row justify-around py-4 px-4 bg-white/60 rounded-2xl mb-4">
                                        <View className="items-center flex-1">
                                            <Text className="font-bold text-2xl text-gray-800">{createdRecipes.length}</Text>
                                            <Text className="text-xs text-gray-600 mt-1">Recipes</Text>
                                        </View>
                                        <View className="w-px bg-gray-300" />
                                        <View className="items-center flex-1">
                                            <Text className="font-bold text-2xl text-gray-800">{savedRecipes.length}</Text>
                                            <Text className="text-xs text-gray-600 mt-1">Saved</Text>
                                        </View>
                                        <View className="w-px bg-gray-300" />
                                        <View className="items-center flex-1">
                                            <Text className="font-bold text-2xl text-gray-800">{privateRecipes.length}</Text>
                                            <Text className="text-xs text-gray-600 mt-1">Private</Text>
                                        </View>
                                    </View>

                                    {/* Social Media Icons */}
                                    {socialMediaIcons.length > 0 && (
                                        <View className="flex-row justify-center items-center mb-4" style={{ gap: 12 }}>
                                            {socialMediaIcons.map((social, index) => (
                                                <TouchableOpacity
                                                    key={index}
                                                    onPress={() => openSocialMedia(social.url, social.platform)}
                                                    activeOpacity={0.7}
                                                >
                                                    <View
                                                        className="w-11 h-11 rounded-full items-center justify-center"
                                                        style={{
                                                            backgroundColor: 'white',
                                                            shadowColor: '#000',
                                                            shadowOffset: { width: 0, height: 2 },
                                                            shadowOpacity: 0.1,
                                                            shadowRadius: 4,
                                                            elevation: 3,
                                                        }}
                                                    >
                                                        {social.icon}
                                                    </View>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}

                                    {/* Edit Profile Button */}
                                    {(!userId || userId === currentUserId && viewMode === 'profile') && (
                                        <TouchableOpacity
                                            className="py-3 rounded-full"
                                            style={{
                                                backgroundColor: '#FF914D',
                                                shadowColor: '#FF914D',
                                                shadowOffset: { width: 0, height: 4 },
                                                shadowOpacity: 0.3,
                                                shadowRadius: 8,
                                                elevation: 6,
                                            }}
                                            onPress={() => navigation.navigate('EditProfile')}
                                            activeOpacity={0.8}
                                        >
                                            <Text className="text-white font-bold text-center text-base">Edit Profile</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Food Preferences Card */}
                                {(!userId || userId === currentUserId && viewMode === 'profile') && (
                                    <View className="mx-4 mt-4 rounded-2xl overflow-hidden shadow-md" style={{ elevation: 4 }}>
                                        <TouchableOpacity
                                            className="flex-row items-center justify-between px-6 py-5 active:opacity-70"
                                            style={{ backgroundColor: colors.lightPeach }}
                                            onPress={() => navigation.navigate('FoodPreference')}
                                        >
                                            <View className="flex-row items-center flex-1">
                                                <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: '#FFF4E0' }}>
                                                    <MaterialCommunityIcons name="food-variant" size={24} color="#FF914D" />
                                                </View>
                                                <View className="flex-1 ml-4">
                                                    <Text className="font-bold text-base text-gray-800">
                                                        Food Preferences
                                                    </Text>
                                                    <Text className="text-xs text-gray-500 mt-0.5">
                                                        Dietary restrictions & meal settings
                                                    </Text>
                                                </View>
                                            </View>
                                            <MaterialIcons name="arrow-forward-ios" size={18} color="#FF914D" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            {/* Sticky Tabs Section */}
                            <View
                                className="pt-6 pb-2"
                                style={{
                                    zIndex: 100,
                                    elevation: 10,
                                    backgroundColor: colors.secondary
                                }}
                            >
                                <View className="flex-row justify-around mx-4" style={{ gap: 8 }}>
                                    <TouchableOpacity
                                        className="flex-1 py-3 rounded-2xl relative"
                                        style={{
                                            backgroundColor: tab === 'myrecipe' ? '#FF914D' : 'white',
                                            shadowColor: tab === 'myrecipe' ? '#FF914D' : '#000',
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: tab === 'myrecipe' ? 0.3 : 0.1,
                                            shadowRadius: 4,
                                            elevation: tab === 'myrecipe' ? 4 : 2,
                                        }}
                                        onPress={() => setTab('myrecipe')}
                                        activeOpacity={0.8}
                                    >
                                        <Text className={`text-center font-bold text-sm ${tab === 'myrecipe' ? 'text-white' : 'text-gray-700'}`}>
                                            My Recipes
                                        </Text>
                                        {createdRecipes.length > 0 && (
                                            <View
                                                className="absolute -top-2 -right-2 rounded-full px-2 py-0.5 min-w-[20px] items-center justify-center"
                                                style={{
                                                    backgroundColor: tab === 'myrecipe' ? '#FFF4E0' : '#FF914D',
                                                }}
                                            >
                                                <Text className={`text-xs font-bold ${tab === 'myrecipe' ? 'text-[#FF914D]' : 'text-white'}`}>
                                                    {createdRecipes.length}
                                                </Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        className="flex-1 py-3 rounded-2xl relative"
                                        style={{
                                            backgroundColor: tab === 'savedrecipe' ? '#FF914D' : 'white',
                                            shadowColor: tab === 'savedrecipe' ? '#FF914D' : '#000',
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: tab === 'savedrecipe' ? 0.3 : 0.1,
                                            shadowRadius: 4,
                                            elevation: tab === 'savedrecipe' ? 4 : 2,
                                        }}
                                        onPress={() => setTab('savedrecipe')}
                                        activeOpacity={0.8}
                                    >
                                        <Text className={`text-center font-bold text-sm ${tab === 'savedrecipe' ? 'text-white' : 'text-gray-700'}`}>
                                            Saved
                                        </Text>
                                        {savedRecipes.length > 0 && (
                                            <View
                                                className="absolute -top-2 -right-2 rounded-full px-2 py-0.5 min-w-[20px] items-center justify-center"
                                                style={{
                                                    backgroundColor: tab === 'savedrecipe' ? '#FFF4E0' : '#FF914D',
                                                }}
                                            >
                                                <Text className={`text-xs font-bold ${tab === 'savedrecipe' ? 'text-[#FF914D]' : 'text-white'}`}>
                                                    {savedRecipes.length}
                                                </Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>

                                    {(!userId || userId === currentUserId) && (
                                        <TouchableOpacity
                                            className="flex-1 py-3 rounded-2xl relative"
                                            style={{
                                                backgroundColor: tab === 'privaterecipe' ? '#FF914D' : 'white',
                                                shadowColor: tab === 'privaterecipe' ? '#FF914D' : '#000',
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: tab === 'privaterecipe' ? 0.3 : 0.1,
                                                shadowRadius: 4,
                                                elevation: tab === 'privaterecipe' ? 4 : 2,
                                            }}
                                            onPress={() => setTab('privaterecipe')}
                                            activeOpacity={0.8}
                                        >
                                            <Text className={`text-center font-bold text-sm ${tab === 'privaterecipe' ? 'text-white' : 'text-gray-700'}`}>
                                                Private
                                            </Text>
                                            {privateRecipes.length > 0 && (
                                                <View
                                                    className="absolute -top-2 -right-2 rounded-full px-2 py-0.5 min-w-[20px] items-center justify-center"
                                                    style={{
                                                        backgroundColor: tab === 'privaterecipe' ? '#FFF4E0' : '#FF914D',
                                                    }}
                                                >
                                                    <Text className={`text-xs font-bold ${tab === 'privaterecipe' ? 'text-[#FF914D]' : 'text-white'}`}>
                                                        {privateRecipes.length}
                                                    </Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>

                            {/* Recipe Cards Section - This scrolls under sticky tabs */}
                            <View className="px-4" style={{ minHeight: 600 }}>
                                {isLoading ? (
                                    <View className="items-center justify-center py-20">
                                        <ActivityIndicator size="large" color="#FF914D" />
                                        <Text className="text-gray-400 mt-4 font-medium">
                                            {tab === 'myrecipe' ? 'Loading recipes...' :
                                                tab === 'privaterecipe' ? 'Loading private recipes...' :
                                                    'Loading saved recipes...'}
                                        </Text>
                                    </View>
                                ) : displayedRecipes.length === 0 ? (
                                    <View className="items-center justify-center py-16 mt-8">
                                        <View
                                            className="w-32 h-32 rounded-full items-center justify-center mb-6"
                                            style={{
                                                backgroundColor: '#FFF4E0',
                                            }}
                                        >
                                            {tab === 'myrecipe' ? (
                                                <MaterialIcons name="restaurant-menu" size={64} color="#FFB47B" />
                                            ) : tab === 'privaterecipe' ? (
                                                <Ionicons name="lock-closed-outline" size={64} color="#FFB47B" />
                                            ) : (
                                                <Ionicons name="bookmark-outline" size={64} color="#FFB47B" />
                                            )}
                                        </View>
                                        <Text className="text-gray-700 font-bold text-lg mb-2">
                                            {tab === 'myrecipe' ? 'No Recipes Yet' :
                                                tab === 'privaterecipe' ? 'No Private Recipes' :
                                                    'No Saved Recipes'}
                                        </Text>
                                        <Text className="text-gray-400 text-sm text-center px-8">
                                            {tab === 'myrecipe' ? 'Start creating your first recipe and share it with others!' :
                                                tab === 'privaterecipe' ? 'Create recipes and mark them as private to keep them just for you.' :
                                                    'Save recipes you love to access them anytime.'}
                                        </Text>
                                    </View>
                                ) : (
                                    displayedRecipes.map((item) => (
                                        <TouchableOpacity
                                            key={item.id}
                                            className="bg-white rounded-3xl mb-4 overflow-hidden"
                                            style={{
                                                shadowColor: '#000',
                                                shadowOffset: { width: 0, height: 3 },
                                                shadowOpacity: 0.15,
                                                shadowRadius: 8,
                                                elevation: 5,
                                            }}
                                            onPress={() => navigation.navigate('ViewRecipe', { recipe: item, viewMode, profileUserId: userId })}
                                            activeOpacity={0.9}
                                        >
                                            <View className="relative">
                                                <Image
                                                    source={{ uri: item.image }}
                                                    className="w-full h-48"
                                                    style={{ resizeMode: 'cover' }}
                                                />
                                                {/* Solid Dark Overlay */}
                                                <View
                                                    style={{
                                                        position: 'absolute',
                                                        bottom: 0,
                                                        left: 0,
                                                        right: 0,
                                                        height: 100,
                                                        backgroundColor: 'rgba(0,0,0,0.6)',
                                                    }}
                                                />
                                                {/* Title Overlay */}
                                                <View className="absolute bottom-0 left-0 right-0 p-4">
                                                    <Text className="font-bold text-lg text-white mb-1" numberOfLines={2}>
                                                        {item.title}
                                                    </Text>
                                                    <View className="flex-row items-center justify-between">
                                                        <Text className="text-xs text-white/90">By {item.username || 'Unknown'}</Text>
                                                        {item.totalTime && (
                                                            <View className="flex-row items-center bg-white/20 px-2 py-1 rounded-full">
                                                                <Ionicons name="time-outline" size={14} color="white" />
                                                                <Text className="text-xs text-white ml-1 font-medium">{item.totalTime} mins</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                </View>
                                                {/* Private Badge */}
                                                {item.isPrivate && (
                                                    <View className="absolute top-3 right-3 bg-gray-900/80 px-3 py-1.5 rounded-full flex-row items-center">
                                                        <Ionicons name="lock-closed" size={12} color="white" />
                                                        <Text className="text-white text-xs font-bold ml-1">PRIVATE</Text>
                                                    </View>
                                                )}
                                                {/* Difficulty Badge (if available) */}
                                                {item.difficulty && (
                                                    <View className="absolute top-3 left-3 bg-[#FF914D] px-3 py-1.5 rounded-full">
                                                        <Text className="text-white text-xs font-bold">{item.difficulty}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    ))
                                )}
                            </View>
                        </ScrollView>
                    </View>

                    {/* Image Viewer Modal */}
                    <Modal
                        visible={imageViewerVisible}
                        transparent={true}
                        animationType="fade"
                        onRequestClose={() => setImageViewerVisible(false)}
                    >
                        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)' }}>
                            <TouchableOpacity
                                onPress={() => setImageViewerVisible(false)}
                                style={{
                                    position: 'absolute',
                                    top: 50,
                                    right: 20,
                                    zIndex: 10,
                                }}
                            >
                                <View
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 20,
                                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Ionicons name="close" size={28} color="white" />
                                </View>
                            </TouchableOpacity>

                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                {modalImageLoading && (
                                    <View style={{ position: 'absolute', zIndex: 1 }}>
                                        <ActivityIndicator size="large" color="#FFB47B" />
                                    </View>
                                )}

                                {profileImage && (
                                    <Image
                                        source={{ uri: profileImage }}
                                        style={{
                                            width: '90%',
                                            height: '90%',
                                            resizeMode: 'contain',
                                        }}
                                        onLoadStart={() => setModalImageLoading(true)}
                                        onLoadEnd={() => setModalImageLoading(false)}
                                        onError={() => setModalImageLoading(false)}
                                    />
                                )}
                            </View>

                            <View style={{ position: 'absolute', bottom: 180, alignSelf: 'center' }}>
                                <Text style={{ color: 'white', fontSize: 18, fontWeight: '600' }}>
                                    {username || 'User Name'}
                                </Text>
                            </View>
                        </View>
                    </Modal>
                </>
            )}
        </View>
    );
}