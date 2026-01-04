import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '~/context/AuthContext';
import AuthStack from './AuthStack';
import AppStack from './AppStack';
import LoadingScreen from '~/screen/auth/LoadingScreen';
import { useFonts, RobotoSlab_400Regular, RobotoSlab_800ExtraBold } from '@expo-google-fonts/roboto-slab';
import { Oswald_400Regular } from '@expo-google-fonts/oswald';
import { ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';

const RootNavigator = () => {
    const { isAuthenticated, loading } = useAuth();

    // Load all fonts globally to prevent FOUT (Flash of Unstyled Text)
    const [fontsLoaded] = useFonts({
        RobotoSlab_400Regular,
        RobotoSlab_800ExtraBold,
        Oswald_400Regular,
        ArchivoBlack_400Regular,
    });

    console.log('isAuthenticated:', isAuthenticated);

    // Show loading screen while checking auth or loading fonts
    if (loading || !fontsLoaded) {
        return <LoadingScreen />
    }

    return (
        <NavigationContainer>
            {isAuthenticated ? <AppStack /> : <AuthStack />}
        </NavigationContainer>
    );
}

export default RootNavigator;