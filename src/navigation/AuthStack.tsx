import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LandingScreen from '~/screen/auth/LandingScreen';
import SignInScreen from '~/screen/auth/SignInScreen';
import SignUpScreen from '~/screen/auth/SignUpScreen';
import ForgotPasswordScreen from '~/screen/auth/ForgotPasswordScreen';

const Stack = createNativeStackNavigator();

const AuthStack = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,  // 
                animation: 'default', // Try adding this
            }}
            initialRouteName="Landing"
        >
            <Stack.Screen
                name="Landing"
                component={LandingScreen}
                options={{ headerShown: false }}  // 
            />
            <Stack.Screen
                name="SignIn"
                component={SignInScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="SignUp"
                component={SignUpScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="ForgotPassword"
                component={ForgotPasswordScreen}
                options={{ headerShown: false }}
            />
        </Stack.Navigator>
    )
}

export default AuthStack;