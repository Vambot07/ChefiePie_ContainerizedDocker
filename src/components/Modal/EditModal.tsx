import React from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import colors from '~/utils/color';

type EditModalProps = {
    visible: boolean;
    onClose: () => void;
    title: string;
    onSave: () => void;
    loading?: boolean;
    children: React.ReactNode;
};

const EditModal: React.FC<EditModalProps> = ({
    visible,
    onClose,
    title,
    onSave,
    loading,
    children,
}) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
        >
            <View className="flex-1 justify-center items-center bg-black/50">
                <View className="bg-white rounded-2xl w-11/12 p-5">
                    <Text className="text-lg font-bold mb-4" style={{ color: colors.darkBrown }}>
                        {title}
                    </Text>

                    {/* Content yang dimasukkan dari parent */}
                    {children}

                    <View className="flex-row justify-end mt-6 space-x-3">
                        <TouchableOpacity
                            onPress={onClose}
                            className="px-4 py-2 rounded-xl bg-gray-200"
                        >
                            <Text style={{ color: colors.darkBrown }}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={onSave}
                            className="px-4 py-2 rounded-xl"
                            style={{ backgroundColor: colors.primary }}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text className="text-white font-semibold">Save</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default EditModal;
