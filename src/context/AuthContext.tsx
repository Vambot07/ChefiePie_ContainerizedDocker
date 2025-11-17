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
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // ✅ Ambil data dari Firestore
                await updateUserData(firebaseUser);
            } else {
                setUser(null);
                setIsAuthenticated(false);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const updateUserData = async (firebaseUser: FirebaseUser) => {
        const docRef = doc(db, "users", firebaseUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const userData = docSnap.data() as UserData;
            const firestoreEmail = userData.email;
            const authEmail = firebaseUser.email;

            // ✅ Check kalau email berbeza (meaning user dah verify email baru)
            if (firestoreEmail !== authEmail && authEmail) {
                console.log("📧 Email mismatch detected!");
                console.log("Firestore email:", firestoreEmail);
                console.log("Auth email:", authEmail);
                
                // ✅ Update Firestore dengan email yang baru (yang dah verified)
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
            
            // ✅ updateUserData akan auto-trigger oleh onAuthStateChanged
            // Tapi kita boleh panggil manual untuk instant update
            await updateUserData(response.user);
            
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
            await signOut(auth);
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