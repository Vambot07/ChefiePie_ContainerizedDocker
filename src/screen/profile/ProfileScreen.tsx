import { View, Text, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import React, { useState } from 'react';
import { Ionicons, Feather } from '@expo/vector-icons';
import Header from '~/components/Header';
import { useNavigation } from '@react-navigation/native';
import { NavigationProps } from '~/navigation/AppStack';
import { auth } from '../../../firebaseConfig';

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

    const handleLogout = async () => {
        try {
            await auth.signOut();
            // The user will be redirected to the AuthStack by the RootNavigator
        } catch (error) {
            console.error("Error signing out: ", error);
            Alert.alert("Logout Error", "Could not log out. Please try again.");
        }
    };

    return (
        <View className="flex-1 bg-[#F8F8F8]">
            {/* Top Bar */}
            <Header
                title="Profile"
                showBackButton={true}
                onBack={() => navigation.goBack()}
                rightIcon="log-out-outline"
                onRightAction={handleLogout}
            />

            {/* Profile Card */}
            <View className="bg-white mx-4 mt-4 rounded-2xl p-4 shadow-sm">
                <View className="flex-row items-center justify-between">
                    <Image
                        source={require('../../../assets/LogoUser.jpeg')}
                        className="w-16 h-16 rounded-full"
                        resizeMode="contain"
                    />
                    <View className="flex-row flex-1 justify-around ml-4">
                        <View className="items-center">
                            <Text className="font-bold text-base">4</Text>
                            <Text className="text-xs text-gray-500">Recipe</Text>
                        </View>
                        <View className="items-center">
                            <Text className="font-bold text-base">2.5M</Text>
                            <Text className="text-xs text-gray-500">Followers</Text>
                        </View>
                        <View className="items-center">
                            <Text className="font-bold text-base">259</Text>
                            <Text className="text-xs text-gray-500">Following</Text>
                        </View>
                    </View>
                    <TouchableOpacity className="bg-[#FFB47B] p-2 rounded-full ml-2">
                        <Feather name="plus" size={20} color="white" />
                    </TouchableOpacity>
                </View>
                <View className="mt-4">
                    <Text className="font-bold text-base text-gray-800">Vambot</Text>
                    <Text className="text-xs text-gray-500">Chef</Text>
                    <Text className="text-xs text-gray-700">Passionate about food and life 🍳🍔🍕</Text>
                    <TouchableOpacity>
                        <Text className="text-xs text-[#FFB47B] mt-1">More...</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Tabs */}
            <View className="flex-row justify-around mt-6 mb-2 mx-4">
                <TouchableOpacity
                    className={`flex-1 py-2 rounded-xl ${tab === 'recipe' ? 'bg-[#FFB47B]' : 'bg-white'}`}
                    onPress={() => setTab('recipe')}
                >
                    <Text className={`text-center font-semibold ${tab === 'recipe' ? 'text-white' : 'text-gray-700'}`}>Recipe</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className={`flex-1 py-2 rounded-xl mx-2 ${tab === 'videos' ? 'bg-[#FFB47B]' : 'bg-white'}`}
                    onPress={() => setTab('videos')}
                >
                    <Text className={`text-center font-semibold ${tab === 'videos' ? 'text-white' : 'text-gray-700'}`}>Videos</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className={`flex-1 py-2 rounded-xl ${tab === 'tag' ? 'bg-[#FFB47B]' : 'bg-white'}`}
                    onPress={() => setTab('tag')}
                >
                    <Text className={`text-center font-semibold ${tab === 'tag' ? 'text-white' : 'text-gray-700'}`}>Tag</Text>
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
                {/* Add similar cards for Videos and Tag if needed */}
            </ScrollView>
        </View>
    );
}
