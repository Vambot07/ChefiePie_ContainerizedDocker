import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore"
import { auth, db } from "../../firebaseConfig"; // Adjust the import path as necessary
import CryptoJS from 'crypto-js';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    /** @type {[{username?: string, email?: string, userId?: string} | null, Function]} */
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // onAuthStateChanged is a function that checks if the user is authenticated
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            // console.log("Auth state changed:", user);

            if (user) {

                setUser(user);
                setIsAuthenticated(true);

                updateUserData(user.uid);
            } else {
                setUser(null);
                setIsAuthenticated(false);
            }
            setLoading(false);
        });
        return unsubscribe;
        // Cleanup subscription on unmount  
    }, []);

    const updateUserData = async (uid) => {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const userData = docSnap.data();
            setUser({ ...user, username: userData.username, email: userData.email, userId: uid });
        }
    }

    // function to handle user signin
    const signin = async (email, password) => {
        try {
            const response = await signInWithEmailAndPassword(auth, email, password);
            console.log("response.user:", response?.user);

            return { success: true, user: response?.user };
        } catch (error) {
            let msg = error.message;

            if (msg.includes("auth/invalid-email")) msg = "Invalid email address.";
            if (msg.includes("auth/invalid-credential")) msg = "Invalid creadential.";
            return { success: false, msg: msg };
        }
    }

    // function to handle user signup
    const signup = async (username, email, password, profileImageUrl) => {
        try {
            // Additional validation
            if (!username || !email || !password) {
                return { success: false, msg: "All fields are required" };
            }

            if (password.length < 6) {
                return { success: false, msg: "Password must be at least 6 characters long" };
            }

            // Hash the password using SHA-256
            const hashedPassword = CryptoJS.SHA256(password).toString();

            const response = await createUserWithEmailAndPassword(auth, email, password);
            console.log("response.user:", response?.user);

            // Store user data with hashed password in Firestore
            await setDoc(doc(db, "users", response.user.uid), {
                username,
                email,
                password: hashedPassword, // Store the hashed version
                userId: response?.user?.uid,
                createdAt: new Date(),
                profileImage: profileImageUrl || '',
            });
            return { success: true, user: response?.user };
        } catch (error) {
            let msg = error.message;

            if (msg.includes("auth/invalid-email")) msg = "Invalid email address.";
            else if (msg.includes("auth/email-already-in-use")) msg = "Email already in use.";
            else if (msg.includes("auth/weak-password")) msg = "Password is too weak.";
            return { success: false, msg: msg };
        }
    }

    // function to handle user logout
    const logout = async (email, password) => {
        try {
            await signOut(auth);
            return { success: true };
        } catch (error) {
            return { success: false, msg: error.message, error: error };
        }
    }

    // Helper function to verify password hash (if needed for additional validation)
    const verifyPasswordHash = (inputPassword, storedHash) => {
        const inputHash = CryptoJS.SHA256(inputPassword).toString();
        return inputHash === storedHash;
    }

    return (
        <AuthContext.Provider value={{ loading, user, isAuthenticated, signin, signup, logout, verifyPasswordHash }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext);

    // Check if the context is undefined
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}