import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth, db } from '../../firebaseConfig';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '188127507644-umtqm70rfg0a6c4ia00phrr0o196hfb6.apps.googleusercontent.com',
  offlineAccess: false,
});

export const signInWithGoogle = async () => {
  try {
    console.log('🔵 Starting Google Sign-In...');

    // Step 1: Check Google Play Services
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Step 2: Sign in with Google
    const userInfo = await GoogleSignin.signIn();
    console.log('✅ Google Sign-In successful');

    // Step 3: Get ID token
    const idToken = userInfo.data?.idToken;
    
    if (!idToken) {
      throw new Error('No ID token received from Google');
    }

    // Step 4: Create Firebase credential
    const googleCredential = GoogleAuthProvider.credential(idToken);

    // Step 5: Sign in to Firebase
    const userCredential = await signInWithCredential(auth, googleCredential);
    console.log('✅ Firebase authentication successful');

    // Step 6: Create user profile in Firestore if doesn't exist
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