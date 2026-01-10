// CalorieCountModal.tsx - Modern Full-Screen Design with Project Colors
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
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { detectNutritionFromImage, NutritionFacts } from '~/api/gemini/calorieService';
import colors from '~/utils/color';

interface CalorieCountModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function CalorieCountModal({ visible, onClose }: CalorieCountModalProps) {
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [nutritionData, setNutritionData] = useState<NutritionFacts | null>(null);

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
                setNutritionData(null);
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
                setNutritionData(null);
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
            const nutrition = await detectNutritionFromImage(uri);
            setNutritionData(nutrition);

            if (nutrition.confidence === 'low') {
                Alert.alert(
                    'Low Confidence',
                    'The food in the image is unclear. The nutrition information may not be accurate.',
                    [{ text: 'OK' }]
                );
            } else {
                Alert.alert(
                    '🎉 Nutrition Detected!',
                    `Food: ${nutrition.foodName}\nCalories: ${nutrition.calories}`
                );
            }
        } catch (error: any) {
            console.error('Analysis error:', error);
            Alert.alert(
                'Analysis Failed',
                error.message || 'Failed to analyze nutrition. Please try again.',
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
        setNutritionData(null);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={handleClose}
        >
            <StatusBar barStyle="light-content" backgroundColor={colors.blush} />
            <View className="flex-1" style={{ backgroundColor: colors.secondary }}>
                {/* Header - Using blush color for distinction */}
                <View
                    className="pt-12 pb-6 px-6"
                    style={{ backgroundColor: colors.blush }}
                >
                    <View className="flex-row justify-between items-center">
                        <View className="flex-1">
                            <Text className="text-white text-3xl font-bold">
                                Calorie Counter
                            </Text>
                            <Text className="text-white/80 text-base mt-1">
                                Detect nutrition with AI
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
                    {/* Action Buttons - Using blush and accent colors */}
                    <View className="flex-row gap-3 mb-6">
                        <TouchableOpacity
                            onPress={takePhoto}
                            disabled={loading}
                            className="flex-1 rounded-2xl p-5"
                            style={{
                                backgroundColor: colors.blush,
                                shadowColor: colors.blush,
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
                    {imageUri && !loading && !nutritionData && (
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
                                <ActivityIndicator size="large" color={colors.blush} />
                            </View>
                            <Text className="text-xl font-bold mb-2" style={{ color: colors.darkBrown }}>
                                Analyzing Nutrition...
                            </Text>
                            <Text className="text-base text-center" style={{ color: colors.lightBrown }}>
                                AI is detecting nutritional information
                            </Text>
                        </View>
                    )}

                    {/* Results */}
                    {!loading && nutritionData && (
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

                            {/* Food Name & Confidence */}
                            <View
                                className="rounded-3xl p-5 mb-4"
                                style={{
                                    backgroundColor: colors.white,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 8,
                                    elevation: 4,
                                }}
                            >
                                <Text className="text-2xl font-bold mb-1" style={{ color: colors.darkBrown }}>
                                    {nutritionData.foodName}
                                </Text>
                                <Text className="text-base mb-3" style={{ color: colors.lightBrown }}>
                                    Serving: {nutritionData.servingSize}
                                </Text>
                                <View
                                    className="px-3 py-2 rounded-full self-start"
                                    style={{
                                        backgroundColor: nutritionData.confidence === 'high'
                                            ? colors.lightPeach
                                            : nutritionData.confidence === 'medium'
                                            ? colors.accent
                                            : colors.blush,
                                    }}
                                >
                                    <Text className="text-xs font-bold text-white">
                                        {nutritionData.confidence.toUpperCase()} CONFIDENCE
                                    </Text>
                                </View>
                            </View>

                            {/* Calories - Big Card */}
                            <View
                                className="rounded-3xl p-6 mb-4"
                                style={{
                                    backgroundColor: colors.blush,
                                    shadowColor: colors.blush,
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 6,
                                }}
                            >
                                <View className="flex-row items-center">
                                    <View
                                        className="w-16 h-16 rounded-full items-center justify-center mr-4"
                                        style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                                    >
                                        <Ionicons name="flame" size={32} color="white" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-white/80 text-sm font-semibold mb-1">
                                            Total Calories
                                        </Text>
                                        <Text className="text-white text-4xl font-bold">
                                            {nutritionData.calories}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Macronutrients Section */}
                            <Text className="text-xl font-bold mb-4" style={{ color: colors.darkBrown }}>
                                Macronutrients
                            </Text>
                            <View className="flex-row flex-wrap gap-3 mb-6">
                                {/* Protein */}
                                <View
                                    className="flex-1 min-w-[45%] rounded-2xl p-4"
                                    style={{
                                        backgroundColor: colors.white,
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: 0.08,
                                        shadowRadius: 4,
                                        elevation: 2,
                                    }}
                                >
                                    <View className="flex-row items-center mb-2">
                                        <View
                                            className="w-8 h-8 rounded-full items-center justify-center mr-2"
                                            style={{ backgroundColor: colors.lightPeach }}
                                        >
                                            <Ionicons name="barbell" size={16} color={colors.primary} />
                                        </View>
                                        <Text className="font-semibold" style={{ color: colors.lightBrown }}>
                                            Protein
                                        </Text>
                                    </View>
                                    <Text className="text-2xl font-bold" style={{ color: colors.darkBrown }}>
                                        {nutritionData.protein}
                                    </Text>
                                </View>

                                {/* Carbs */}
                                <View
                                    className="flex-1 min-w-[45%] rounded-2xl p-4"
                                    style={{
                                        backgroundColor: colors.white,
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: 0.08,
                                        shadowRadius: 4,
                                        elevation: 2,
                                    }}
                                >
                                    <View className="flex-row items-center mb-2">
                                        <View
                                            className="w-8 h-8 rounded-full items-center justify-center mr-2"
                                            style={{ backgroundColor: colors.lightPeach }}
                                        >
                                            <Ionicons name="leaf" size={16} color={colors.accent} />
                                        </View>
                                        <Text className="font-semibold" style={{ color: colors.lightBrown }}>
                                            Carbs
                                        </Text>
                                    </View>
                                    <Text className="text-2xl font-bold" style={{ color: colors.darkBrown }}>
                                        {nutritionData.carbohydrates}
                                    </Text>
                                </View>

                                {/* Fat */}
                                <View
                                    className="flex-1 min-w-[45%] rounded-2xl p-4"
                                    style={{
                                        backgroundColor: colors.white,
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: 0.08,
                                        shadowRadius: 4,
                                        elevation: 2,
                                    }}
                                >
                                    <View className="flex-row items-center mb-2">
                                        <View
                                            className="w-8 h-8 rounded-full items-center justify-center mr-2"
                                            style={{ backgroundColor: colors.lightPeach }}
                                        >
                                            <Ionicons name="water" size={16} color={colors.blush} />
                                        </View>
                                        <Text className="font-semibold" style={{ color: colors.lightBrown }}>
                                            Fat
                                        </Text>
                                    </View>
                                    <Text className="text-2xl font-bold" style={{ color: colors.darkBrown }}>
                                        {nutritionData.fat}
                                    </Text>
                                </View>

                                {/* Fiber */}
                                <View
                                    className="flex-1 min-w-[45%] rounded-2xl p-4"
                                    style={{
                                        backgroundColor: colors.white,
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: 0.08,
                                        shadowRadius: 4,
                                        elevation: 2,
                                    }}
                                >
                                    <View className="flex-row items-center mb-2">
                                        <View
                                            className="w-8 h-8 rounded-full items-center justify-center mr-2"
                                            style={{ backgroundColor: colors.lightPeach }}
                                        >
                                            <Ionicons name="nutrition" size={16} color={colors.primary} />
                                        </View>
                                        <Text className="font-semibold" style={{ color: colors.lightBrown }}>
                                            Fiber
                                        </Text>
                                    </View>
                                    <Text className="text-2xl font-bold" style={{ color: colors.darkBrown }}>
                                        {nutritionData.fiber}
                                    </Text>
                                </View>
                            </View>

                            {/* Additional Information */}
                            <Text className="text-xl font-bold mb-4" style={{ color: colors.darkBrown }}>
                                Additional Information
                            </Text>
                            <View
                                className="rounded-3xl p-4 mb-4"
                                style={{
                                    backgroundColor: colors.white,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.08,
                                    shadowRadius: 4,
                                    elevation: 2,
                                }}
                            >
                                <View className="flex-row justify-between items-center py-2">
                                    <Text className="font-medium" style={{ color: colors.lightBrown }}>
                                        Sugar
                                    </Text>
                                    <Text className="font-bold" style={{ color: colors.darkBrown }}>
                                        {nutritionData.sugar}
                                    </Text>
                                </View>
                                <View className="h-px" style={{ backgroundColor: colors.secondary }} />
                                <View className="flex-row justify-between items-center py-2">
                                    <Text className="font-medium" style={{ color: colors.lightBrown }}>
                                        Sodium
                                    </Text>
                                    <Text className="font-bold" style={{ color: colors.darkBrown }}>
                                        {nutritionData.sodium}
                                    </Text>
                                </View>
                                {nutritionData.cholesterol && nutritionData.cholesterol !== 'Unknown' && (
                                    <>
                                        <View className="h-px" style={{ backgroundColor: colors.secondary }} />
                                        <View className="flex-row justify-between items-center py-2">
                                            <Text className="font-medium" style={{ color: colors.lightBrown }}>
                                                Cholesterol
                                            </Text>
                                            <Text className="font-bold" style={{ color: colors.darkBrown }}>
                                                {nutritionData.cholesterol}
                                            </Text>
                                        </View>
                                    </>
                                )}
                                {nutritionData.saturatedFat && nutritionData.saturatedFat !== 'Unknown' && (
                                    <>
                                        <View className="h-px" style={{ backgroundColor: colors.secondary }} />
                                        <View className="flex-row justify-between items-center py-2">
                                            <Text className="font-medium" style={{ color: colors.lightBrown }}>
                                                Saturated Fat
                                            </Text>
                                            <Text className="font-bold" style={{ color: colors.darkBrown }}>
                                                {nutritionData.saturatedFat}
                                            </Text>
                                        </View>
                                    </>
                                )}
                            </View>

                            {/* Action Buttons */}
                            <TouchableOpacity
                                className="rounded-2xl p-5 mb-4"
                                style={{
                                    backgroundColor: colors.blush,
                                    shadowColor: colors.blush,
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 6,
                                }}
                                onPress={() => {
                                    setImageUri(null);
                                    setNutritionData(null);
                                }}
                            >
                                <View className="flex-row items-center justify-center">
                                    <Ionicons name="restaurant" size={20} color="white" />
                                    <Text className="text-white font-bold text-base ml-2">
                                        Analyze Another Food
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            {/* Disclaimer */}
                            <View
                                className="rounded-2xl p-4 mb-6"
                                style={{
                                    backgroundColor: colors.lightPeach,
                                    borderWidth: 1,
                                    borderColor: colors.accent,
                                }}
                            >
                                <View className="flex-row items-start">
                                    <Ionicons name="information-circle" size={20} color={colors.primary} />
                                    <Text className="text-xs ml-2 flex-1" style={{ color: colors.darkBrown }}>
                                        Nutritional values are AI estimates. For precise information, consult nutrition labels or a registered dietitian.
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Empty State */}
                    {!loading && !imageUri && !nutritionData && (
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
                                <Ionicons name="restaurant-outline" size={48} color={colors.blush} />
                            </View>
                            <Text className="text-2xl font-bold mb-2 text-center" style={{ color: colors.darkBrown }}>
                                No Image Selected
                            </Text>
                            <Text className="text-base text-center px-6" style={{ color: colors.lightBrown }}>
                                Take a photo or choose from gallery to analyze nutrition
                            </Text>
                        </View>
                    )}
                </ScrollView>
            </View>
        </Modal>
    );
}
