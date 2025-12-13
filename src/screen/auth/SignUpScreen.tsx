import { View, Text, TextInput, TouchableOpacity, SafeAreaView, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '~/context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { updateProfileImage } from '~/utils/uploadImage';
import { Ionicons, Feather } from '@expo/vector-icons';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';

const SignUpScreen = () => {
    const navigation = useNavigation<any>();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const { signup, refreshUserData } = useAuth();
    const [loading, setLoading] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], // Updated: Use array instead of MediaTypeOptions
            allowsEditing: true as boolean,
            quality: 0.8,
            aspect: [4, 3],
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setProfileImage(result.assets[0].uri);
            console.log('✅ Profile Image selected:', result.assets[0].uri);
            console.log('📦 Image dimensions:', result.assets[0].width, 'x', result.assets[0].height);
        }
    }

    const handleSignUp = async () => {
        try {
            if (!username || !email || !password || !confirmPassword) {
                Alert.alert('Error', 'Please fill in all fields');
                return;
            }

            if (password !== confirmPassword) {
                Alert.alert('Error', 'Passwords do not match');
                return;
            }

            if (password.length < 6) {
                Alert.alert('Error', 'Password must be at least 6 characters long');
                return;
            }

            setLoading(true);

            // Step 1: Create user account WITHOUT profile image
            setLoadingStatus('Creating your account...');
            console.log('📝 Step 1: Creating account...');
            const response = await signup(username, email, password);

            if (!response.success) {
                Alert.alert('Signup Failed', response.msg + '\nPlease try again later');
                return;
            }

            console.log('✅ Account created successfully!');
            const userId = response.user?.uid;

            if (!userId) {
                throw new Error('User ID not found after signup');
            }

            // Step 2: Upload profile image if selected (now we have userId!)
            if (profileImage) {
                setLoadingStatus('Uploading profile picture...');
                console.log('📤 Step 2: Uploading profile image with userId:', userId);

                const profileImageUrl = await updateProfileImage(profileImage, userId);
                console.log('✅ Profile image uploaded:', profileImageUrl);

                // Step 3: Update user profile with image URL
                setLoadingStatus('Updating profile...');
                console.log('🔄 Step 3: Updating Firestore with image URL...');

                await updateDoc(doc(db, 'users', userId), {
                    profileImage: profileImageUrl
                });

                console.log('✅ Profile updated with image URL!');

                // Step 4: Refresh user data in AuthContext
                setLoadingStatus('Loading your profile...');
                console.log('🔄 Step 4: Refreshing AuthContext...');
                await refreshUserData();
                console.log('✅ AuthContext refreshed!');
            }

            setLoadingStatus('');
            Alert.alert('Success! 🎉', 'Your account has been created successfully!');

        } catch (error) {
            console.error('❌ Signup error:', error);
            Alert.alert('Error', error instanceof Error ? error.message : 'An unknown error occurred');
        } finally {
            setLoading(false);
            setLoadingStatus('');
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <StatusBar style="auto" />
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                    <View className="flex-1 items-center p-5">
                        <Image
                            source={require('../../../assets/ChefiePieLogo.png')}
                            className="w-[120px] h-[120px] mt-5 mb-5 rounded-3xl"
                            resizeMode="contain"
                        />

                        <Text className="text-[28px] font-bold text-[#333] mb-2.5">Create Account</Text>
                        <Text className="text-base text-[#666] mb-[30px]">Join Chefie Pie today!</Text>

                        <View className="w-full gap-[15px]">
                            <TouchableOpacity className="items-center" onPress={pickImage}>
                                {profileImage ? (
                                    <Image source={{ uri: profileImage }} className="w-20 h-20 rounded-[10px]" />
                                ) : (
                                    <View className="w-20 h-20 rounded-[10px] bg-[#f3f3f3] items-center justify-center">
                                        <Feather name="image" size={24} color="#FFB47B" />
                                        <Text className="text-[#aaa] text-xs mt-1">Pick Photo</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            <TextInput
                                className="bg-[#f5f5f5] p-[15px] rounded-[10px] text-base w-full"
                                placeholder="Username"
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />

                            <TextInput
                                className="bg-[#f5f5f5] p-[15px] rounded-[10px] text-base w-full"
                                placeholder="Email"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />

                            <View className="relative w-full">
                                <TextInput
                                    className="bg-[#f5f5f5] p-[15px] pr-[50px] rounded-[10px] text-base w-full"
                                    placeholder="Password"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity
                                    className="absolute right-[15px] top-[15px] z-10"
                                    onPress={() => setShowPassword(!showPassword)}
                                >
                                    <Ionicons
                                        name={showPassword ? "eye-off" : "eye"}
                                        size={20}
                                        color="#666"
                                    />
                                </TouchableOpacity>
                            </View>

                            <View className="relative w-full">
                                <TextInput
                                    className="bg-[#f5f5f5] p-[15px] pr-[50px] rounded-[10px] text-base w-full"
                                    placeholder="Confirm Password"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showConfirmPassword}
                                />
                                <TouchableOpacity
                                    className="absolute right-[15px] top-[15px] z-10"
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    <Ionicons
                                        name={showConfirmPassword ? "eye-off" : "eye"}
                                        size={20}
                                        color="#666"
                                    />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                className={`bg-[#FF9966] p-[15px] rounded-[10px] w-full items-center mt-2.5 ${loading ? 'opacity-70' : ''}`}
                                onPress={handleSignUp}
                                disabled={loading}
                            >
                                {loading ? (
                                    <View className="flex-row items-center justify-center gap-2.5">
                                        <ActivityIndicator size="small" color="#fff" />
                                        <Text className="text-white text-base font-semibold">Creating Account...</Text>
                                    </View>
                                ) : (
                                    <Text className="text-white text-base font-semibold">Sign Up</Text>
                                )}
                            </TouchableOpacity>

                            <View className="flex-row justify-center mt-5 mb-5">
                                <Text className="text-[#666] text-sm">Already have an account? </Text>
                                <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
                                    <Text className="text-[#FF6B6B] text-sm font-semibold">Sign In</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Loading Overlay */}
            {loading && (
                <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/50 justify-center items-center z-[1000]">
                    <View className="bg-white p-[30px] rounded-[15px] items-center min-w-[250px] shadow-lg">
                        <ActivityIndicator size="large" color="#FF9966" />
                        <Text className="text-lg font-semibold text-[#333] mt-[15px] text-center">
                            {loadingStatus || 'Creating your account...'}
                        </Text>
                        <Text className="text-sm text-[#666] mt-2 text-center">Please wait, this may take a moment</Text>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
};

export default SignUpScreen;