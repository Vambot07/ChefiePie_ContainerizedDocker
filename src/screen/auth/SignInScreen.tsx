import { View, Text, TextInput, TouchableOpacity, SafeAreaView, Image, Alert, Modal, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '~/context/AuthContext';
import { Ionicons, AntDesign, MaterialIcons } from '@expo/vector-icons';
import { signInWithGoogle } from '~/utils/socialAuth';

const SignInScreen = () => {
    const navigation = useNavigation<any>();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { signin } = useAuth();

    const handleSignIn = async () => {
        // Check if both fields are empty
        if (!email && !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        // Check if only one field is filled
        if (!email || !password) {
            Alert.alert('Error', 'Invalid credentials');
            return;
        }

        setLoading(true);
        const response = await signin(email, password);
        setLoading(false);

        console.log('SignIn response:', response);

        if (response.success) {
            Alert.alert('Sign In Success', response.msg);
        } else {
            Alert.alert('Sign In Failed', response.msg);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            setLoading(true);
            const result = await signInWithGoogle();

            if (result.success) {
                Alert.alert('Success!', result.msg);
            } else {
                Alert.alert('Sign In Failed', result.msg);
            }
        } catch (error) {
            console.error('Google sign in error:', error);
            Alert.alert('Error', 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleFacebookSignIn = () => {
        Alert.alert('Coming Soon', 'Facebook Sign-In will be implemented soon!');
    };

    return (
        <SafeAreaView className="flex-1 bg-secondary">
            <StatusBar style="dark" />
            <View className="flex-1 items-center justify-center px-6">
                {/* Logo Container with Enhanced Design */}
                <View className="bg-white rounded-3xl p-5 mb-8"
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
                        className="w-[140px] h-[140px] rounded-3xl"
                        resizeMode="contain"
                    />
                </View>

                <Text className="text-[32px] font-bold text-darkBrown mb-2">Welcome Back!</Text>
                <Text className="text-base text-lightBrown mb-10">Sign in to continue</Text>

                <View className="w-full gap-4">
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

                    {/* Forgot Password */}
                    <TouchableOpacity
                        className="self-end"
                        onPress={() => navigation.navigate('ForgotPassword')}
                    >
                        <Text className="text-primary text-sm font-semibold">Forgot Password?</Text>
                    </TouchableOpacity>

                    {/* Sign In Button */}
                    <TouchableOpacity
                        className="bg-primary py-4 rounded-2xl w-full items-center mt-2"
                        onPress={handleSignIn}
                        activeOpacity={0.8}
                        style={{
                            shadowColor: '#FF914D',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 6
                        }}
                    >
                        <Text className="text-white text-base font-bold tracking-wide">Sign In</Text>
                    </TouchableOpacity>

                    {/* Divider */}
                    <View className="flex-row items-center w-full my-6">
                        <View className="flex-1 h-[1px] bg-lightBrown/30" />
                        <Text className="mx-4 text-lightBrown text-sm font-medium">Or continue with</Text>
                        <View className="flex-1 h-[1px] bg-lightBrown/30" />
                    </View>

                    {/* Social Sign-In Buttons */}
                    <View className="flex-row gap-4 justify-center">
                        <TouchableOpacity
                            className="w-16 h-16 bg-white rounded-2xl items-center justify-center"
                            onPress={handleGoogleSignIn}
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
                            onPress={handleFacebookSignIn}
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

                    {/* Sign Up Link */}
                    <View className="flex-row justify-center mt-8">
                        <Text className="text-lightBrown text-base">Don't have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                            <Text className="text-primary text-base font-bold">Sign Up</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Loading Modal */}
            <Modal
                transparent={true}
                animationType="fade"
                visible={loading}
                onRequestClose={() => setLoading(false)}
            >
                <View className="flex-1 bg-black/50 justify-center items-center">
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
                        <Text className="text-lg font-bold text-darkBrown text-center">Signing in...</Text>
                        <Text className="text-sm text-lightBrown mt-2 text-center">Please wait</Text>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default SignInScreen;