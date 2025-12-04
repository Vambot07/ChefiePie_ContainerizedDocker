// components/Modal/SubstitutionModal.tsx
import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '~/utils/color';
import { SubstitutionResult } from '~/api/gemini/substitutionService';

interface SubstitutionModalProps {
    visible: boolean;
    onClose: () => void;
    onProceed: () => void;
    recipeName: string;
    loading: boolean;
    substitutions: SubstitutionResult[];
    error?: string;
}

export default function SubstitutionModal({
    visible,
    onClose,
    onProceed,
    recipeName,
    loading,
    substitutions,
    error,
}: SubstitutionModalProps) {
    // Check if there are any essential ingredients without substitutions
    const hasEssentialMissing = substitutions.some(
        (sub) => sub.isEssential && sub.substitutions.length === 0
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-white rounded-t-3xl h-[85%] w-full">
                    {/* Header */}
                    <View className="flex-row justify-between items-center px-6 pt-6 pb-4 border-b border-gray-200">
                        <View className="flex-1">
                            <Text className="text-2xl font-bold text-gray-800">
                                Ingredient Analysis
                            </Text>
                            <Text className="text-gray-500 text-sm mt-1" numberOfLines={1}>
                                {recipeName}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} className="p-2 -mr-2">
                            <Ionicons name="close" size={28} color="#666" />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView
                        className="flex-1"
                        contentContainerStyle={{ padding: 24 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {loading ? (
                            <View className="py-12 items-center">
                                <ActivityIndicator size="large" color={colors.primary} />
                                <Text className="text-gray-500 mt-4">
                                    Analyzing ingredients...
                                </Text>
                            </View>
                        ) : error ? (
                            <View className="bg-red-50 border border-red-200 rounded-xl p-4">
                                <View className="flex-row items-center mb-2">
                                    <Ionicons name="alert-circle" size={24} color="#ef4444" />
                                    <Text className="text-red-700 font-bold ml-2 text-lg">
                                        Error
                                    </Text>
                                </View>
                                <Text className="text-red-600">{error}</Text>
                            </View>
                        ) : substitutions.length === 0 ? (
                            <View className="bg-green-50 border border-green-200 rounded-xl p-6 items-center">
                                <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
                                <Text className="text-green-700 font-bold text-lg mt-3">
                                    You're All Set!
                                </Text>
                                <Text className="text-green-600 text-center mt-2">
                                    You have all the ingredients needed for this recipe.
                                </Text>
                            </View>
                        ) : (
                            <>
                                {/* UC-20: Alert if essential ingredients are missing */}
                                {hasEssentialMissing && (
                                    <View className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-4">
                                        <View className="flex-row items-center mb-2">
                                            <Ionicons name="warning" size={24} color="#ef4444" />
                                            <Text className="text-red-700 font-bold ml-2 text-lg">
                                                ⚠️ Critical Ingredient Alert
                                            </Text>
                                        </View>
                                        <Text className="text-red-600">
                                            This recipe requires essential ingredients that cannot be substituted.
                                            The dish cannot be completed without them.
                                        </Text>
                                    </View>
                                )}

                                {/* UC-19: Show substitutions for each missing ingredient */}
                                <Text className="text-lg font-bold text-gray-800 mb-3">
                                    Missing Ingredients ({substitutions.length})
                                </Text>

                                {substitutions.map((sub, index) => (
                                    <View
                                        key={index}
                                        className={`rounded-xl p-4 mb-3 ${
                                            sub.isEssential && sub.substitutions.length === 0
                                                ? 'bg-red-50 border-2 border-red-200'
                                                : sub.isEssential
                                                ? 'bg-orange-50 border border-orange-200'
                                                : 'bg-gray-50 border border-gray-200'
                                        }`}
                                    >
                                        {/* Ingredient Name */}
                                        <View className="flex-row items-center justify-between mb-2">
                                            <Text className="font-bold text-gray-800 text-base flex-1">
                                                {sub.ingredient}
                                            </Text>
                                            {sub.isEssential && (
                                                <View className="bg-orange-500 px-2 py-1 rounded-full">
                                                    <Text className="text-white text-xs font-bold">
                                                        Essential
                                                    </Text>
                                                </View>
                                            )}
                                        </View>

                                        {/* Substitutions Available */}
                                        {sub.substitutions && sub.substitutions.length > 0 ? (
                                            <View>
                                                <Text className="text-gray-600 text-sm font-semibold mb-2">
                                                    ✓ You can use instead:
                                                </Text>
                                                {sub.substitutions.map((substitute, subIndex) => (
                                                    <View
                                                        key={subIndex}
                                                        className="bg-white rounded-lg p-2 mb-1 flex-row items-center"
                                                    >
                                                        <Ionicons
                                                            name="swap-horizontal"
                                                            size={16}
                                                            color={colors.primary}
                                                        />
                                                        <Text className="text-gray-700 ml-2 flex-1">
                                                            {substitute}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        ) : (
                                            // UC-20: No substitutions available
                                            <View>
                                                <Text className="text-gray-600 text-sm font-semibold mb-2">
                                                    ✗ No substitutions available
                                                </Text>
                                                {sub.impact && (
                                                    <View className="bg-white rounded-lg p-3">
                                                        <Text className="text-red-600 font-semibold mb-1">
                                                            Impact on Recipe:
                                                        </Text>
                                                        <Text className="text-gray-700">
                                                            {sub.impact}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                ))}
                            </>
                        )}
                    </ScrollView>

                    {/* Bottom Action Buttons */}
                    {!loading && !error && substitutions.length > 0 && (
                        <View className="p-6 border-t border-gray-200">
                            {hasEssentialMissing ? (
                                <>
                                    <TouchableOpacity
                                        className="p-4 rounded-xl mb-3"
                                        style={{ backgroundColor: colors.primary }}
                                        onPress={onClose}
                                    >
                                        <Text className="text-white font-semibold text-center text-base">
                                            Choose Another Recipe
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        className="p-4 rounded-xl border-2"
                                        style={{ borderColor: colors.primary }}
                                        onPress={onProceed}
                                    >
                                        <Text
                                            className="font-semibold text-center text-base"
                                            style={{ color: colors.primary }}
                                        >
                                            Proceed Anyway (Modified Recipe)
                                        </Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <TouchableOpacity
                                    className="p-4 rounded-xl"
                                    style={{ backgroundColor: colors.primary }}
                                    onPress={onProceed}
                                >
                                    <Text className="text-white font-semibold text-center text-base">
                                        View Recipe
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}
