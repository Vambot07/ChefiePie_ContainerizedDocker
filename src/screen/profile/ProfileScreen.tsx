import { View, Text, TouchableOpacity, Image, ScrollView, Alert, Linking, Modal, ActivityIndicator, RefreshControl } from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import { Ionicons, Feather, MaterialIcons, MaterialCommunityIcons, Fontisto } from '@expo/vector-icons';
import Header from '~/components/Header';
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
    const [tab, setTab] = useState<'myrecipe' | 'savedrecipe'>('myrecipe');
    const [imageViewerVisible, setImageViewerVisible] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);
    const [modalImageLoading, setModalImageLoading] = useState(true);
    const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
    const [createdRecipes, setCreatedRecipes] = useState<Recipe[]>([]);
    const [loadingUserRecipe, setLoadingUserRecipe] = useState<boolean>(true);
    const [loadingSavedRecipe, setLoadingSavedRecipe] = useState<boolean>(true);
    const [userDetails, setUserDetails] = useState<UserProfile | null>(null);
    const [loadingFetchData, setLoadingFetchData] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false); // ✅ Add refresh state
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

    // ✅ Function to open social media links
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

    // ✅ Build social media icons array dynamically
    const socialMediaIcons: Array<{
        platform: string;
        icon: React.ReactElement;
        url: string;
    }> = [];

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

    // ✅ EXTRACT FETCH LOGIC TO REUSABLE FUNCTION
    const fetchAllData = async (isRefreshing = false) => {
        try {
            // Only show main loading on initial load, not on refresh
            if (!isRefreshing) {
                setLoadingFetchData(true);
            }
            setLoadingSavedRecipe(true);
            setLoadingUserRecipe(true);

            console.log(isRefreshing ? "🔄 Refreshing data..." : "⏳ Fetching initial data...");

            // ✅ STEP 1: Fetch user profile FIRST
            const userDetail = await getUserProfileById(userId);
            setUserDetails(userDetail);
            console.log("✅ User profile loaded!");

            // Profile is now visible!
            if (!isRefreshing) {
                setLoadingFetchData(false);
            }

            // ✅ STEP 2: Fetch recipes in PARALLEL
            console.log("⏳ Fetching recipes in parallel...");
            const [savedResults, createdResults] = await Promise.all([
                getSavedRecipes(userId),
                getRecipeByUser(userId)
            ]);

            setSavedRecipes(savedResults as Recipe[]);
            setCreatedRecipes(createdResults as Recipe[]);
            console.log("✅ All recipes loaded!");

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

    // ✅ Initial fetch on mount
    useEffect(() => {
        console.log("Current User ID: " + currentUserId);
        console.log("Profile User ID: " + userId);
        console.log("viewMode ", viewMode);

        fetchAllData(false);
    }, [userId, currentUserId]);

    // ✅ PULL TO REFRESH HANDLER
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        console.log("🔄 User pulled to refresh!");
        await fetchAllData(true);
        setRefreshing(false);
    }, [userId, currentUserId]);

    // ✅ Refetch user data when screen gains focus
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

    // ✅ Scroll to top when tab changes
    useEffect(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, [tab]);

    // ✅ Handle opening modal
    const handleOpenImageViewer = () => {
        if (profileImage) {
            setModalImageLoading(true);
            setImageViewerVisible(true);
        }
    };

    // ✅ Get current recipes based on tab
    const displayedRecipes = tab === 'myrecipe' ? createdRecipes : savedRecipes;
    const isLoading = tab === 'myrecipe' ? loadingUserRecipe : loadingSavedRecipe;

    return (
        <View className="flex-1 bg-[#F8F8F8]">
            {loadingFetchData ? (
                // ✅ INITIAL LOADING SCREEN (only shows while profile loads)
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
                        rightIcon={(!userId || userId === currentUserId && viewMode === 'profile') ? "settings" : undefined}
                        onRightAction={handleSetting}
                    />

                    {/* ✅ Main Content with Sticky Tabs and Pull-to-Refresh */}
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
                                {/* Profile Card */}
                                <View className="bg-white mx-4 mt-4 rounded-2xl p-4 shadow-sm">
                                    <View className="flex-row">
                                        {/* Profile Image */}
                                        <TouchableOpacity
                                            onPress={handleOpenImageViewer}
                                            activeOpacity={0.8}
                                        >
                                            <View
                                                className="w-36 h-36 rounded-full items-center justify-center"
                                                style={{
                                                    backgroundColor: colors.white,
                                                    borderWidth: 2,
                                                    borderColor: colors.lightBrown
                                                }}
                                            >
                                                {profileImage ? (
                                                    <>
                                                        {imageLoading && (
                                                            <View style={{ position: 'absolute', zIndex: 1 }}>
                                                                <ActivityIndicator size="large" color={colors.lightBrown} />
                                                            </View>
                                                        )}
                                                        <Image
                                                            source={{ uri: profileImage }}
                                                            className="w-36 h-36 rounded-full"
                                                            style={{ resizeMode: 'cover' }}
                                                            onLoadStart={() => setImageLoading(true)}
                                                            onLoadEnd={() => setImageLoading(false)}
                                                            onError={() => setImageLoading(false)}
                                                        />
                                                    </>
                                                ) : (
                                                    <Fontisto name="male" size={40} color={colors.lightBrown} />
                                                )}
                                            </View>
                                        </TouchableOpacity>

                                        {/* User Info */}
                                        <View className="flex-1 ml-4">
                                            <Text className="font-bold text-lg text-gray-800">{username || 'User Name'}</Text>
                                            <Text className="text-sm text-gray-500 mb-3">{bio || ''}</Text>

                                            <View className='pt-8'>
                                                {/* Social Media Icons */}
                                                <View className='flex-row flex-wrap items-center pb-4' style={{ gap: 6 }}>
                                                    {socialMediaIcons.map((social, index) => (
                                                        <TouchableOpacity
                                                            key={index}
                                                            onPress={() => openSocialMedia(social.url, social.platform)}
                                                            activeOpacity={0.7}
                                                        >
                                                            <View
                                                                className="w-9 h-9 rounded-full items-center justify-center"
                                                                style={{ backgroundColor: colors.lightPeach }}
                                                            >
                                                                {social.icon}
                                                            </View>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>

                                                {/* Edit Profile Button */}
                                                {(!userId || userId === currentUserId && viewMode === 'profile') && (
                                                    <TouchableOpacity
                                                        className="bg-[#FFB47B] py-2 px-3 rounded-full self-start"
                                                        onPress={() => navigation.navigate('EditProfile')}
                                                    >
                                                        <Text className="text-white font-semibold text-sm">Edit Profile</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                {/* Food Preferences Card */}
                                {(!userId || userId === currentUserId && viewMode === 'profile') && (
                                    <View className="bg-white mx-4 mt-4 rounded-2xl shadow-sm">
                                        <TouchableOpacity
                                            className="flex-row items-center justify-between px-6 py-8 active:opacity-70"
                                            onPress={() => navigation.navigate('FoodPreference')}
                                        >
                                            <View className="flex-1">
                                                <View className='flex-row'>
                                                    <MaterialCommunityIcons name="food-variant" size={20} color="#FFB47B" />
                                                    <Text className="font-semibold text-base text-gray-800 pl-2">
                                                        My Food Preferences
                                                    </Text>
                                                </View>
                                                <Text className="text-sm text-gray-500 mt-1">
                                                    Diet preferences, allergies, and meal plan settings.
                                                </Text>
                                            </View>
                                            <MaterialIcons name="arrow-forward-ios" size={18} color={colors.darkBrown} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            {/* ✅ Sticky Tabs Section */}
                            <View className="bg-[#F8F8F8] pt-6 pb-2">
                                <View className="flex-row justify-around mx-4">
                                    <TouchableOpacity
                                        className={`flex-1 py-2 rounded-xl ${tab === 'myrecipe' ? 'bg-[#FFB47B]' : 'bg-white'}`}
                                        onPress={() => setTab('myrecipe')}
                                    >
                                        <Text className={`text-center font-semibold ${tab === 'myrecipe' ? 'text-white' : 'text-gray-700'}`}>
                                            User Recipe
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        className={`flex-1 py-2 rounded-xl mx-2 ${tab === 'savedrecipe' ? 'bg-[#FFB47B]' : 'bg-white'}`}
                                        onPress={() => setTab('savedrecipe')}
                                    >
                                        <Text className={`text-center font-semibold ${tab === 'savedrecipe' ? 'text-white' : 'text-gray-700'}`}>
                                            Saved Recipe
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* ✅ Recipe Cards Section - This scrolls under sticky tabs */}
                            <View className="px-4" style={{ minHeight: 600 }}>
                                {isLoading ? (
                                    <View className="items-center justify-center py-20">
                                        <ActivityIndicator size="large" color="#FFB47B" />
                                        <Text className="text-gray-400 mt-4">
                                            {tab === 'myrecipe' ? 'Loading created recipes...' : 'Loading saved recipes...'}
                                        </Text>
                                    </View>
                                ) : displayedRecipes.length === 0 ? (
                                    <View className="items-center justify-center py-20">
                                        {tab === 'myrecipe' ? (
                                            <>
                                                <MaterialIcons name="create-new-folder" size={64} color="#ccc" />
                                                <Text className="text-gray-400 mt-4">No recipe has been created by user</Text>
                                            </>
                                        ) : (
                                            <>
                                                <Ionicons name="bookmark-outline" size={64} color="#ccc" />
                                                <Text className="text-gray-400 mt-4">No saved recipes yet</Text>
                                            </>
                                        )}
                                    </View>
                                ) : (
                                    displayedRecipes.map((item) => (
                                        <TouchableOpacity
                                            key={item.id}
                                            className="bg-white rounded-2xl mb-4 overflow-hidden shadow-sm"
                                            onPress={() => navigation.navigate('ViewRecipe', { recipe: item, viewMode, profileUserId: userId })}
                                        >
                                            <Image source={{ uri: item.image }} className="w-full h-36" style={{ resizeMode: 'cover' }} />
                                            <View className="p-4">
                                                <Text className="font-bold text-base text-gray-800 mb-1">{item.title}</Text>
                                                <View className="flex-row items-center justify-between">
                                                    <Text className="text-xs text-gray-500">By {item.username || 'Unknown'}</Text>
                                                    <View className="flex-row items-center space-x-2">
                                                        <Ionicons name="time-outline" size={16} color="#FFB47B" />
                                                        <Text className="text-xs text-gray-500">{item.totalTime} Mins</Text>
                                                    </View>
                                                </View>
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