import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    Pressable,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '~/utils/color';

interface ImagePickerModalProps {
    visible: boolean;
    onClose: () => void;
    onCamera: () => void;
    onGallery: () => void;
    title?: string;
    subtitle?: string;
}

export default function ImagePickerModal({
    visible,
    onClose,
    onCamera,
    onGallery,
    title = 'Choose Photo',
    subtitle = 'Select where to get your photo from',
}: ImagePickerModalProps) {
    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <StatusBar barStyle="light-content" />
            <Pressable
                className="flex-1 bg-black/50 justify-end"
                onPress={onClose}
            >
                <Pressable
                    className="bg-white rounded-t-3xl"
                    onPress={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <View className="pt-6 pb-4 px-6 border-b border-gray-100">
                        <View className="flex-row justify-between items-center mb-2">
                            <Text
                                className="text-2xl font-bold"
                                style={{ color: colors.darkBrown }}
                            >
                                {title}
                            </Text>
                            <TouchableOpacity
                                onPress={onClose}
                                className="w-8 h-8 rounded-full items-center justify-center"
                                style={{ backgroundColor: colors.secondary }}
                            >
                                <Ionicons name="close" size={20} color={colors.lightBrown} />
                            </TouchableOpacity>
                        </View>
                        <Text className="text-sm" style={{ color: colors.lightBrown }}>
                            {subtitle}
                        </Text>
                    </View>

                    {/* Options */}
                    <View className="p-4">
                        {/* Camera Option */}
                        <TouchableOpacity
                            onPress={() => {
                                onClose();
                                onCamera();
                            }}
                            className="flex-row items-center p-4 rounded-2xl mb-3"
                            style={{
                                backgroundColor: colors.primary,
                                shadowColor: colors.primary,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                                elevation: 6,
                            }}
                        >
                            <View
                                className="w-14 h-14 rounded-full items-center justify-center mr-4"
                                style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
                            >
                                <Ionicons name="camera" size={28} color="white" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-white text-lg font-bold mb-1">
                                    Take Photo
                                </Text>
                                <Text className="text-white/80 text-sm">
                                    Use your camera to capture a photo
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color="white" />
                        </TouchableOpacity>

                        {/* Gallery Option */}
                        <TouchableOpacity
                            onPress={() => {
                                onClose();
                                onGallery();
                            }}
                            className="flex-row items-center p-4 rounded-2xl mb-3"
                            style={{
                                backgroundColor: colors.accent,
                                shadowColor: colors.accent,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                                elevation: 6,
                            }}
                        >
                            <View
                                className="w-14 h-14 rounded-full items-center justify-center mr-4"
                                style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
                            >
                                <Ionicons name="images" size={28} color="white" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-white text-lg font-bold mb-1">
                                    Choose from Gallery
                                </Text>
                                <Text className="text-white/80 text-sm">
                                    Select from your photo library
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color="white" />
                        </TouchableOpacity>

                        {/* Cancel Button */}
                        <TouchableOpacity
                            onPress={onClose}
                            className="p-4 rounded-2xl items-center"
                            style={{
                                backgroundColor: colors.secondary,
                                borderWidth: 1,
                                borderColor: colors.lightBrown + '30',
                            }}
                        >
                            <Text
                                className="text-base font-semibold"
                                style={{ color: colors.lightBrown }}
                            >
                                Cancel
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Bottom Safe Area */}
                    <View className="h-6" />
                </Pressable>
            </Pressable>
        </Modal>
    );
}
