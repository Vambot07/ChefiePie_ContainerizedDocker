import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '~/context/AuthContext';
import AuthStack from './AuthStack';
import AppStack from './AppStack';

const RootNavigator = () => {
    const { isAuthenticated, loading } = useAuth();

    console.log('isAuthenticated:', isAuthenticated);

    // Optional: Show loading screen while checking auth
    if (loading) {
        return null; // or <LoadingScreen />
    }

    return (
        <NavigationContainer>
            {isAuthenticated ? <AppStack /> : <AuthStack />}
        </NavigationContainer>
    );
}

export default RootNavigator;