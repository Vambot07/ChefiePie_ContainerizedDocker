// components/RecipeComparisonModal.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Modal,
    Image,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '~/utils/color';
import SubstitutionModal from './SubstitutionModal';
import { analyzeIngredientSubstitutions, SubstitutionResult } from '~/api/gemini/substitutionService';

interface RecipeComparisonModalProps {
    visible: boolean;
    onClose: () => void;
    onProceed: () => void;
    onRecipeClick?: (recipe: any) => void; // Callback when recipe is clicked
    detectedIngredients: string[];
    createdRecipesCount: number;
    apiRecipesCount: number;
    missingIngredientsSummary: {
        recipeName: string;
        matched: string[];
        missing: string[];
        matchPercentage: number;
        image?: string;
        source?: 'created' | 'api';
        recipeData?: any; // Full recipe data for navigation
    }[];
}

export default function RecipeComparisonModal({
    visible,
    onClose,
    onProceed,
    onRecipeClick,
    detectedIngredients,
    createdRecipesCount,
    apiRecipesCount,
    missingIngredientsSummary
}: RecipeComparisonModalProps) {
    const totalRecipes = createdRecipesCount + apiRecipesCount;

    // State for substitution modal
    const [substitutionModalVisible, setSubstitutionModalVisible] = useState(false);
    const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
    const [substitutions, setSubstitutions] = useState<SubstitutionResult[]>([]);
    const [substitutionLoading, setSubstitutionLoading] = useState(false);
    const [substitutionError, setSubstitutionError] = useState<string>('');

    // State for showing all recipes
    const [showAllRecipes, setShowAllRecipes] = useState(false);

    // UC-19 & UC-20: Handle recipe click to analyze substitutions
    const handleRecipeClick = async (recipe: any) => {
        try {
            setSelectedRecipe(recipe);
            setSubstitutionModalVisible(true);
            setSubstitutionLoading(true);
            setSubstitutionError('');
            setSubstitutions([]);

            // Only analyze if there are missing ingredients
            if (recipe.missing && recipe.missing.length > 0) {
                const result = await analyzeIngredientSubstitutions(
                    recipe.recipeName,
                    recipe.missing
                );
                setSubstitutions(result);
            }
        } catch (error: any) {
            console.error('Error analyzing substitutions:', error);
            setSubstitutionError(error.message || 'Failed to analyze ingredients');
        } finally {
            setSubstitutionLoading(false);
        }
    };

    // Handle proceed from substitution modal
    const handleProceedFromSubstitution = () => {
        setSubstitutionModalVisible(false);
        if (onRecipeClick && selectedRecipe?.recipeData) {
            onRecipeClick(selectedRecipe.recipeData);
        }
    };

    // Reset showAllRecipes when modal closes
    const handleClose = () => {
        setShowAllRecipes(false);
        onClose();
    };

    // Helper function to format ingredients: 3 per line
    const formatIngredients = (ingredients: string[]) => {
        const chunked: string[] = [];
        for (let i = 0; i < ingredients.length; i += 3) {
            const chunk = ingredients.slice(i, i + 3);
            chunked.push(chunk.join(', '));
        }
        return chunked;
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-white rounded-t-3xl h-[85%] w-full">
                    {/* Header */}
                    <View className="flex-row justify-between items-center px-6 pt-6 pb-4 border-b border-gray-200">
                        <View className="flex-1">
                            <Text className="text-2xl font-bold text-gray-800">
                                Recipe Analysis
                            </Text>
                            <Text className="text-gray-500 text-sm mt-1">
                                Found {totalRecipes} matching recipes
                            </Text>
                        </View>
                        <TouchableOpacity onPress={handleClose} className="p-2 -mr-2">
                            <Ionicons name="close" size={28} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        className="flex-1"
                        contentContainerStyle={{ padding: 24 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Your Ingredients */}
                        <View className="mb-6">
                            <Text className="text-lg font-bold text-gray-800 mb-3">
                                ✅ Your Ingredients ({detectedIngredients.length})
                            </Text>
                            <View className="bg-green-50 border border-green-200 rounded-xl p-4">
                                <Text className="text-gray-700">
                                    {detectedIngredients.join(', ')}
                                </Text>
                            </View>
                        </View>

                        {/* Summary */}
                        <View className="mb-6">
                            <Text className="text-lg font-bold text-gray-800 mb-3">
                                📊 Summary
                            </Text>
                            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <Text className="text-gray-700 mb-2">
                                    • {createdRecipesCount} from your created recipes
                                </Text>
                                <Text className="text-gray-700">
                                    • {apiRecipesCount} from discover recipes
                                </Text>
                            </View>
                        </View>

                        {/* Recipe Breakdown */}
                        <View className="mb-6">
                            <Text className="text-lg font-bold text-gray-800 mb-3">
                                🔍 Recipe Breakdown
                            </Text>
                            <Text className="text-gray-600 text-sm mb-3">
                                Tap any recipe to see ingredient substitutions
                            </Text>

                            {(showAllRecipes ? missingIngredientsSummary : missingIngredientsSummary.slice(0, 5)).map((recipe, index) => (
                                <TouchableOpacity
                                    key={index}
                                    className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-3"
                                    onPress={() => handleRecipeClick(recipe)}
                                    activeOpacity={0.3}
                                >
                                    {/* ✅ FIXED: Recipe Image Container */}
                                    <View style={{ position: 'relative', width: '100%', height: 160 }}>
                                        <Image
                                            source={{ uri: recipe.image }}
                                            style={{
                                                width: '100%',
                                                height: 160,
                                                borderTopLeftRadius: 12,
                                                borderTopRightRadius: 12,
                                            }}
                                            resizeMode="cover"
                                        />

                                        {/* Match Percentage Badge */}
                                        <View
                                            style={{
                                                position: 'absolute',
                                                top: 8,
                                                right: 8,
                                                backgroundColor: '#22c55e',
                                                paddingHorizontal: 12,
                                                paddingVertical: 4,
                                                borderRadius: 9999,
                                            }}
                                        >
                                            <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                                                {Math.round(recipe.matchPercentage)}% Match
                                            </Text>
                                        </View>

                                        {/* Source Badge */}
                                        {recipe.source && (
                                            <View
                                                style={{
                                                    position: 'absolute',
                                                    top: 8,
                                                    left: 8,
                                                    backgroundColor: recipe.source === 'created' ? '#a855f7' : '#3b82f6',
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 4,
                                                    borderRadius: 9999,
                                                }}
                                            >
                                                <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                                                    {recipe.source === 'created' ? '👤 Yours' : '🌐 Discover'}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Recipe Details */}
                                    <View className="flex-row p-4">
                                        <View>
                                            {/* Recipe Name */}
                                            <Text className="text-base font-bold text-gray-800 mb-3" numberOfLines={2}>
                                                {recipe.recipeName}
                                            </Text>

                                            {/* Matched Ingredients */}
                                            {recipe.matched.length > 0 && (
                                                <View className="mb-2">
                                                    <Text className="text-sm font-semibold text-green-700 mb-1">
                                                        ✓ You have ({recipe.matched.length}):
                                                    </Text>
                                                    {formatIngredients(recipe.matched).map((line, idx) => (
                                                        <Text key={idx} className="text-sm text-gray-600">
                                                            {line}
                                                        </Text>
                                                    ))}
                                                </View>
                                            )}

                                            {/* Missing Ingredients */}
                                            {recipe.missing.length > 0 && (
                                                <View>
                                                    <Text className="text-sm font-semibold text-orange-700 mb-1">
                                                        ✗ You need ({recipe.missing.length}):
                                                    </Text>
                                                    {formatIngredients(recipe.missing).map((line, idx) => (
                                                        <Text key={idx} className="text-sm text-gray-600">
                                                            {line}
                                                        </Text>
                                                    ))}
                                                </View>
                                            )}
                                        </View>
                                        <View
                                            style={{
                                                position: 'absolute',
                                                bottom: 10,
                                                right: 5,
                                                paddingHorizontal: 12,
                                                paddingVertical: 4,
                                            }}>
                                            <Ionicons name="information-circle-sharp" size={18} color="#FF9966" />
                                        </View>

                                    </View>
                                </TouchableOpacity>
                            ))}

                            {missingIngredientsSummary.length > 5 && (
                                <TouchableOpacity
                                    onPress={() => setShowAllRecipes(!showAllRecipes)}
                                    className="py-3 px-4 bg-gray-100 rounded-lg mt-2"
                                    activeOpacity={0.7}
                                >
                                    <Text className="text-center font-semibold" style={{ color: colors.primary }}>
                                        {showAllRecipes
                                            ? '▲ Show Less'
                                            : `▼ Show ${missingIngredientsSummary.length - 5} More Recipes`
                                        }
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </ScrollView>

                    {/* Bottom Action Button */}
                    {/* <View className="p-6 border-t border-gray-200">
                        <TouchableOpacity
                            className="p-4 rounded-xl"
                            style={{ backgroundColor: colors.primary }}
                            onPress={onProceed}
                        >
                            <Text className="text-white font-semibold text-center text-base">
                                View All {missingIngredientsSummary.length} Recipes
                            </Text>
                        </TouchableOpacity>
                    </View> */}
                </View>
            </View >

            {/* Substitution Modal - UC-19 & UC-20 */}
            < SubstitutionModal
                visible={substitutionModalVisible}
                onClose={() => setSubstitutionModalVisible(false)
                }
                onProceed={handleProceedFromSubstitution}
                recipeName={selectedRecipe?.recipeName || ''}
                loading={substitutionLoading}
                substitutions={substitutions}
                error={substitutionError}
            />
        </Modal >
    );
}