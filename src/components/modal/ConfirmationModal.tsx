import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '~/utils/color';

interface ConfirmationModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
    confirmColor?: string;
    isDestructive?: boolean;
}

export default function ConfirmationModal({
    visible,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    icon = 'alert-circle',
    iconColor,
    confirmColor,
    isDestructive = false,
}: ConfirmationModalProps) {
    const defaultIconColor = isDestructive ? '#EF4444' : colors.primary;
    const defaultConfirmColor = isDestructive ? '#EF4444' : colors.primary;

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <Pressable
                className="flex-1 bg-black/50 justify-center items-center px-6"
                onPress={onClose}
            >
                <Pressable
                    className="bg-white rounded-3xl p-6 w-full max-w-sm"
                    style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.3,
                        shadowRadius: 20,
                        elevation: 10,
                    }}
                    onPress={(e) => e.stopPropagation()}
                >
                    {/* Icon */}
                    <View className="items-center mb-4">
                        <View
                            className="w-20 h-20 rounded-full items-center justify-center"
                            style={{
                                backgroundColor: (iconColor || defaultIconColor) + '20',
                            }}
                        >
                            <Ionicons
                                name={icon}
                                size={40}
                                color={iconColor || defaultIconColor}
                            />
                        </View>
                    </View>

                    {/* Title */}
                    <Text
                        className="text-2xl font-bold text-center mb-3"
                        style={{ color: colors.darkBrown }}
                    >
                        {title}
                    </Text>

                    {/* Message */}
                    <Text
                        className="text-base text-center mb-6"
                        style={{ color: colors.lightBrown }}
                    >
                        {message}
                    </Text>

                    {/* Buttons */}
                    <View className="flex-row gap-3">
                        {/* Cancel Button */}
                        <TouchableOpacity
                            onPress={onClose}
                            className="flex-1 py-4 rounded-2xl"
                            style={{
                                backgroundColor: colors.secondary,
                                borderWidth: 1,
                                borderColor: colors.lightBrown + '30',
                            }}
                        >
                            <Text
                                className="text-center font-bold text-base"
                                style={{ color: colors.lightBrown }}
                            >
                                {cancelText}
                            </Text>
                        </TouchableOpacity>

                        {/* Confirm Button */}
                        <TouchableOpacity
                            onPress={() => {
                                onConfirm();
                                onClose();
                            }}
                            className="flex-1 py-4 rounded-2xl"
                            style={{
                                backgroundColor: confirmColor || defaultConfirmColor,
                                shadowColor: confirmColor || defaultConfirmColor,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                                elevation: 6,
                            }}
                        >
                            <Text className="text-white text-center font-bold text-base">
                                {confirmText}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
