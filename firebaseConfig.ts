// Import the functions you need from the SDKs
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyD5fdHjtIH5LJpfhB_5jDZKmyN6q9NHm60',
  authDomain: 'chefiepie-562c4.firebaseapp.com',
  projectId: 'chefiepie-562c4',
  storageBucket: 'chefiepie-562c4.firebasestorage.app',
  messagingSenderId: '188127507644',
  appId: '1:188127507644:web:8a3c272bff1a04a53accb9',
  measurementId: 'G-D27MXYQB1X',
};

// ✅ Prevent duplicate initialization
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ✅ Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// ✅ Example Firestore collections
export const usersCollection = collection(db, 'users');
export const recipesCollection = collection(db, 'recipes');
