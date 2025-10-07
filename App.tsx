import { ScreenContent } from '~/components/ScreenContent';
import { StatusBar } from 'expo-status-bar';

import './global.css';
import LandingScreen from '~/screen/auth/LandingScreen';
import SignInScreen from '~/screen/auth/SignInScreen';
import SignUpScreen from '~/screen/auth/SignUpScreen';
import RootNavigator from '~/navigation/RootNavigator';
import { AuthProvider } from '~/context/AuthContext';


export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
      <StatusBar style="auto" />
    </AuthProvider  >
  );
}
