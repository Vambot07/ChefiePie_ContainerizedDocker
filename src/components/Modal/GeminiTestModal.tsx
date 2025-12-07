// GeminiTestModal.tsx - IMPROVED UI VERSION
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
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: true,
        });

        if (!result.canceled && result.assets[0]) {
            const uri = result.assets[0].uri;
            setImageUri(uri);
            setIngredients([]);
            analyzeImage(uri);
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Camera permission is required');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: true,
        });

        if (!result.canceled && result.assets[0]) {
            const uri = result.assets[0].uri;
            setImageUri(uri);
            setIngredients([]);
            analyzeImage(uri);
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
                        {
                            text: 'Cancel',
                            style: 'cancel'
                        },
                        {
                            text: 'Retake Photo',
                            onPress: () => {
                                takePhoto();
                            }
                        },
                        {
                            text: 'Choose from Gallery',
                            onPress: () => {
                                pickImage();
                            }
                        }
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
                    {
                        text: 'Cancel',
                        style: 'cancel'
                    },
                    {
                        text: 'Retry',
                        onPress: () => analyzeImage(uri)
                    }
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
            transparent={true}
            onRequestClose={handleClose}
        >
            {/* Fixed: Better backdrop and positioning */}
            <View className="flex-1 bg-black/50 justify-end">
                {/* Fixed: Bottom sheet style instead of centered */}
                <View className="bg-white rounded-t-3xl h-[85%] w-full">
                    {/* Header */}
                    <View className="flex-row justify-between items-center px-6 pt-6 pb-4 border-b border-gray-200">
                        <View className="flex-1">
                            <Text className="text-2xl font-bold text-gray-800">
                                AI Detector
                            </Text>
                            <Text className="text-gray-500 text-sm mt-1">
                                Detect ingredients with AI
                            </Text>
                        </View>
                        <TouchableOpacity onPress={handleClose} className="p-2 -mr-2">
                            <Ionicons name="close" size={28} color="#666" />
                        </TouchableOpacity>
                    </View>

                    {/* Scrollable Content */}
                    <ScrollView
                        className="flex-1"
                        contentContainerStyle={{ padding: 24 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Action Buttons */}
                        <View className="flex-row gap-3 mb-6">
                            <TouchableOpacity
                                onPress={takePhoto}
                                className="flex-1 p-4 rounded-xl"
                                style={{ backgroundColor: colors.primary }}
                                disabled={loading}
                            >
                                <Text className="text-white font-semibold text-center">
                                    📷 Camera
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={pickImage}
                                className="flex-1 p-4 rounded-xl"
                                style={{ backgroundColor: colors.lightBrown }}
                                disabled={loading}
                            >
                                <Text className="text-white font-semibold text-center">
                                    🖼️ Gallery
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Image Preview - Fixed height */}
                        {imageUri && !loading && ingredients.length === 0 && (
                            <View className="mb-6">
                                <Text className="text-base font-semibold mb-3 text-gray-700">
                                    Selected Image:
                                </Text>
                                <Image
                                    source={{ uri: imageUri }}
                                    className="w-full rounded-xl"
                                    style={{ height: 250 }}
                                    resizeMode="cover"
                                />
                            </View>
                        )}

                        {/* Loading State */}
                        {loading && (
                            <View className="items-center py-16">
                                <ActivityIndicator size="large" color={colors.primary} />
                                <Text className="text-gray-600 mt-4 text-base font-medium">
                                    Analyzing...
                                </Text>
                                <Text className="text-gray-500 text-sm mt-2">
                                    This may take a few seconds
                                </Text>
                            </View>
                        )}

                        {/* Results Preview */}
                        {!loading && ingredients.length > 0 && (
                            <View>
                                {/* Small image preview with results */}
                                {imageUri && (
                                    <View className="mb-4">
                                        <Image
                                            source={{ uri: imageUri }}
                                            className="w-full rounded-xl"
                                            style={{ height: 180 }}
                                            resizeMode="cover"
                                        />
                                    </View>
                                )}

                                <Text className="text-xl font-bold mb-4 text-gray-800">
                                    ✅ Detected {ingredients.length} Ingredient{ingredients.length > 1 ? 's' : ''}
                                </Text>

                                {ingredients.map((ingredient, index) => (
                                    <View
                                        key={index}
                                        className="bg-green-50 border border-green-200 p-4 rounded-xl mb-3"
                                    >
                                        <Text className="text-base font-medium text-gray-800">
                                            {index + 1}. {ingredient.name}
                                        </Text>
                                    </View>
                                ))}

                                {/* Search Button */}
                                <TouchableOpacity
                                    className="mt-4 p-4 rounded-xl"
                                    style={{ backgroundColor: colors.primary }}
                                    onPress={() => {
                                        const ingredientNames = ingredients.map(ing => ing.name);
                                        Alert.alert(
                                            'Search Recipes',
                                            'Where would you like to search?',
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
                                    <Text className="text-white font-semibold text-center text-base">
                                        🔍 Search Recipes
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Empty State */}
                        {!loading && !imageUri && ingredients.length === 0 && (
                            <View className="items-center py-16">
                                <Ionicons name="images-outline" size={64} color="#D1D5DB" />
                                <Text className="text-gray-400 text-base mt-4">
                                    Take a photo or select from gallery
                                </Text>
                                <Text className="text-gray-400 text-sm mt-2 text-center px-8">
                                    AI will detect ingredients in your image
                                </Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}