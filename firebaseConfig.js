// Import the functions you need from the SDKs
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore, collection } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD5fdHjtIH5LJpfhB_5jDZKmyN6q9NHm60",
    authDomain: "chefiepie-562c4.firebaseapp.com",
    projectId: "chefiepie-562c4",
    storageBucket: "chefiepie-562c4.appspot.com",
    messagingSenderId: "188127507644",
    appId: "1:188127507644:web:8a3c272bff1a04a53accb9",
    measurementId: "G-D27MXYQB1X"
};

// ✅ Prevent duplicate initialization
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ✅ Make sure `initializeAuth` is only called once
let auth;
if (getApps().length === 0) {
    const app = initializeApp(firebaseConfig);
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
    });
} else {
    const app = getApp();
    auth = getAuth(app);
}


// Firestore and Storage
export const db = getFirestore(app);
export const storage = getStorage(app);

// Collections
export const usersCollection = collection(db, "users");
export const recipesCollection = collection(db, "recipes");

// Auth export
export { auth };
