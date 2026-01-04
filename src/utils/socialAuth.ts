import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth, db } from '../../firebaseConfig';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '188127507644-umtqm70rfg0a6c4ia00phrr0o196hfb6.apps.googleusercontent.com',
  offlineAccess: false,
});

export const signInWithGoogle = async () => {
  try {
    console.log('🔵 Starting Google Sign-In...');

    // Step 1: Sign out from any previous Google session to force account picker
    try {
      await GoogleSignin.signOut();
      console.log('🔄 Cleared previous Google session');
    } catch (signOutError) {
      // Ignore error if no one was signed in
      console.log('ℹ️ No previous Google session to clear');
    }

    // Step 2: Check Google Play Services
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Step 3: Sign in with Google
    const response = await GoogleSignin.signIn();
    console.log('✅ Google Sign-In successful');

    // Step 4: Check if sign-in was successful
    if (response.type === 'cancelled') {
      return { success: false, msg: 'Sign-in cancelled' };
    }

    // Step 5: Get ID token from the User object
    const idToken = response.data.idToken;

    if (!idToken) {
      console.error('User info structure:', JSON.stringify(response.data, null, 2));
      throw new Error('No ID token received from Google');
    }

    // Step 6: Create Firebase credential
    const googleCredential = GoogleAuthProvider.credential(idToken);

    // Step 7: Sign in to Firebase
    const userCredential = await signInWithCredential(auth, googleCredential);
    console.log('✅ Firebase authentication successful');

    // Step 8: Create user profile in Firestore if doesn't exist
    const userRef = doc(db, 'users', userCredential.user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.log('📝 Creating new user profile...');
      await setDoc(userRef, {
        username: userCredential.user.displayName || 'User',
        email: userCredential.user.email,
        profileImage: userCredential.user.photoURL || null,
        createdAt: serverTimestamp(),
        provider: 'google',
        userId: userCredential.user.uid
      });
      console.log('✅ User profile created');
    }

    // Step 9: Save to AsyncStorage for session persistence
    try {
      await AsyncStorage.setItem('userAuth', JSON.stringify({
        userId: userCredential.user.uid,
        email: userCredential.user.email,
        provider: 'google',
        rememberMe: true,
        loginTime: Date.now()
      }));
      console.log('✅ Auth data saved to AsyncStorage');
    } catch (storageError) {
      console.error('❌ Error saving to AsyncStorage:', storageError);
      // Don't fail login if storage fails
    }

    return {
      success: true,
      user: userCredential.user,
      msg: 'Signed in successfully with Google!'
    };

  } catch (error: any) {
    console.error('❌ Google Sign-In Error:', error);

    // User cancelled
    if (error.code === '12501' || error.code === 'SIGN_IN_CANCELLED') {
      return { success: false, msg: 'Sign-in cancelled' };
    }

    // Account exists with different provider
    if (error.code === 'auth/account-exists-with-different-credential') {
      return { 
        success: false, 
        msg: 'An account already exists with this email using a different sign-in method.' 
      };
    }

    return { 
      success: false, 
      msg: error.message || 'Failed to sign in with Google' 
    };
  }
};

export const signOutFromGoogle = async () => {
  try {
    await GoogleSignin.signOut();
    console.log('✅ Signed out from Google');
  } catch (error) {
    console.error('Error signing out from Google:', error);
  }
};