import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '~/context/AuthContext';
import AuthStack from './AuthStack';
import AppStack from './AppStack';
import LoadingScreen from '~/screen/auth/LoadingScreen';

const RootNavigator = () => {
    const { isAuthenticated, loading } = useAuth();

    console.log('isAuthenticated:', isAuthenticated);

    // Show loading screen while checking auth
    if (loading) {
        return <LoadingScreen />
    }

    return (
        <NavigationContainer>
            {isAuthenticated ? <AppStack /> : <AuthStack />}
        </NavigationContainer>
    );
}

export default RootNavigator;