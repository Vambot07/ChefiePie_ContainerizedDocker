import { StatusBar } from 'expo-status-bar';
import './global.css';
import RootNavigator from '~/navigation/RootNavigator';
import { AuthProvider } from '~/context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}