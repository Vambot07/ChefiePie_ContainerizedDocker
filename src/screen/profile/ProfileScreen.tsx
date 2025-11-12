import { View, Text, TouchableOpacity, Image, ScrollView, Alert, Linking, Modal, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { Ionicons, Feather, MaterialIcons, MaterialCommunityIcons, Fontisto } from '@expo/vector-icons';
import Header from '~/components/Header';
import { useNavigation } from '@react-navigation/native';
import { NavigationProps } from '~/navigation/AppStack';
import { useAuth } from '~/context/AuthContext';
import { getSavedRecipes, getRecipeByUser } from '~/controller/recipe';
import colors from '~/utils/color';


const recipes = [
    {
        id: '1',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
        title: 'Traditional spare ribs baked',
        author: 'Chef John',
        time: '20 min',
    },
    {
        id: '2',
        image: 'https://images.unsplash.com/photo-1519864600265-abb23847ef2c',
        title: 'Spice roasted chicken with flavored rice',
        author: 'Chef Vambot',
        time: '30 min',
    },
];

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

export default function ProfileScreen() {
    const [tab, setTab] = useState<'myrecipe' | 'savedrecipe'>('myrecipe');
    const [imageViewerVisible, setImageViewerVisible] = useState(false);
    const [imageLoading, setImageLoading] = useState(true); 
    const [modalImageLoading, setModalImageLoading] = useState(true); 
    const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
    const [createdRecipes, setCreatedRecipes] = useState<Recipe[]>([]);
    const [loadingUserRecipe, setLoadingUserRecipe] = useState<boolean>(true);
    const [loadingSavedRecipe, setLoadingSavedRecipe] = useState<boolean>(true);
    
    const navigation = useNavigation<NavigationProps>();
    const { user } = useAuth();

    const username = user?.username;
    const profileImage = user?.profileImage;
    const bio = user?.bio;
    const instagram = user?.instagram;
    const youtube = user?.youtube;
    const tiktok = user?.tiktok;

    

    const handleSetting = () => {
        navigation.navigate('Setting');
    };

    // ✅ Function to open social media links
    const openSocialMedia = (url: string, platform: string) => {
        let fullUrl = url;

        // Format URL properly
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

        // ✅ ADD EMPTY ARRAY HERE
        useEffect(() => {
            const fetchSavedRecipes = async () => {
                try {
                    setLoadingSavedRecipe(true);
                    const results = await getSavedRecipes();
                    console.log("Saved Recipes:", results);
                    setSavedRecipes(results as Recipe[]);
                } catch (error) {
                    console.error('Error fetching saved recipes:', error);
                } finally {
                    setLoadingSavedRecipe(false);
                }
            };
            fetchSavedRecipes();
        }, []); 

        // ✅ ADD EMPTY ARRAY HERE
        useEffect(() => {
            const fetchCreatedRecipes = async () => {
                try {
                    setLoadingUserRecipe(true);
                    const results = await getRecipeByUser(user?.uid || '');
                    setCreatedRecipes(results as Recipe[]);
                    console.log("Created Recipes:", results);
                } catch (error) {
                    console.error('Error fetching created recipes:', error);
                } finally {
                    setLoadingUserRecipe(false);
                }
            }
            fetchCreatedRecipes();
        }, []); // ✅ ADD THIS

    // ✅ Handle opening modal - reset modal image loading
    const handleOpenImageViewer = () => {
        if (profileImage) {
            setModalImageLoading(true);
            setImageViewerVisible(true);
        }
    };

    return (
        <View className="flex-1 bg-[#F8F8F8]">
            {/* Top Bar */}
            <Header
                title="Profile"
                showBackButton={true}
                onBack={() => navigation.goBack()}
                rightIcon="settings"
                onRightAction={handleSetting}
            />

            {/* Profile Card */}
            <View className="bg-white mx-4 mt-4 rounded-2xl p-4 shadow-sm">
                {/* Profile Row */}
                <View className="flex-row">
                    {/* ✅ Profile Image with Loading */}
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
                                    {/* ✅ Loading Indicator */}
                                    {imageLoading && (
                                        <View 
                                            style={{
                                                position: 'absolute',
                                                zIndex: 1,
                                            }}
                                        >
                                            <ActivityIndicator size="large" color={colors.lightBrown} />
                                        </View>
                                    )}
                                    
                                    {/* ✅ Profile Image */}
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

                    {/* User Info + Edit Button + Social Icons */}
                    <View className="flex-1 ml-4">
                        <Text className="font-bold text-lg text-gray-800">{username || 'User Name'}</Text>
                        <Text className="text-sm text-gray-500 mb-3">{bio || ''}</Text>

                        <View className='pt-12'>
                            {/* ✅ Flex row with dynamic social icons from left to right */}
                            <View className='flex-row flex-wrap items-center' style={{ gap: 4 }}>
                                {/* Edit Profile Button - Always first */}
                                <TouchableOpacity 
                                    className="bg-[#FFB47B] py-2 px-3 rounded-full" 
                                    onPress={() => navigation.navigate('EditProfile')}
                                >
                                    <Text className="text-white font-semibold text-sm">Edit Profile</Text>
                                </TouchableOpacity>

                                {/* ✅ Social Media Icons - Render dynamically */}
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
                        </View>
                    </View>
                </View>
            </View>

            {/* Food Preferences Card */}
            <View className="bg-white mx-4 mt-4 rounded-2xl shadow-sm">
                <TouchableOpacity
                    className="flex-row items-center justify-between px-6 py-8 active:opacity-70"
                    onPress={() => navigation.navigate('FoodPreference')}
                >
                    {/* Left content */}
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

                    {/* Right arrow */}
                    <MaterialIcons name="arrow-forward-ios" size={18} color={colors.darkBrown} />
                </TouchableOpacity>
            </View>

            {/* Tabs */ }
            <View className="flex-row justify-around mt-6 mb-2 mx-4">
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

            {/* Recipe Cards */}
            <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
                {tab === 'myrecipe' && (
                    <>
                    {loadingUserRecipe ? (
                        <View className="flex-1 items-center justify-center py-20">
                            <ActivityIndicator size="large" color="#FFB47B" />
                            <Text className="text-gray-400 mt-4">Loading created recipes...</Text>
                        </View>

                    ): createdRecipes.length === 0 ? (
                        // ✅ Kalau kosong, tunjuk UI ini
                        <View className="flex-1 items-center justify-center py-20">
                            <MaterialIcons name="create-new-folder" size={64} color="#ccc" />
                            <Text className="text-gray-400 mt-4">No recipe has created by user</Text>
                        </View>
                    ):(
                        createdRecipes.map((item) => (
                    <View key={item.id} className="bg-white rounded-2xl mb-4 overflow-hidden shadow-sm">
                        <Image source={{ uri: item.image }} className="w-full h-36" style={{ resizeMode: 'cover' }} />
                        <View className="p-4">
                            <Text className="font-bold text-base text-gray-800 mb-1">{item.title}</Text>
                            <View className="flex-row items-center justify-between">
                                <Text className="text-xs text-gray-500">By {item.username}</Text>
                                <View className="flex-row items-center space-x-2">
                                    <Ionicons name="time-outline" size={16} color="#FFB47B" />
                                    <Text className="text-xs text-gray-500">{item.totalTime} Mins</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                        ))
                    )}
                    </>
                )} 

               {tab === 'savedrecipe' && (
                <>
                    {loadingSavedRecipe ? (
                        <View className="flex-1 items-center justify-center py-20">
                            <ActivityIndicator size="large" color="#FFB47B" />
                            <Text className="text-gray-400 mt-4">Loading saved recipes...</Text>
                        </View>

                    ): savedRecipes.length === 0 ? (
                        // ✅ Kalau kosong, tunjuk UI ini
                        <View className="flex-1 items-center justify-center py-20">
                            <Ionicons name="bookmark-outline" size={64} color="#ccc" />
                            <Text className="text-gray-400 mt-4">No saved recipes yet</Text>
                        </View>
                    ) : (
                        // ✅ Kalau ada data, map semua item
                        savedRecipes.map((item) => (
                            <View key={item.id} className="bg-white rounded-2xl mb-4 overflow-hidden shadow-sm">
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
                            </View>
                        ))
                    )}
                </>
            )}


            </ScrollView>

            {/* ✅ Image Viewer Modal with Loading */}
            <Modal
                visible={imageViewerVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setImageViewerVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)' }}>
                    {/* Close Button */}
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

                    {/* Image Container */}
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        {/* ✅ Loading Indicator for Modal */}
                        {modalImageLoading && (
                            <View style={{ position: 'absolute', zIndex: 1 }}>
                                <ActivityIndicator size="large" color="#FFB47B" />
                            </View>
                        )}
                        
                        {/* ✅ Fullscreen Image */}
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

                    {/* Username at bottom */}
                    <View style={{ position: 'absolute', bottom: 180, alignSelf: 'center' }}>
                        <Text style={{ color: 'white', fontSize: 18, fontWeight: '600' }}>
                            {username || 'User Name'}
                        </Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
}