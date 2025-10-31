import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Alert,
    TextInput,
    Modal,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useState } from 'react';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '~/context/AuthContext';
import colors from '~/utils/color';
import Header from '~/components/Header';
import { updateDoc, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../../firebaseConfig';
import { 
    updatePassword, 
    reauthenticateWithCredential, 
    EmailAuthProvider, 
    fetchSignInMethodsForEmail,
    updateEmail,
    verifyBeforeUpdateEmail
} from 'firebase/auth';
import SettingItem from '~/components/SettingItem';
import EditModal from '~/components/EditModal';
import CryptoJS from "crypto-js";

const SettingScreen = () => {
    const navigation = useNavigation();
    const { user, updateUserProfile, logout } = useAuth();

    const [showEditEmailModal, setShowEditEmailModal] = useState(false);
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

    // Form states
    const [username, setUsername] = useState(user?.username || '');
    const [email, setEmail] = useState(user?.email || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);

    const profileImage = user?.profileImage;
    const userId = user?.userId;

    type UserUpdate = {
        username?: string;
        email?: string; 
        bio?: string;
        instagram?: string;
        youtube?: string;
        tiktok?: string;
    }

    // Update user profile in Firestore
    const updateUserInFirestore = async (
        userId: string,
        updatedData: UserUpdate
    ) => {
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, updatedData);
            console.log("✅ Firestore: User data updated successfully!");
        } catch (error) {
            console.error("❌ Firestore update error:", error);
            throw error;
        }
    };

        const handleUpdateEmail = async () => {
    const trimmedEmail = email.replace(/\s+/g, '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    try {
        // 1️⃣ Check sama ada current email
        if (trimmedEmail === user?.email) {
            Alert.alert('No Change', 'This is already your current email address.');
            return;
        }

        // 2️⃣ Basic format validation
        if (!emailRegex.test(trimmedEmail)) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }

        // 2️⃣a. Check valid domain
        const validDomains = ['.com', '.my', '.edu', '.org', '.net', '.gov', '.co.uk', '.com.my', '.edu.my'];
        const hasValidDomain = validDomains.some(domain => trimmedEmail.toLowerCase().endsWith(domain));
        
        if (!hasValidDomain) {
            Alert.alert('Error', 'Please enter a valid email domain (e.g., .com, .my, .edu.my)');
            return;
        }

        setLoading(true);

        // 3️⃣ Check kalau email dah wujud
        const methods = await fetchSignInMethodsForEmail(auth, trimmedEmail);

        if (methods.length > 0) {
            Alert.alert('Error', 'This email address is already in use by another account.');
            setLoading(false);
            return;
        }

        // 4️⃣ Get Firebase user
        const firebaseUser = auth.currentUser;
        if (!firebaseUser) {
            Alert.alert('Error', 'No authenticated user found.');
            setLoading(false);
            return;
        }

        // 5️⃣ ✅ HANTAR VERIFICATION EMAIL (user kena verify dulu)
        await verifyBeforeUpdateEmail(firebaseUser, trimmedEmail);

        // 6️⃣ Alert user untuk check email
        Alert.alert(
            'Verification Email Sent',
            `We've sent a verification link to ${trimmedEmail}.\n\nPlease check your inbox and click the link to verify your new email address.\n\nAfter verification, sign in again with your new email.`,
            [
                {
                    text: 'OK',
                    onPress: () => {
                        setShowEditEmailModal(false);
                        setEmail(user?.email || ''); 
                        logout();
                        Alert.alert('You succesfully logout!');
                    }
                }
            ]
        );

    } catch (error: any) {
        console.error("❌ Error updating email:", error);
        console.error("❌ Error code:", error.code);
        
        let errorMessage = 'Failed to send verification email. Please try again.';
        
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'This email address is already in use by another account.';
        } else if (error.code === 'auth/requires-recent-login') {
            errorMessage = 'For security reasons, please sign out and sign in again before changing your email.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address format.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Too many requests. Please try again later.';
        }
        
        Alert.alert('Error', errorMessage);
    } finally {
        setLoading(false);
    }
};

    const handleLogout = async () => {
        try {
            console.log("User object:", user);
            console.log("user ID: ", userId);

            await logout();
            
        } catch (error) {
            console.error("Error signing out: ", error);
            Alert.alert("Logout Error", "Could not log out. Please try again.");
        }
    };

    // Handle password change
    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert('Error', 'All password fields are required');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'New passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert('Error', 'New password must be at least 6 characters long');
            return;
        }

        setLoading(true);
        try {
            // ✅ Get Firebase Auth user
            const firebaseUser = auth.currentUser;

            if (!firebaseUser || !firebaseUser.email) {
                Alert.alert('Error', 'No authenticated user found. Please sign in again.');
                setLoading(false);
                return;
            }

            // ✅ Re-authenticate user before changing password
            const credential = EmailAuthProvider.credential(
                firebaseUser.email,
                currentPassword
            );
            await reauthenticateWithCredential(firebaseUser, credential);

            // ✅ Update password in Firebase Auth
            await updatePassword(firebaseUser, newPassword);

            // ✅ Hash new password dengan SHA256
            const hashedPassword = CryptoJS.SHA256(newPassword).toString();

            // ✅ Update hashed password in Firestore Database
            if (userId) {
                await updateDoc(doc(db, "users", userId), {
                    password: hashedPassword
                });
                console.log("✅ Password updated in Firestore!");
            }

            Alert.alert('Success', 'Password changed successfully!');
            setShowChangePasswordModal(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            
            // ✅ Reset show password states
            setShowCurrentPassword(false);
            setShowNewPassword(false);
            setShowConfirmPassword(false);
            
        } catch (error: any) {
            let errorMessage = 'Failed to change password. Please try again.';

            if (error.code === 'auth/wrong-password') {
                errorMessage = 'Current password is incorrect';
            } else if (error.code === 'auth/invalid-credential') {
                errorMessage = 'Current password is incorrect';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'New password is too weak';
            } else if (error.code === 'auth/requires-recent-login') {
                errorMessage = 'Please sign out and sign in again before changing password';
            }

            console.error('Password change error:', error);
            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1" style={{ backgroundColor: colors.white }}>
            <Header
                title="Settings"
                showBackButton={true}
                onBack={() => navigation.goBack()}
            />

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Account Section */}
                <View className="px-4 py-6">
                    <Text className="text-lg font-bold text-gray-800 mb-4">Account</Text>

                    <View
                        className="rounded-2xl p-1 mb-6"
                        style={{ backgroundColor: colors.creamWhite }}
                    >
                        <SettingItem
                            title="Email Address"
                            subtitle={user?.email || 'Not set'}
                            onPress={() => setShowEditEmailModal(true)}
                            icon="mail-outline"
                        />

                        <View className="h-px bg-gray-300 mx-4" />

                        <SettingItem
                            title="Change Password"
                            subtitle="Update your password"
                            onPress={() => setShowChangePasswordModal(true)}
                            icon="lock-closed-outline"
                        />
                    </View>  

                    {/* App Settings Section */}
                    <Text className="text-lg font-bold text-gray-800 mb-4">App Settings</Text>

                    <View
                        className="rounded-2xl p-1 mb-6"
                        style={{ backgroundColor: colors.creamWhite }}
                    >

                        <SettingItem
                            title="Privacy & Security"
                            subtitle="Manage your privacy settings"
                            onPress={() => Alert.alert('Coming Soon', 'Privacy settings will be available soon!')}
                            icon="shield-checkmark-outline"
                        />

                        <View className="h-px bg-gray-300 mx-4" />

                        <SettingItem
                            title="About"
                            subtitle="App version and information"
                            onPress={() => Alert.alert('About ChefiePie', 'Version 1.0.0\nBuilt with React Native & Expo')}
                            icon="information-circle-outline"
                        />
                    </View>

                    {/* Danger Zone */}
                    <Text className="text-lg font-bold text-gray-800 mb-4">Account Actions</Text>

                    <View
                        className="rounded-2xl p-1 mb-8"
                        style={{ backgroundColor: colors.creamWhite }}
                    >
                        <SettingItem
                            title="Sign Out"
                            subtitle="Sign out of your account"
                            onPress={() => {
                                Alert.alert(
                                    'Sign Out',
                                    'Are you sure you want to sign out?',
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        {
                                            text: 'Sign Out',
                                            style: 'destructive',
                                            onPress: () => {
                                                handleLogout()
                                                Alert.alert('You succesfully logout!');
                                            }
                                        }
                                    ]
                                );
                            }}
                            icon="log-out-outline"
                            danger={true}
                        />
                    </View>
                </View>
            </ScrollView>

            {/* Edit Email Modal */}
            <EditModal
                visible={showEditEmailModal}
                onClose={() => setShowEditEmailModal(false)}
                title="Edit Email Address"
                onSave={handleUpdateEmail}
                loading={loading}
            >
                <View>
                    <Text className="text-sm font-medium mb-2" style={{ color: colors.darkBrown }}>
                        Email Address
                    </Text>
                    <TextInput
                        value={email}
                        onChangeText={setEmail}
                        className="bg-white px-4 py-3 rounded-xl border border-gray-200"
                        placeholder="Enter email address"
                        placeholderTextColor={colors.lightBrown}
                        style={{ color: colors.darkBrown }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>
            </EditModal>

            {/* Change Password Modal */}
            <EditModal
    visible={showChangePasswordModal}
    onClose={() => {
        setShowChangePasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
    }}
    title="Change Password"
    onSave={handleChangePassword}
    loading={loading}
>
    <View className="space-y-4">
        {/* ✅ Current Password */}
        <View>
            <Text className="text-sm font-medium mb-2" style={{ color: colors.darkBrown }}>
                Current Password
            </Text>
            <View style={{ position: 'relative' }}>
                <TextInput
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    className="bg-white px-4 py-3 rounded-xl border border-gray-200"
                    placeholder="Enter current password"
                    placeholderTextColor={colors.lightBrown}
                    style={{ 
                        color: colors.darkBrown,
                        paddingRight: 48
                    }}
                    secureTextEntry={!showCurrentPassword}
                />
                <TouchableOpacity
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={{ 
                        position: 'absolute',
                        right: 12,
                        top: 4,
                        padding: 4
                    }}
                >
                    <Ionicons
                        name={showCurrentPassword ? "eye-off-outline" : "eye-outline"}
                        size={22}
                        color={colors.lightBrown}
                    />
                </TouchableOpacity>
            </View>
        </View>

        {/* ✅ New Password */}
        <View>
            <Text className="text-sm font-medium mb-2" style={{ color: colors.darkBrown }}>
                New Password
            </Text>
            <View style={{ position: 'relative' }}>
                <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    className="bg-white px-4 py-3 rounded-xl border border-gray-200"
                    placeholder="Enter new password"
                    placeholderTextColor={colors.lightBrown}
                    style={{ 
                        color: colors.darkBrown,
                        paddingRight: 48
                    }}
                    secureTextEntry={!showNewPassword}
                />
                <TouchableOpacity
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    style={{ 
                        position: 'absolute',
                        right: 12,
                        top: 4,
                        padding: 4
                    }}
                >
                    <Ionicons
                        name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                        size={22}
                        color={colors.lightBrown}
                    />
                </TouchableOpacity>
            </View>
        </View>

        {/* ✅ Confirm New Password */}
        <View>
            <Text className="text-sm font-medium mb-2" style={{ color: colors.darkBrown }}>
                Confirm New Password
            </Text>
            <View style={{ position: 'relative' }}>
                <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    className="bg-white px-4 py-3 rounded-xl border border-gray-200"
                    placeholder="Confirm new password"
                    placeholderTextColor={colors.lightBrown}
                    style={{ 
                        color: colors.darkBrown,
                        paddingRight: 48
                    }}
                    secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{ 
                        position: 'absolute',
                        right: 12,
                        top: 4,
                        padding: 4
                    }}
                >
                    <Ionicons
                        name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                        size={22}
                        color={colors.lightBrown}
                    />
                </TouchableOpacity>
            </View>
        </View>
    </View>
</EditModal>
        </View>
    );
};

export default SettingScreen;
