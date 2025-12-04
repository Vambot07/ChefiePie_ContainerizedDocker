import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator
} from 'react-native';
import { useState } from 'react';
import { Ionicons, Feather, Fontisto } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '~/context/AuthContext';
import colors from '~/utils/color';
import * as ImagePicker from 'expo-image-picker';
import { uploadProfileToFirebase } from '~/utils/uploadImage';
import Header from '~/components/Header';
import EditModal from '~/components/Modal/EditModal';

const EditProfileScreen = () => {
    const navigation = useNavigation();
    const { user, updateUserInFirestore } = useAuth(); // ✅ Get from context

    const profileImage = user?.profileImage;
    const username = user?.username;

    // Form states
    const [newUsername, setNewUsername] = useState<string>(username || '');
    const [bio, setBio] = useState<string>(user?.bio || '');
    const [instagram, setInstagram] = useState<string>(user?.instagram || '');
    const [youtube, setYoutube] = useState<string>(user?.youtube || '');
    const [tiktok, setTiktok] = useState<string>(user?.tiktok || '');

    // Image states
    const [selectedImage, setSelectedImage] = useState<string | null>(profileImage || null);
    const [uploading, setUploading] = useState(false);

    // Modal states
    const [showEditInstagram, setShowEditInstagram] = useState(false);
    const [showEditYoutube, setShowEditYoutube] = useState(false);
    const [showEditTiktok, setShowEditTiktok] = useState(false);
    const [loading, setLoading] = useState(false);

    const maxBioLength = 255;

    // ✅ Pick Image from Gallery
    const pickImage = async () => {
        try {
            console.log('📸 Opening image picker...');

            // Request permission
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (permissionResult.granted === false) {
                Alert.alert('Permission Required', 'You need to allow access to your photos to change your profile picture.');
                return;
            }

            // Launch image picker
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
            });

            console.log('📸 Image picker result:', result);

            if (!result.canceled && result.assets[0]) {
                console.log('✅ Image selected:', result.assets[0].uri);
                setSelectedImage(result.assets[0].uri);
            } else {
                console.log('❌ Image picker cancelled');
            }
        } catch (error) {
            console.error('❌ Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image. Please try again.');
        }
    };

    // ✅ Validate Social Media Links
    const isValidSocialLink = (link: string, platform: 'instagram' | 'youtube' | 'tiktok'): boolean => {
        if (!link) return true;

        const cleanLink = link.replace('@', '').trim();

        switch (platform) {
            case 'instagram':
                const igRegex = /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)\/?$/;
                const igUsernameRegex = /^[a-zA-Z0-9._]{1,30}$/;
                return igRegex.test(link) || igUsernameRegex.test(cleanLink);

            case 'youtube':
                const ytRegex = /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/(c\/|channel\/|@)?([a-zA-Z0-9_-]+)\/?$/;
                return ytRegex.test(link) || /^@?[a-zA-Z0-9_-]{3,30}$/.test(cleanLink);

            case 'tiktok':
                const ttRegex = /^(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@([a-zA-Z0-9._]+)\/?$/;
                const ttUsernameRegex = /^[a-zA-Z0-9._]{2,24}$/;
                return ttRegex.test(link) || ttUsernameRegex.test(cleanLink);

            default:
                return false;
        }
    };

    // ✅ Handle Instagram Update
    const handleUpdateInstagram = async () => {
        const trimmedInstagram = instagram.trim();

        try {
            if (trimmedInstagram && !isValidSocialLink(trimmedInstagram, 'instagram')) {
                Alert.alert('Error', 'Please enter a valid Instagram username or URL\n\nExamples:\n• @username\n• username\n• instagram.com/username');
                return;
            }

            setLoading(true);

            if (user?.userId) {
                const result = await updateUserInFirestore(user.userId, { instagram: trimmedInstagram });

                if (!result.success) {
                    throw new Error('Failed to update');
                }
            }

            Alert.alert('Success', 'Instagram updated successfully!');
            setShowEditInstagram(false);

        } catch (error) {
            console.error("❌ Error updating Instagram:", error);
            Alert.alert('Error', 'Failed to update Instagram. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ✅ Handle YouTube Update
    const handleUpdateYoutube = async () => {
        const trimmedYoutube = youtube.trim();

        try {
            if (trimmedYoutube && !isValidSocialLink(trimmedYoutube, 'youtube')) {
                Alert.alert('Error', 'Please enter a valid YouTube channel URL\n\nExamples:\n• @channelname\n• youtube.com/@channelname');
                return;
            }

            setLoading(true);

            if (user?.userId) {
                const result = await updateUserInFirestore(user.userId, { youtube: trimmedYoutube });

                if (!result.success) {
                    throw new Error('Failed to update');
                }
            }

            Alert.alert('Success', 'YouTube updated successfully!');
            setShowEditYoutube(false);

        } catch (error) {
            console.error("❌ Error updating YouTube:", error);
            Alert.alert('Error', 'Failed to update YouTube. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ✅ Handle TikTok Update
    const handleUpdateTiktok = async () => {
        const trimmedTiktok = tiktok.trim();

        try {
            if (trimmedTiktok && !isValidSocialLink(trimmedTiktok, 'tiktok')) {
                Alert.alert('Error', 'Please enter a valid TikTok username or URL\n\nExamples:\n• @username\n• tiktok.com/@username');
                return;
            }

            setLoading(true);

            if (user?.userId) {
                const result = await updateUserInFirestore(user.userId, { tiktok: trimmedTiktok });

                if (!result.success) {
                    throw new Error('Failed to update');
                }
            }

            Alert.alert('Success', 'TikTok updated successfully!');
            setShowEditTiktok(false);

        } catch (error) {
            console.error("❌ Error updating TikTok:", error);
            Alert.alert('Error', 'Failed to update TikTok. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ✅ Get display text for social media
    const getSocialDisplayText = (link: string | undefined, platform: string): string => {
        if (!link) return `Add your ${platform}`;

        if (link.includes('instagram.com')) {
            const match = link.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
            return match ? `@${match[1]}` : link;
        } else if (link.includes('youtube.com')) {
            const match = link.match(/youtube\.com\/(c\/|channel\/|@)?([a-zA-Z0-9_-]+)/);
            return match ? match[2] : link;
        } else if (link.includes('tiktok.com')) {
            const match = link.match(/tiktok\.com\/@([a-zA-Z0-9._]+)/);
            return match ? `@${match[1]}` : link;
        }

        return link.startsWith('@') ? link : `@${link}`;
    };

    // ✅ Handle Save Profile (with image upload)
    const handleSave = async () => {
        try {
            if (!newUsername.trim()) {
                Alert.alert("Error", "Username is required");
                return;
            }

            if (!user?.userId) {
                Alert.alert("Error", "User ID not found. Please try logging in again.");
                return;
            }

            setUploading(true);

            let imageUrl = profileImage || '';

            // ✅ Upload new image if selected and different from current
            if (selectedImage && selectedImage !== profileImage) {
                console.log('📤 New image selected, uploading...');
                console.log('🖼️ Image URI:', selectedImage);

                try {
                    // ✅ Create unique filename
                    const fileName = `profile_${user.userId}_${Date.now()}.jpg`;
                    console.log('📁 Filename:', fileName);

                    // ✅ Upload using your function
                    imageUrl = await uploadProfileToFirebase(selectedImage, fileName);
                    console.log('✅ Upload successful! URL:', imageUrl);
                } catch (uploadError) {
                    console.error('❌ Upload failed:', uploadError);
                    Alert.alert('Upload Error', 'Failed to upload profile picture. Please try again.');
                    setUploading(false);
                    return;
                }
            }

            // ✅ Use context function - single call updates both Firestore AND local state
            const result = await updateUserInFirestore(user.userId, {
                username: newUsername.trim(),
                bio: bio.trim(),
                profileImage: imageUrl,
            });

            if (!result.success) {
                throw new Error('Failed to update profile');
            }

            Alert.alert("Success", "Profile updated successfully!");
            navigation.goBack();

        } catch (error) {
            console.error("❌ Error updating profile:", error);
            Alert.alert("Error", "Failed to update profile. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <View className="flex-1 bg-gray-50">
            <Header
                title="Edit Profile"
                showBackButton={true}
                onBack={() => navigation.goBack()}
            />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                    <View className="px-4 py-6">
                        {/* Profile Picture Section */}
                        <View className="items-center mb-8">
                            <TouchableOpacity onPress={pickImage} disabled={uploading}>
                                <View className="relative">
                                    <View
                                        className="w-32 h-32 rounded-full items-center justify-center"
                                        style={{
                                            backgroundColor: colors.white,
                                            borderWidth: 2,
                                            borderColor: colors.lightBrown
                                        }}
                                    >
                                        {selectedImage ? (
                                            <Image
                                                source={{ uri: selectedImage }}
                                                className='rounded-full w-32 h-32'
                                                style={{ resizeMode: 'cover' }}
                                            />
                                        ) : (
                                            <Fontisto name="male" size={40} color={colors.lightBrown} />
                                        )}

                                        {/* ✅ Loading overlay while uploading */}
                                        {uploading && (
                                            <View
                                                className="absolute inset-0 rounded-full items-center justify-center"
                                                style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                                            >
                                                <ActivityIndicator size="large" color="#fff" />
                                            </View>
                                        )}
                                    </View>

                                    {/* Edit Icon */}
                                    <View
                                        className="absolute bottom-0 right-0 bg-gray-400 w-8 h-8 rounded-full items-center justify-center"
                                    >
                                        <Feather name="edit-2" size={14} color="white" />
                                    </View>
                                </View>
                            </TouchableOpacity>
                            <Text className="text-xs text-gray-500 mt-2">Tap to change profile picture</Text>
                        </View>

                        {/* Form Fields */}
                        <View className="space-y-16">
                            {/* Username */}
                            <View>
                                <Text className="text-sm font-medium mb-2" style={{ color: colors.darkBrown }}>
                                    Username
                                </Text>
                                <TextInput
                                    value={newUsername}
                                    onChangeText={setNewUsername}
                                    className="bg-white px-4 py-3 rounded-xl border border-gray-200"
                                    placeholder="Username"
                                    placeholderTextColor={colors.lightBrown}
                                    style={{ color: colors.darkBrown }}
                                />
                            </View>

                            {/* Bio */}
                            <View>
                                <Text className="text-sm font-medium mb-2" style={{ color: colors.darkBrown }}>
                                    Bio
                                </Text>
                                <View className="relative">
                                    <TextInput
                                        value={bio}
                                        onChangeText={setBio}
                                        className="bg-white px-4 py-3 rounded-xl border border-gray-200 h-24"
                                        placeholder="Tell us about yourself..."
                                        placeholderTextColor={colors.lightBrown}
                                        style={{ color: colors.darkBrown }}
                                        multiline
                                        textAlignVertical="top"
                                        maxLength={maxBioLength}
                                    />
                                    <View className='flex-row justify-end'>
                                        <Text className="text-right text-xs mt-1" style={{ color: colors.lightBrown }}>
                                            {bio.length}/{maxBioLength}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Social Section */}
                        <View className="mt-8">
                            <Text className="text-base font-semibold mb-4" style={{ color: colors.darkBrown }}>
                                Social Media Links (Optional)
                            </Text>

                            {/* Instagram */}
                            <TouchableOpacity
                                className="bg-white rounded-xl p-4 border border-gray-200 mb-3"
                                onPress={() => {
                                    setInstagram(user?.instagram || '');
                                    setShowEditInstagram(true);
                                }}
                            >
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-row items-center">
                                        <View
                                            className="w-10 h-10 rounded-full items-center justify-center mr-3"
                                            style={{ backgroundColor: colors.lightPeach }}
                                        >
                                            <Feather name="instagram" size={18} color={colors.darkBrown} />
                                        </View>
                                        <View>
                                            <Text className="font-medium" style={{ color: colors.darkBrown }}>
                                                Instagram
                                            </Text>
                                            <Text className="text-xs" style={{ color: colors.lightBrown }}>
                                                {getSocialDisplayText(user?.instagram, 'Instagram')}
                                            </Text>
                                        </View>
                                    </View>
                                    <Feather name="edit-2" size={16} color={colors.lightBrown} />
                                </View>
                            </TouchableOpacity>

                            {/* YouTube */}
                            <TouchableOpacity
                                className="bg-white rounded-xl p-4 border border-gray-200 mb-3"
                                onPress={() => {
                                    setYoutube(user?.youtube || '');
                                    setShowEditYoutube(true);
                                }}
                            >
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-row items-center">
                                        <View
                                            className="w-10 h-10 rounded-full items-center justify-center mr-3"
                                            style={{ backgroundColor: colors.lightPeach }}
                                        >
                                            <Feather name="youtube" size={18} color={colors.darkBrown} />
                                        </View>
                                        <View>
                                            <Text className="font-medium" style={{ color: colors.darkBrown }}>
                                                YouTube
                                            </Text>
                                            <Text className="text-xs" style={{ color: colors.lightBrown }}>
                                                {getSocialDisplayText(user?.youtube, 'YouTube')}
                                            </Text>
                                        </View>
                                    </View>
                                    <Feather name="edit-2" size={16} color={colors.lightBrown} />
                                </View>
                            </TouchableOpacity>

                            {/* TikTok */}
                            <TouchableOpacity
                                className="bg-white rounded-xl p-4 border border-gray-200"
                                onPress={() => {
                                    setTiktok(user?.tiktok || '');
                                    setShowEditTiktok(true);
                                }}
                            >
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-row items-center">
                                        <View
                                            className="w-10 h-10 rounded-full items-center justify-center mr-3"
                                            style={{ backgroundColor: colors.lightPeach }}
                                        >
                                            <Ionicons name="logo-tiktok" size={18} color={colors.darkBrown} />
                                        </View>
                                        <View>
                                            <Text className="font-medium" style={{ color: colors.darkBrown }}>
                                                TikTok
                                            </Text>
                                            <Text className="text-xs" style={{ color: colors.lightBrown }}>
                                                {getSocialDisplayText(user?.tiktok, 'TikTok')}
                                            </Text>
                                        </View>
                                    </View>
                                    <Feather name="edit-2" size={16} color={colors.lightBrown} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>

                {/* ✅ Instagram Modal */}
                <EditModal
                    visible={showEditInstagram}
                    onClose={() => {
                        setShowEditInstagram(false);
                        setInstagram(user?.instagram || '');
                    }}
                    title="Edit Instagram"
                    onSave={handleUpdateInstagram}
                    loading={loading}
                >
                    <View>
                        <Text className="text-sm font-medium mb-2" style={{ color: colors.darkBrown }}>
                            Instagram Username or URL
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Feather name="instagram" size={20} color={colors.lightBrown} style={{ marginRight: 8 }} />
                            <TextInput
                                value={instagram}
                                onChangeText={setInstagram}
                                className="bg-white px-4 py-3 rounded-xl border border-gray-200 flex-1"
                                placeholder="@username or instagram.com/username"
                                placeholderTextColor={colors.lightBrown}
                                style={{ color: colors.darkBrown }}
                                autoCapitalize="none"
                            />
                        </View>
                        <Text className="text-xs mt-2" style={{ color: colors.lightBrown }}>
                            Enter your Instagram username (e.g., @johndoe) or full URL
                        </Text>
                    </View>
                </EditModal>

                {/* ✅ YouTube Modal */}
                <EditModal
                    visible={showEditYoutube}
                    onClose={() => {
                        setShowEditYoutube(false);
                        setYoutube(user?.youtube || '');
                    }}
                    title="Edit YouTube"
                    onSave={handleUpdateYoutube}
                    loading={loading}
                >
                    <View>
                        <Text className="text-sm font-medium mb-2" style={{ color: colors.darkBrown }}>
                            YouTube Channel URL
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Feather name="youtube" size={20} color={colors.lightBrown} style={{ marginRight: 8 }} />
                            <TextInput
                                value={youtube}
                                onChangeText={setYoutube}
                                className="bg-white px-4 py-3 rounded-xl border border-gray-200 flex-1"
                                placeholder="@channelname or youtube.com/channel"
                                placeholderTextColor={colors.lightBrown}
                                style={{ color: colors.darkBrown }}
                                autoCapitalize="none"
                            />
                        </View>
                        <Text className="text-xs mt-2" style={{ color: colors.lightBrown }}>
                            Enter your YouTube channel name (e.g., @channel) or full URL
                        </Text>
                    </View>
                </EditModal>

                {/* ✅ TikTok Modal */}
                <EditModal
                    visible={showEditTiktok}
                    onClose={() => {
                        setShowEditTiktok(false);
                        setTiktok(user?.tiktok || '');
                    }}
                    title="Edit TikTok"
                    onSave={handleUpdateTiktok}
                    loading={loading}
                >
                    <View>
                        <Text className="text-sm font-medium mb-2" style={{ color: colors.darkBrown }}>
                            TikTok Username or URL
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="logo-tiktok" size={20} color={colors.lightBrown} style={{ marginRight: 8 }} />
                            <TextInput
                                value={tiktok}
                                onChangeText={setTiktok}
                                className="bg-white px-4 py-3 rounded-xl border border-gray-200 flex-1"
                                placeholder="@username or tiktok.com/@username"
                                placeholderTextColor={colors.lightBrown}
                                style={{ color: colors.darkBrown }}
                                autoCapitalize="none"
                            />
                        </View>
                        <Text className="text-xs mt-2" style={{ color: colors.lightBrown }}>
                            Enter your TikTok username (e.g., @johndoe) or full URL
                        </Text>
                    </View>
                </EditModal>
            </KeyboardAvoidingView>

            {/* ✅ Save Button */}
            <View className="px-4 py-4 bg-white border-t border-gray-100">
                <TouchableOpacity
                    className="py-4 rounded-xl items-center"
                    style={{ backgroundColor: uploading ? colors.lightBrown : colors.primary }}
                    onPress={handleSave}
                    disabled={uploading}
                >
                    {uploading ? (
                        <View className="flex-row items-center">
                            <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                            <Text className="text-white font-semibold text-lg">Saving...</Text>
                        </View>
                    ) : (
                        <Text className="text-white font-semibold text-lg">Save Profile</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default EditProfileScreen;