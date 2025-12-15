import { View, Text, TextInput, TouchableOpacity, SafeAreaView, Image, Alert, Modal, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '~/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const SignInScreen = () => {
    const navigation = useNavigation<any>();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { signin } = useAuth();

    const handleSignIn = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        const response = await signin(email, password);
        setLoading(false);

        console.log('SignIn response:', response);

        if (response.success) {
            Alert.alert('Signin Success', response.msg);
        } else {
            Alert.alert('Signin Failed', response.msg);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <StatusBar style="auto" />
            <View className="flex-1 items-center p-5">
                <Image
                    source={require('../../../assets/ChefiePieLogo.png')}
                    className="w-[180px] h-[180px] mt-10 mb-5 rounded-3xl"
                    resizeMode="contain"
                />

                <Text className="text-[28px] font-bold text-[#333] mb-2.5">Welcome Back!</Text>
                <Text className="text-base text-[#666] mb-[30px]">Sign in to continue</Text>

                <View className="w-full gap-[15px]">
                    <TextInput
                        className="bg-[#f5f5f5] rounded-[10px] text-base w-full"
                        style={{ paddingVertical: 15, paddingHorizontal: 15, lineHeight: 15 }}
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

                    <TouchableOpacity
                        className="self-end"
                        onPress={() => navigation.navigate('ForgotPassword')}
                    >
                        <Text className="text-[#FF6B6B] text-sm">Forgot Password?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="bg-[#FF9966] p-[15px] rounded-[10px] w-full items-center mt-2.5"
                        onPress={handleSignIn}
                    >
                        <Text className="text-white text-base font-semibold">Sign In</Text>
                    </TouchableOpacity>

                    <View className="flex-row justify-center mt-5">
                        <Text className="text-[#666] text-sm">Don't have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                            <Text className="text-[#FF6B6B] text-sm font-semibold">Sign Up</Text>
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
                <View className="flex-1 bg-black/30 justify-center items-center">
                    <View className="bg-white p-[30px] rounded-[15px] items-center shadow-lg">
                        <ActivityIndicator size="large" color="#FF9966" />
                        <Text className="mt-2.5 text-base text-[#333]">Signing in...</Text>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default SignInScreen;