import { View, Text, TextInput, TouchableOpacity, SafeAreaView, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '~/context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { uploadProfileToFirebase } from '~/utils/uploadImage';
import { Ionicons, Feather } from '@expo/vector-icons';
import { KeyboardAvoidingView, Platform } from 'react-native';
import EditModal from '~/components/Modal/EditModal';

const SignUpScreen = () => {
    const navigation = useNavigation<any>();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const { signup } = useAuth();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
            let profileImageUrl = '';

            // Upload profile image if selected
            if (profileImage) {
                const fileName = `profile_${Date.now()}.jpg`;
                profileImageUrl = await uploadProfileToFirebase(profileImage, fileName);
            }

            // Create user account
            const response = await signup(username, email, password, profileImageUrl);

            console.log('Signup response:', response);

            if (response.success) {
                Alert.alert('Signup Success', 'Account created successfully!');
            } else {
                Alert.alert('Signup Failed', response.msg + '\nPlease try again later');
            }
        } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'An unknown error occurred');
        } finally {
            setLoading(false);
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
                        <Text className="text-lg font-semibold text-[#333] mt-[15px] text-center">Creating your account...</Text>
                        <Text className="text-sm text-[#666] mt-2 text-center">Please wait while we set up your profile</Text>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
};

export default SignUpScreen;