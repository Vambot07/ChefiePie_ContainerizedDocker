import { View, Text, TouchableOpacity, Image, ScrollView, Alert, Linking } from 'react-native';
import { useState } from 'react';
import { Ionicons, Feather, MaterialIcons, MaterialCommunityIcons, Fontisto } from '@expo/vector-icons';
import Header from '~/components/Header';
import { useNavigation } from '@react-navigation/native';
import { NavigationProps } from '~/navigation/AppStack';
import { useAuth } from '~/context/AuthContext';
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

export default function ProfileScreen() {
    const [tab, setTab] = useState<'recipe' | 'videos' | 'tag'>('recipe');
    const navigation = useNavigation<NavigationProps>();
    const { user, logout } = useAuth();

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
                    {/* Profile Image */}
                    <View
                        className="w-36 h-36 rounded-full items-center justify-center"
                        style={{ backgroundColor: colors.white, borderWidth: 2, borderColor: colors.lightBrown }}
                    >
                        {profileImage ? (
                            <Image 
                                source={{ uri: profileImage }} 
                                className="w-36 h-36 rounded-full"
                                style={{ resizeMode: 'cover' }} 
                            />
                        ) : (
                            <Fontisto name="male" size={40} color={colors.lightBrown} />
                        )}
                    </View>

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

            {/* Tabs */}
            <View className="flex-row justify-around mt-6 mb-2 mx-4">
                <TouchableOpacity
                    className={`flex-1 py-2 rounded-xl ${tab === 'recipe' ? 'bg-[#FFB47B]' : 'bg-white'}`}
                    onPress={() => setTab('recipe')}
                >
                    <Text className={`text-center font-semibold ${tab === 'recipe' ? 'text-white' : 'text-gray-700'}`}>
                        Recipe
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className={`flex-1 py-2 rounded-xl mx-2 ${tab === 'videos' ? 'bg-[#FFB47B]' : 'bg-white'}`}
                    onPress={() => setTab('videos')}
                >
                    <Text className={`text-center font-semibold ${tab === 'videos' ? 'text-white' : 'text-gray-700'}`}>
                        Videos
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className={`flex-1 py-2 rounded-xl ${tab === 'tag' ? 'bg-[#FFB47B]' : 'bg-white'}`}
                    onPress={() => setTab('tag')}
                >
                    <Text className={`text-center font-semibold ${tab === 'tag' ? 'text-white' : 'text-gray-700'}`}>
                        Tag
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Recipe Cards */}
            <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
                {tab === 'recipe' && recipes.map((item) => (
                    <View key={item.id} className="bg-white rounded-2xl mb-4 overflow-hidden shadow-sm">
                        <Image source={{ uri: item.image }} className="w-full h-36" style={{ resizeMode: 'cover' }} />
                        <View className="p-4">
                            <Text className="font-bold text-base text-gray-800 mb-1">{item.title}</Text>
                            <View className="flex-row items-center justify-between">
                                <Text className="text-xs text-gray-500">By {item.author}</Text>
                                <View className="flex-row items-center space-x-2">
                                    <Ionicons name="time-outline" size={16} color="#FFB47B" />
                                    <Text className="text-xs text-gray-500">{item.time}</Text>
                                    <Ionicons name="ellipsis-horizontal" size={16} color="#FFB47B" />
                                </View>
                            </View>
                        </View>
                    </View>
                ))}

                {tab === 'videos' && (
                    <View className="flex-1 items-center justify-center py-20">
                        <Ionicons name="videocam-outline" size={64} color="#ccc" />
                        <Text className="text-gray-400 mt-4">No videos yet</Text>
                    </View>
                )}

                {tab === 'tag' && (
                    <View className="flex-1 items-center justify-center py-20">
                        <Ionicons name="pricetag-outline" size={64} color="#ccc" />
                        <Text className="text-gray-400 mt-4">No tagged posts yet</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}