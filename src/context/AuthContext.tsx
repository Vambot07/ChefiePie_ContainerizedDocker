import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import CryptoJS from "crypto-js";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signOutFromGoogle } from '../utils/socialAuth';

// --- Types ---

interface UserData {
    uid?: string;
    username?: string;
    email?: string;
    userId?: string;
    profileImage?: any;
    bio?: string;
    instagram?: string;
    youtube?: string;
    tiktok?: string;
    role?: string;
    emailVerified?: boolean;
    dietaryRestrictions?: string[];
    cookingGoal?: string;
    ingredientsToAvoid?: string[];
    servingSize?: number;
    source?: string;
}

interface AuthContextType {
    loading: boolean;
    user: UserData | null;
    isAuthenticated: boolean;
    signin: (email: string, password: string) => Promise<{ success: boolean; user?: FirebaseUser; msg?: string }>;
    signup: (username: string, email: string, password: string, profileImageUrl?: string) => Promise<{ success: boolean; user?: FirebaseUser; msg?: string }>;
    logout: () => Promise<{ success: boolean; msg?: string; error?: any }>;
    verifyPasswordHash: (inputPassword: string, storedHash: string) => boolean;
    resetPassword: (email: string) => Promise<{ success: boolean; msg?: string }>;
    updateUserProfile: (updates: Partial<UserData>) => Promise<{ success: boolean; error?: any }>;
    updateUserInFirestore: (userId: string, updates: Partial<UserData>) => Promise<{ success: boolean; error?: any }>;
    refreshUserData: () => Promise<void>;
}

interface AuthProviderProps {
    children: ReactNode;
}

// --- Context Creation ---
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Provider ---
export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<UserData | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    // Listen for auth state changes
    useEffect(() => {
        let mounted = true;
        let hasStoredAuth = false;
        let authCheckTimer: NodeJS.Timeout | null = null;

        const initAuth = async () => {
            // First, check AsyncStorage for saved auth
            try {
                const stored = await AsyncStorage.getItem('userAuth');
                if (stored) {
                    const authData = JSON.parse(stored);
                    console.log('📦 Found saved auth in AsyncStorage:', authData.email);
                    const date = new Date(authData.loginTime);

                    console.log('Full date:', date.toString());

                    // Check if session expired (7 days)
                    const sevenDays = 7 * 24 * 60 * 60 * 1000;
                    if (Date.now() - authData.loginTime > sevenDays) {
                        console.log('⏰ Session expired, clearing...');
                        await AsyncStorage.removeItem('userAuth');
                        hasStoredAuth = false;
                    } else {
                        console.log('✅ Session valid, waiting for Firebase to restore...');
                        hasStoredAuth = true;
                    }
                }
            } catch (error) {
                console.error('❌ Error checking AsyncStorage:', error);
            }

            // Listen for Firebase auth state changes
            const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
                if (!mounted) return;

                // Clear any pending timer
                if (authCheckTimer) {
                    clearTimeout(authCheckTimer);
                    authCheckTimer = null;
                }

                if (firebaseUser) {
                    // User is authenticated
                    console.log('✅ Firebase auth detected:', firebaseUser.email);
                    await updateUserData(firebaseUser);

                    if (mounted) {
                        setLoading(false);
                    }
                } else {
                    // No Firebase user
                    console.log('❌ No Firebase auth found');

                    // If we have stored auth, wait a bit for Firebase to restore
                    // Otherwise, immediately show login screen
                    if (hasStoredAuth) {
                        console.log('⏳ Waiting for Firebase to restore session...');
                        authCheckTimer = setTimeout(() => {
                            if (mounted) {
                                console.log('⚠️ Firebase session restore timeout, showing login');
                                setUser(null);
                                setIsAuthenticated(false);
                                setLoading(false);
                            }
                        }, 2000); // Wait 2 seconds for Firebase to restore
                    } else {
                        setUser(null);
                        setIsAuthenticated(false);
                        setLoading(false);
                    }
                }
            });

            return unsubscribe;
        };

        initAuth().then(unsubscribe => {
            // Cleanup function
            return () => {
                mounted = false;
                if (authCheckTimer) clearTimeout(authCheckTimer);
                if (unsubscribe) unsubscribe();
            };
        });
    }, []);

    const updateUserData = async (firebaseUser: FirebaseUser) => {
        const docRef = doc(db, "users", firebaseUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const userData = docSnap.data() as UserData;
            const firestoreEmail = userData.email;
            const authEmail = firebaseUser.email;

            // Check kalau email berbeza (meaning user dah verify email baru)
            if (firestoreEmail !== authEmail && authEmail) {
                console.log("📧 Email mismatch detected!");
                console.log("Firestore email:", firestoreEmail);
                console.log("Auth email:", authEmail);

                // Update Firestore dengan email yang baru (yang dah verified)
                try {
                    await updateDoc(docRef, {
                        email: authEmail
                    });
                    console.log("✅ Email updated in Firestore after verification!");

                    // Update local state dengan email baru
                    setUser({
                        ...userData,
                        email: authEmail,

                        userId: firebaseUser.uid,
                        emailVerified: firebaseUser.emailVerified
                    });
                } catch (error) {
                    console.error("❌ Error updating email in Firestore:", error);
                    // Tetap set user walaupun update fail
                    setUser({
                        ...userData,
                        uid: firebaseUser.uid,
                        userId: firebaseUser.uid,
                        emailVerified: firebaseUser.emailVerified
                    });
                }
            } else {
                // Email sama, set user macam biasa
                setUser({
                    ...userData,
                    uid: firebaseUser.uid,
                    userId: firebaseUser.uid,
                    emailVerified: firebaseUser.emailVerified
                });
            }

            setIsAuthenticated(true);
        } else {
            // User doc tak wujud (shouldn't happen normally)
            setUser({
                userId: firebaseUser.uid,
                email: firebaseUser.email || "",
                emailVerified: firebaseUser.emailVerified
            });
            setIsAuthenticated(true);
        }
    };

    // --- Auth Functions ---

    const signin = async (email: string, password: string) => {
        try {
            const response = await signInWithEmailAndPassword(auth, email, password);

            // updateUserData akan auto-trigger oleh onAuthStateChanged
            // Tapi kita boleh panggil manual untuk instant update
            await updateUserData(response.user);

            // Save to AsyncStorage for auto sign-in
            try {
                await AsyncStorage.setItem('userAuth', JSON.stringify({
                    userId: response.user.uid,
                    email: response.user.email,
                    rememberMe: true,
                    loginTime: Date.now()
                }));
                console.log('✅ Auth data saved to AsyncStorage');
            } catch (storageError) {
                console.error('❌ Error saving to AsyncStorage:', storageError);
                // Don't fail login if storage fails
            }

            return { success: true, user: response.user };
        } catch (error: any) {
            let msg = error.message;
            if (msg.includes("auth/invalid-email")) {
                msg = "Invalid email address.";
            } else if (msg.includes("auth/wrong-password")) {
                msg = "Incorrect password. Please try again.";
            } else if (msg.includes("auth/user-not-found")) {
                msg = "No account found with this email.";
            } else if (msg.includes("auth/invalid-credential")) {
                msg = "Invalid email or password.";
            } else if (msg.includes("auth/too-many-requests")) {
                msg = "Too many failed attempts. Please try again later.";
            } else {
                msg = "Login failed. Please check your credentials.";
            }
            return { success: false, msg };
        }
    };

    const signup = async (username: string, email: string, password: string, profileImageUrl?: string) => {
        try {
            if (!username || !email || !password) return { success: false, msg: "All fields are required" };
            if (password.length < 6) return { success: false, msg: "Password must be at least 6 characters long" };

            const hashedPassword = CryptoJS.SHA256(password).toString();

            const response = await createUserWithEmailAndPassword(auth, email, password);

            await setDoc(doc(db, "users", response.user.uid), {
                username,
                email,
                password: hashedPassword,
                role: "user",
                userId: response.user.uid,
                createdAt: new Date(),
                profileImage: profileImageUrl || "",
            });

            return { success: true, user: response.user };
        } catch (error: any) {
            let msg = error.message;
            if (msg.includes("auth/invalid-email")) msg = "Invalid email address.";
            else if (msg.includes("auth/email-already-in-use")) msg = "Email already in use.";
            else if (msg.includes("auth/weak-password")) msg = "Password is too weak.";
            return { success: false, msg };
        }
    };

    const logout = async () => {
        try {
            // Sign out from Firebase
            await signOut(auth);

            // Sign out from Google (if signed in with Google)
            await signOutFromGoogle();

            // Clear AsyncStorage on logout
            try {
                await AsyncStorage.removeItem('userAuth');
                console.log('✅ Auth data cleared from AsyncStorage');
            } catch (storageError) {
                console.error('❌ Error clearing AsyncStorage:', storageError);
            }

            return { success: true };
        } catch (error: any) {
            return { success: false, msg: error.message, error };
        }
    };

    const verifyPasswordHash = (inputPassword: string, storedHash: string) => {
        const inputHash = CryptoJS.SHA256(inputPassword).toString();
        return inputHash === storedHash;
    };

    const resetPassword = async (email: string) => {
        try {
            await sendPasswordResetEmail(auth, email);
            return { success: true, msg: "Password reset link sent! Check your email." };
        } catch (error: any) {
            let msg = error.message;
            if (msg.includes("auth/invalid-email")) msg = "Invalid email address";
            else if (msg.includes("auth/user-not-found")) msg = "No account found with this email.";
            return { success: false, msg };
        }
    };

    const updateUserProfile = async (updates: Partial<UserData>) => {
        try {
            setUser((prev) => (prev ? { ...prev, ...updates } : null));
            return { success: true };
        } catch (error) {
            return { success: false, error };
        }
    };

    const updateUserInFirestore = async (userId: string, updates: Partial<UserData>) => {
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, updates);

            setUser((prev) => (prev ? { ...prev, ...updates } : null));

            console.log("✅ Firestore: User data updated successfully!");
            return { success: true };
        } catch (error) {
            console.error("❌ Firestore: Error updating user data:", error);
            return { success: false, error };
        }
    }

    // Refresh user data from Firestore
    const refreshUserData = async () => {
        try {
            const currentUser = auth.currentUser;
            if (currentUser) {
                console.log('🔄 Refreshing user data from Firestore...');
                await updateUserData(currentUser);
                console.log('✅ User data refreshed successfully!');
            } else {
                console.warn('⚠️ No authenticated user to refresh');
            }
        } catch (error) {
            console.error('❌ Error refreshing user data:', error);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                loading,
                user,
                isAuthenticated,
                signin,
                signup,
                logout,
                verifyPasswordHash,
                resetPassword,
                updateUserProfile,
                updateUserInFirestore,
                refreshUserData,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

// --- Custom Hook ---
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
};