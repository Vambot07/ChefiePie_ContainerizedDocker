// services/geminiService.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import { VOICE_CONVERSATION_PROMPT_TEMPLATE, RECIPE_CONTEXT_PROMPT_TEMPLATE } from './prompts';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * Get voice response from Gemini AI
 * @param userQuestion - User's spoken question
 * @param recipeContext - Current recipe context
 * @returns AI response optimized for speech
 */
export const getVoiceResponse = async (
    userQuestion: string,
    recipeContext: {
        recipeName: string;
        currentStepNumber: number;
        totalSteps: number;
        currentStepDetails: string;
        ingredients?: string[];
        difficulty?: string;
    }
): Promise<string> => {
    try {
        console.log('🤖 Asking Gemini:', userQuestion);

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        // Build prompt with recipe context
        const prompt = RECIPE_CONTEXT_PROMPT_TEMPLATE
            .replace('{recipeName}', recipeContext.recipeName)
            .replace('{ingredients}', recipeContext.ingredients?.join(', ') || 'N/A')
            .replace('{currentStepNumber}', recipeContext.currentStepNumber.toString())
            .replace('{totalSteps}', recipeContext.totalSteps.toString())
            .replace('{currentStepDetails}', recipeContext.currentStepDetails)
            .replace('{difficulty}', recipeContext.difficulty || 'N/A')
            .replace('{userQuestion}', userQuestion);

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        console.log('✅ Gemini response:', response.substring(0, 100) + '...');

        return response;
    } catch (error) {
        console.error('❌ Gemini API error:', error);
        throw new Error('Could not get response from AI assistant');
    }
};

/**
 * Simple voice response without recipe context
 * For general cooking questions
 */
export const getSimpleVoiceResponse = async (userQuestion: string): Promise<string> => {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const prompt = `You are a helpful cooking assistant. Answer this question briefly in 2-3 sentences:

Question: ${userQuestion}

Keep it conversational and practical.`;

        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error('❌ Gemini error:', error);
        throw new Error('Could not get AI response');
    }
};