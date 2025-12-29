import { View, Text, TextInput, TouchableOpacity, SafeAreaView, Image, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '~/context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { updateProfileImage } from '~/utils/uploadImage';
import { Ionicons, Feather, AntDesign, MaterialIcons } from '@expo/vector-icons';
import { signInWithGoogle } from '~/utils/socialAuth';

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
            mediaTypes: ['images'],
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

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                Alert.alert('Error', 'Please enter a valid email address');
                return;
            }

            if (password !== confirmPassword) {
                Alert.alert('Error', 'Passwords do not match. Please try again.');
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

    const handleGoogleSignUp = async () => {
        try {
            setLoading(true);
            setLoadingStatus('Signing up with Google...');
            const result = await signInWithGoogle();

            if (result.success) {
                Alert.alert('Success!', 'Your account has been created successfully!');
            } else {
                Alert.alert('Sign Up Failed', result.msg);
            }
        } catch (error) {
            console.error('Google sign up error:', error);
            Alert.alert('Error', 'An unexpected error occurred');
        } finally {
            setLoading(false);
            setLoadingStatus('');
        }
    };

    const handleFacebookSignUp = () => {
        Alert.alert('Coming Soon', 'Facebook Sign-Up will be implemented soon!');
    };

    return (
        <SafeAreaView className="flex-1 bg-secondary">
            <StatusBar style="dark" />
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={{ paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                >
                    <View className="items-center pt-10 px-6">
                        {/* Logo Container with Enhanced Design */}
                        <View className="bg-white rounded-3xl p-3 mb-3"
                            style={{
                                shadowColor: '#FF914D',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.15,
                                shadowRadius: 12,
                                elevation: 8
                            }}
                        >
                            <Image
                                source={require('../../../assets/ChefiePieLogo.png')}
                                className="w-[70px] h-[70px] rounded-2xl"
                                resizeMode="contain"
                            />
                        </View>

                        <Text className="text-[24px] font-bold text-darkBrown mb-1">Create Account</Text>
                        <Text className="text-sm text-lightBrown mb-4">Join Chefie Pie today!</Text>

                        <View className="w-full gap-3">
                            {/* Profile Image Picker */}
                            <TouchableOpacity
                                className="items-center mb-1"
                                onPress={pickImage}
                                activeOpacity={0.7}
                            >
                                {profileImage ? (
                                    <View className="relative">
                                        <Image
                                            source={{ uri: profileImage }}
                                            className="w-20 h-20 rounded-full border-3 border-primary"
                                            style={{
                                                shadowColor: '#000',
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: 0.2,
                                                shadowRadius: 4,
                                                elevation: 4
                                            }}
                                        />
                                        <View className="absolute bottom-0 right-0 bg-primary rounded-full p-1.5"
                                            style={{
                                                shadowColor: '#FF914D',
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: 0.3,
                                                shadowRadius: 3,
                                                elevation: 3
                                            }}
                                        >
                                            <Feather name="edit-2" size={14} color="white" />
                                        </View>
                                    </View>
                                ) : (
                                    <View className="w-20 h-20 rounded-full bg-white items-center justify-center border-3 border-dashed border-primary/30"
                                        style={{
                                            shadowColor: '#000',
                                            shadowOffset: { width: 0, height: 1 },
                                            shadowOpacity: 0.1,
                                            shadowRadius: 4,
                                            elevation: 2
                                        }}
                                    >
                                        <Feather name="camera" size={24} color="#FF914D" />
                                        <Text className="text-primary text-[10px] mt-1 font-semibold">Add Photo</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            {/* Username Input with Icon */}
                            <View className="relative">
                                <View className="absolute left-4 top-4 z-10">
                                    <Ionicons name="person-outline" size={22} color="#A1887F" />
                                </View>
                                <TextInput
                                    className="bg-white pl-14 pr-4 py-4 rounded-2xl text-base w-full text-darkBrown"
                                    placeholder="Username"
                                    placeholderTextColor="#A1887F"
                                    value={username}
                                    onChangeText={setUsername}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    style={{
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.05,
                                        shadowRadius: 3,
                                        elevation: 2
                                    }}
                                />
                            </View>

                            {/* Email Input with Icon */}
                            <View className="relative">
                                <View className="absolute left-4 top-4 z-10">
                                    <MaterialIcons name="email" size={22} color="#A1887F" />
                                </View>
                                <TextInput
                                    className="bg-white pl-14 pr-4 py-4 rounded-2xl text-base w-full text-darkBrown"
                                    placeholder="Email"
                                    placeholderTextColor="#A1887F"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    style={{
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.05,
                                        shadowRadius: 3,
                                        elevation: 2
                                    }}
                                />
                            </View>

                            {/* Password Input with Icon */}
                            <View className="relative">
                                <View className="absolute left-4 top-4 z-10">
                                    <Ionicons name="lock-closed-outline" size={22} color="#A1887F" />
                                </View>
                                <TextInput
                                    className="bg-white pl-14 pr-14 py-4 rounded-2xl text-base w-full text-darkBrown"
                                    placeholder="Password"
                                    placeholderTextColor="#A1887F"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    style={{
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.05,
                                        shadowRadius: 3,
                                        elevation: 2
                                    }}
                                />
                                <TouchableOpacity
                                    className="absolute right-4 top-4 z-10"
                                    onPress={() => setShowPassword(!showPassword)}
                                >
                                    <Ionicons
                                        name={showPassword ? "eye-off" : "eye"}
                                        size={22}
                                        color="#A1887F"
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Confirm Password Input with Icon */}
                            <View className="relative">
                                <View className="absolute left-4 top-4 z-10">
                                    <Ionicons name="lock-closed-outline" size={22} color="#A1887F" />
                                </View>
                                <TextInput
                                    className="bg-white pl-14 pr-14 py-4 rounded-2xl text-base w-full text-darkBrown"
                                    placeholder="Confirm Password"
                                    placeholderTextColor="#A1887F"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showConfirmPassword}
                                    style={{
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.05,
                                        shadowRadius: 3,
                                        elevation: 2
                                    }}
                                />
                                <TouchableOpacity
                                    className="absolute right-4 top-4 z-10"
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    <Ionicons
                                        name={showConfirmPassword ? "eye-off" : "eye"}
                                        size={22}
                                        color="#A1887F"
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Sign Up Button */}
                            <TouchableOpacity
                                className={`bg-primary py-4 rounded-2xl w-full items-center mt-4 ${loading ? 'opacity-70' : ''}`}
                                onPress={handleSignUp}
                                disabled={loading}
                                activeOpacity={0.8}
                                style={{
                                    shadowColor: '#FF914D',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 6
                                }}
                            >
                                {loading ? (
                                    <View className="flex-row items-center justify-center gap-2.5">
                                        <ActivityIndicator size="small" color="#fff" />
                                        <Text className="text-white text-base font-bold">Creating Account...</Text>
                                    </View>
                                ) : (
                                    <Text className="text-white text-base font-bold tracking-wide">Sign Up</Text>
                                )}
                            </TouchableOpacity>

                            {/* Divider */}
                            <View className="flex-row items-center w-full my-4">
                                <View className="flex-1 h-[1px] bg-lightBrown/30" />
                                <Text className="mx-4 text-lightBrown text-sm font-medium">Or continue with</Text>
                                <View className="flex-1 h-[1px] bg-lightBrown/30" />
                            </View>

                            {/* Social Sign-Up Buttons */}
                            <View className="flex-row gap-4 justify-center">
                                <TouchableOpacity
                                    className="w-16 h-16 bg-white rounded-2xl items-center justify-center"
                                    onPress={handleGoogleSignUp}
                                    disabled={loading}
                                    activeOpacity={0.7}
                                    style={{
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.08,
                                        shadowRadius: 4,
                                        elevation: 3
                                    }}
                                >
                                    <AntDesign name="google" size={28} color="#DB4437" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    className="w-16 h-16 bg-white rounded-2xl items-center justify-center"
                                    onPress={handleFacebookSignUp}
                                    disabled={loading}
                                    activeOpacity={0.7}
                                    style={{
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.08,
                                        shadowRadius: 4,
                                        elevation: 3
                                    }}
                                >
                                    <AntDesign name="facebook-square" size={28} color="#1877F2" />
                                </TouchableOpacity>
                            </View>

                            {/* Sign In Link */}
                            <View className="flex-row justify-center mt-6 mb-4">
                                <Text className="text-lightBrown text-base">Already have an account? </Text>
                                <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
                                    <Text className="text-primary text-base font-bold">Sign In</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Loading Overlay */}
            {loading && (
                <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/50 justify-center items-center z-[1000]">
                    <View className="bg-white p-8 rounded-3xl items-center min-w-[280px] mx-6"
                        style={{
                            shadowColor: '#FF914D',
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: 0.3,
                            shadowRadius: 12,
                            elevation: 10
                        }}
                    >
                        <View className="bg-secondary rounded-full p-4 mb-4">
                            <ActivityIndicator size="large" color="#FF914D" />
                        </View>
                        <Text className="text-lg font-bold text-darkBrown text-center">
                            {loadingStatus || 'Creating your account...'}
                        </Text>
                        <Text className="text-sm text-lightBrown mt-2 text-center">Please wait, this may take a moment</Text>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
};

export default SignUpScreen;