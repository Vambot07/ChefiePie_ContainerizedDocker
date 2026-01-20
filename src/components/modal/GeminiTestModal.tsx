// GeminiTestModal.tsx - Modern Full-Screen Design with Project Colors
import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    ScrollView,
    Alert,
    Modal,
    StatusBar,
} from 'react-native';
import colors from '~/utils/color';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import {
    detectIngredientsFromImage,
    DetectedIngredient,
} from '../../api/gemini/geminiService';

interface GeminiTestModalProps {
    visible: boolean;
    onClose: () => void;
    onIngredientsDetected: (ingredients: string[]) => void;
}

export default function GeminiTestModal({ visible, onClose, onIngredientsDetected }: GeminiTestModalProps) {
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [ingredients, setIngredients] = useState<DetectedIngredient[]>([]);

    const pickImage = async () => {
        try {
            console.log('🖼️ Opening gallery...');

            // Request permission
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Gallery permission is required');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                quality: 0.5,
                allowsEditing: true,
                legacy: true,
            });

            console.log('Gallery result:', result.canceled ? 'Cancelled' : 'Success');

            if (!result.canceled && result.assets[0]) {
                const uri = result.assets[0].uri;
                console.log('✅ Image selected:', uri);
                setImageUri(uri);
                setIngredients([]);
                analyzeImage(uri);
            }
        } catch (error: any) {
            console.error('❌ Gallery error:', error);
            Alert.alert('Gallery Error', 'Failed to open gallery: ' + (error.message || 'Unknown error'));
        }
    };

    const takePhoto = async () => {
        try {
            console.log('📷 Opening camera...');

            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Camera permission is required');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: 'images',
                quality: 0.5,
                allowsEditing: true,
            });

            console.log('Camera result:', result.canceled ? 'Cancelled' : 'Success');

            if (!result.canceled && result.assets[0]) {
                const uri = result.assets[0].uri;
                console.log('✅ Photo captured:', uri);
                setImageUri(uri);
                setIngredients([]);
                analyzeImage(uri);
            }
        } catch (error: any) {
            console.error('❌ Camera error:', error);
            Alert.alert('Camera Error', 'Failed to open camera: ' + (error.message || 'Unknown error'));
        }
    };

    const analyzeImage = async (uri: string) => {
        setLoading(true);
        try {
            const detected = await detectIngredientsFromImage(uri);
            setIngredients(detected);

            if (detected.length === 0) {
                Alert.alert(
                    'No Ingredients Found',
                    'We couldn\'t detect any ingredients in the image. Please try again with better lighting or a clearer view.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Retake Photo', onPress: () => takePhoto() },
                        { text: 'Choose from Gallery', onPress: () => pickImage() }
                    ]
                );
            } else {
                const ingredientNames = detected.map(ing => ing.name);
                Alert.alert(
                    '🎉 Ingredients Detected!',
                    `Found: ${ingredientNames.join(', ')}\n`
                );
            }
        } catch (error: any) {
            console.error('Analysis error:', error);
            Alert.alert(
                'Detection Failed',
                error.message || 'Failed to detect ingredients. Please try again.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Retry', onPress: () => analyzeImage(uri) }
                ]
            );
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setImageUri(null);
        setIngredients([]);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={handleClose}
        >
            <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
            <View className="flex-1" style={{ backgroundColor: colors.secondary }}>
                {/* Gradient Header */}
                <View
                    className="pt-12 pb-6 px-6"
                    style={{ backgroundColor: colors.primary }}
                >
                    <View className="flex-row justify-between items-center">
                        <View className="flex-1">
                            <Text className="text-white text-3xl font-bold">
                                AI Detector
                            </Text>
                            <Text className="text-white/80 text-base mt-1">
                                Detect ingredients with AI
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleClose}
                            className="w-10 h-10 rounded-full items-center justify-center"
                            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                        >
                            <Ionicons name="close" size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView
                    className="flex-1 px-5 pt-6"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Action Buttons */}
                    <View className="flex-row gap-3 mb-6">
                        <TouchableOpacity
                            onPress={takePhoto}
                            disabled={loading}
                            className="flex-1 rounded-2xl p-5"
                            style={{
                                backgroundColor: colors.primary,
                                shadowColor: colors.primary,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                                elevation: 6,
                            }}
                        >
                            <View className="items-center">
                                <Ionicons name="camera" size={32} color="white" />
                                <Text className="text-white font-bold text-base mt-2">
                                    Camera
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={pickImage}
                            disabled={loading}
                            className="flex-1 rounded-2xl p-5"
                            style={{
                                backgroundColor: colors.accent,
                                shadowColor: colors.accent,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                                elevation: 6,
                            }}
                        >
                            <View className="items-center">
                                <Ionicons name="images" size={32} color="white" />
                                <Text className="text-white font-bold text-base mt-2">
                                    Gallery
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Image Preview Card */}
                    {imageUri && !loading && ingredients.length === 0 && (
                        <View
                            className="rounded-3xl overflow-hidden mb-6"
                            style={{
                                backgroundColor: colors.white,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 8,
                                elevation: 4,
                            }}
                        >
                            <View className="p-4">
                                <Text className="text-lg font-bold mb-3" style={{ color: colors.darkBrown }}>
                                    📸 Selected Image
                                </Text>
                                <Image
                                    source={{ uri: imageUri }}
                                    className="w-full rounded-2xl"
                                    style={{ height: 300 }}
                                    resizeMode="cover"
                                />
                            </View>
                        </View>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <View
                            className="rounded-3xl p-8 items-center justify-center mb-6"
                            style={{
                                backgroundColor: colors.white,
                                minHeight: 300,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 8,
                                elevation: 4,
                            }}
                        >
                            <View
                                className="w-20 h-20 rounded-full items-center justify-center mb-4"
                                style={{ backgroundColor: colors.lightPeach }}
                            >
                                <ActivityIndicator size="large" color={colors.primary} />
                            </View>
                            <Text className="text-xl font-bold mb-2" style={{ color: colors.darkBrown }}>
                                Analyzing Image...
                            </Text>
                            <Text className="text-base text-center" style={{ color: colors.lightBrown }}>
                                AI is detecting ingredients in your photo
                            </Text>
                        </View>
                    )}

                    {/* Results */}
                    {!loading && ingredients.length > 0 && (
                        <View>
                            {/* Image Thumbnail */}
                            {imageUri && (
                                <View
                                    className="rounded-3xl overflow-hidden mb-6"
                                    style={{
                                        backgroundColor: colors.white,
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.1,
                                        shadowRadius: 8,
                                        elevation: 4,
                                    }}
                                >
                                    <Image
                                        source={{ uri: imageUri }}
                                        className="w-full"
                                        style={{ height: 200 }}
                                        resizeMode="cover"
                                    />
                                </View>
                            )}

                            {/* Success Header */}
                            <View
                                className="rounded-3xl p-5 mb-4"
                                style={{
                                    backgroundColor: colors.primary,
                                    shadowColor: colors.primary,
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 6,
                                }}
                            >
                                <View className="flex-row items-center">
                                    <View
                                        className="w-12 h-12 rounded-full items-center justify-center mr-3"
                                        style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                                    >
                                        <Ionicons name="checkmark-circle" size={28} color="white" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-white text-2xl font-bold">
                                            {ingredients.length} Ingredient{ingredients.length > 1 ? 's' : ''}
                                        </Text>
                                        <Text className="text-white/80 text-sm">
                                            Successfully detected
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Ingredients List */}
                            {ingredients.map((ingredient, index) => (
                                <View
                                    key={index}
                                    className="rounded-2xl p-4 mb-3 flex-row items-center"
                                    style={{
                                        backgroundColor: colors.white,
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: 0.08,
                                        shadowRadius: 4,
                                        elevation: 2,
                                    }}
                                >
                                    <View
                                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                                        style={{ backgroundColor: colors.lightPeach }}
                                    >
                                        <Text className="font-bold" style={{ color: colors.primary }}>
                                            {index + 1}
                                        </Text>
                                    </View>
                                    <Text className="flex-1 text-base font-semibold" style={{ color: colors.darkBrown }}>
                                        {ingredient.name}
                                    </Text>
                                    <Ionicons name="leaf" size={20} color={colors.primary} />
                                </View>
                            ))}

                            {/* Action Buttons */}
                            <TouchableOpacity
                                className="rounded-2xl p-5 mb-4"
                                style={{
                                    backgroundColor: colors.primary,
                                    shadowColor: colors.primary,
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 6,
                                }}
                                onPress={() => {
                                    const ingredientNames = ingredients.map(ing => ing.name);
                                    Alert.alert(
                                        'Search Recipes',
                                        'Search for recipes with these ingredients?',
                                        [
                                            {
                                                text: 'Search',
                                                onPress: () => {
                                                    onIngredientsDetected(ingredientNames);
                                                    handleClose();
                                                }
                                            },
                                            { text: 'Cancel', style: 'cancel' }
                                        ]
                                    );
                                }}
                            >
                                <View className="flex-row items-center justify-center">
                                    <Ionicons name="search" size={20} color="white" />
                                    <Text className="text-white font-bold text-base ml-2">
                                        Search Recipes
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="rounded-2xl p-5 mb-6"
                                style={{
                                    backgroundColor: colors.white,
                                    borderWidth: 2,
                                    borderColor: colors.lightBrown,
                                }}
                                onPress={() => {
                                    setImageUri(null);
                                    setIngredients([]);
                                }}
                            >
                                <View className="flex-row items-center justify-center">
                                    <Ionicons name="camera" size={20} color={colors.lightBrown} />
                                    <Text className="font-bold text-base ml-2" style={{ color: colors.lightBrown }}>
                                        Detect New Ingredients
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Empty State */}
                    {!loading && !imageUri && ingredients.length === 0 && (
                        <View
                            className="rounded-3xl p-12 items-center justify-center mb-6"
                            style={{
                                backgroundColor: colors.white,
                                minHeight: 350,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 8,
                                elevation: 4,
                            }}
                        >
                            <View
                                className="w-24 h-24 rounded-full items-center justify-center mb-6"
                                style={{ backgroundColor: colors.lightPeach }}
                            >
                                <Ionicons name="camera-outline" size={48} color={colors.primary} />
                            </View>
                            <Text className="text-2xl font-bold mb-2 text-center" style={{ color: colors.darkBrown }}>
                                No Image Selected
                            </Text>
                            <Text className="text-base text-center px-6" style={{ color: colors.lightBrown }}>
                                Take a photo or choose from gallery to detect ingredients
                            </Text>
                        </View>
                    )}
                </ScrollView>
            </View>
        </Modal>
    );
}
