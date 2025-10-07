import { View, Text } from 'react-native'
import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LandingScreen from '~/screen/auth/LandingScreen';
import SignInScreen from '~/screen/auth/SignInScreen';
import SignUpScreen from '~/screen/auth/SignUpScreen';
import ForgotPasswordScreen from '~/screen/auth/ForgotPasswordScreen';
const Stack = createNativeStackNavigator();

const AuthStack = () => {
    return (
        <Stack.Navigator
            screenOptions={{ headerShown: false }}
            initialRouteName="Landing"
        >
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </Stack.Navigator>
    )
}

export default AuthStack