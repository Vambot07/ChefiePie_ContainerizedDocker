// components/LoadingScreen.tsx
import React from 'react';
import { View, ActivityIndicator, Image, Text } from 'react-native';
import colors from '~/utils/color';

export default function LoadingScreen() {
    return (
        <View className="flex-1 bg-white items-center justify-center">
            {/* Logo */}
            <Image
                source={require('assets/ChefiePieSplashIcon.png')}
                style={{ width: 150, height: 150, marginBottom: 24 }}
                resizeMode="contain"
            />

            {/* App Name */}
            <Text className="text-3xl font-bold mb-2" style={{ color: colors.primary }}>
                Chefie Pie
            </Text>
            <Text className="text-gray-500 mb-8">
                Your AI Cooking Assistant
            </Text>

            {/* Loading Indicator */}
            <ActivityIndicator size="large" color={colors.primary} />
        </View>
    );
}
