import { View, Text } from 'react-native'
import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import AuthStack from './AuthStack'
import { useAuth } from '~/context/AuthContext'
import AppStack from './AppStack'

const RootNavigator = () => {
    const { isAuthenticated, loading } = useAuth();

    console.log('isAuthenticated', isAuthenticated);

    return (
        <NavigationContainer children={
            isAuthenticated ? (
                <AppStack />
            ) : (
                <AuthStack />
            )
        } />
    )
}

export default RootNavigator