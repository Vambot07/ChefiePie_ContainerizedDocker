import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '~/utils/color';


export default function LandingScreen() {

    const navigation = useNavigation<any>();

    const navigateToSignIn = () => {
        navigation.navigate('SignIn');
    }

    const navigateToSignUp = () => {
        navigation.navigate('SignUp');
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="auto" />
            <View style={styles.content}>
                <Image
                    source={require('../../../assets/chat.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={styles.title}>Welcome to{'\n'} ChefiePie</Text>
                <Text style={styles.subtitle}>Your Ultimate Recipe Companion</Text>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.button} onPress={navigateToSignIn}>
                        <Text style={styles.buttonText}>Sign In</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={navigateToSignUp}>
                        <Text style={styles.buttonText}>Sign Up</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}



const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.secondary,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    logo: {
        width: 150,
        height: 150,
        marginBottom: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        color: '#666',
        marginBottom: 40,
        textAlign: 'center',
    },
    buttonContainer: {
        width: '100%',
        gap: 15,
    },
    button: {
        backgroundColor: '#FF9966',
        padding: 15,
        borderRadius: 10,
        width: '100%',
        alignItems: 'center',
    },
    secondaryButton: {
        backgroundColor: '#FF9966',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});