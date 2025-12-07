// Import the functions you need from the SDKs
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, initializeFirestore, Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { LogBox } from 'react-native';

// Suppress Firebase Firestore warnings in development
if (__DEV__) {
    LogBox.ignoreLogs([
        '@firebase/firestore',
        'WebChannelConnection',
        'RPC \'Listen\' stream',
    ]);
}

console.log('🔥 Firebase initialization started...');
const startTime = Date.now();

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// ✅ Prevent duplicate initialization
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ✅ Initialize Firebase services
export const auth = getAuth(app);

// Initialize Firestore with optimized settings for React Native
let db: Firestore;
try {
    // Try to initialize Firestore with custom settings
    db = initializeFirestore(app, {
        experimentalForceLongPolling: true, // Better for mobile/React Native
        experimentalAutoDetectLongPolling: true, // Auto-detect best connection method
    });
} catch (error) {
    // If already initialized, just get the existing instance
    db = getFirestore(app);
}
export { db };

export const storage = getStorage(app);

// ✅ Example Firestore collections
export const usersCollection = collection(db, 'users');
export const recipesCollection = collection(db, 'recipes');

console.log(`✅ Firebase initialized in ${Date.now() - startTime}ms`);
