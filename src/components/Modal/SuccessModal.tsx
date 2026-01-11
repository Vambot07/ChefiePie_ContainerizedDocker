import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

interface SuccessModalProps {
    visible: boolean;
    title?: string;
    message: React.ReactNode;
    buttonText?: string;
    onClose: () => void;
    icon?: keyof typeof Ionicons.glyphMap | keyof typeof MaterialIcons.glyphMap;
    iconType?: 'ionicons' | 'material';
    iconColor?: string;
    iconBgColor?: string;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
    visible,
    title = 'Success',
    message,
    buttonText = 'OK',
    onClose,
    icon = 'checkmark-circle',
    iconType = 'ionicons',
    iconColor = '#22C55E',
    iconBgColor = '#DCFCE7',
}) => {
    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            onRequestClose={onClose}
        >
            {/* Overlay */}
            <View
                className="flex-1 justify-center items-center px-6"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            >
                {/* Modal Card */}
                <View
                    className="bg-white rounded-3xl p-6 w-full max-w-sm items-center"
                    style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.3,
                        shadowRadius: 20,
                        elevation: 10,
                    }}
                >
                    {/* Icon */}
                    <View
                        className="w-16 h-16 rounded-full items-center justify-center mb-4"
                        style={{ backgroundColor: iconBgColor }}
                    >
                        {iconType === 'material' ? (
                            <MaterialIcons
                                name={icon as keyof typeof MaterialIcons.glyphMap}
                                size={42}
                                color={iconColor}
                            />
                        ) : (
                            <Ionicons
                                name={icon as keyof typeof Ionicons.glyphMap}
                                size={42}
                                color={iconColor}
                            />
                        )}
                    </View>

                    {/* Title */}
                    <Text className="text-2xl font-bold text-gray-800 mb-2">
                        {title}
                    </Text>

                    {/* Message */}
                    <Text className="text-gray-500 text-center mb-6">
                        {message}
                    </Text>

                    {/* Button */}
                    <TouchableOpacity
                        onPress={onClose}
                        activeOpacity={0.85}
                        className="bg-orange-500 px-8 py-3 rounded-full w-full"
                    >
                        <Text className="text-white font-bold text-center">
                            {buttonText}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

export default SuccessModal;
