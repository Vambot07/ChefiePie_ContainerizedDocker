// api/gemini/substitutionService.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SUBSTITUTION_PROMPT_TEMPLATE } from './prompts';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

if (!API_KEY) {
    throw new Error('Gemini API key is not configured in env. file');
}

const genAI = new GoogleGenerativeAI(API_KEY);

export interface SubstitutionResult {
    ingredient: string;
    isEssential: boolean;
    substitutions: string[];
    impact?: string; // Impact if no substitution
}

const MODELS_TO_TRY = [
    'gemini-2.5-flash',
    'gemini-2.0-flash-exp',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-flash-latest',
    'gemini-pro-latest',
];

/**
 * UC-19: Suggest Substitution
 * UC-20: Alert Essential Ingredient
 *
 * Analyzes missing ingredients and suggests substitutions or alerts if essential
 */
export const analyzeIngredientSubstitutions = async (
    recipeName: string,
    missingIngredients: string[]
): Promise<SubstitutionResult[]> => {
    try {
        console.log('🔍 Starting substitution analysis...');
        console.log('📝 Recipe:', recipeName);
        console.log('🥘 Missing ingredients:', missingIngredients);

        if (!missingIngredients || missingIngredients.length === 0) {
            console.log('✅ No missing ingredients');
            return [];
        }

        // Prepare prompt from template
        const prompt = SUBSTITUTION_PROMPT_TEMPLATE
            .replace('{recipeName}', recipeName)
            .replace('{missingIngredients}', missingIngredients.join(', '));

        let lastError: any = null;
        let attemptCount = 0;

        // Try different models as backup
        for (const modelName of MODELS_TO_TRY) {
            try {
                attemptCount++;
                console.log(`Attempt ${attemptCount}/${MODELS_TO_TRY.length}: Trying model: ${modelName}`);

                const model = genAI.getGenerativeModel({ model: modelName });

                console.log('Sending request to Gemini...');
                const result = await model.generateContent(prompt);
                const response = result.response.text();

                console.log(`SUCCESS! Model that worked: ${modelName}`);

                // Clean response - remove markdown code blocks if present
                let cleanedResponse = response
                    .replace(/```json\n?/g, '')
                    .replace(/```\n?/g, '')
                    .trim();

                console.log('🔄 Substitution Analysis Response:', cleanedResponse);

                // Parse JSON response
                const substitutions: SubstitutionResult[] = JSON.parse(cleanedResponse);

                // Validate the response
                if (!Array.isArray(substitutions)) {
                    throw new Error('Response is not an array');
                }

                console.log('✅ Substitution analysis complete');
                console.log(`🎯 Total attempts: ${attemptCount}, Working model: ${modelName}`);

                return substitutions;

            } catch (error: any) {
                console.log(`❌ Model ${modelName} failed:`, error.message);
                lastError = error;
                continue;
            }
        }

        // All models failed
        console.error('❌ All models failed. Last error:', lastError);
        console.error(`Tried ${MODELS_TO_TRY.length} different models`);
        throw new Error(`Failed to analyze substitutions: ${lastError?.message || 'Unknown error'}`);

    } catch (error: any) {
        console.error('❌ Substitution analysis error:', error);
        throw new Error('Failed to analyze ingredient substitutions. Please try again.');
    }
};