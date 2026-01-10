import { GoogleGenerativeAI } from "@google/generative-ai";
import { CONVERSATION_PROMPT_TEMPLATE } from './prompts';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

if (!API_KEY) {
    throw new Error('Gemini API key is not configured in env. file');
}

const genAI = new GoogleGenerativeAI(API_KEY);

const MODELS_TO_TRY = [
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
];

/**
 * Send a chat message to Gemini AI with conversation history
 */
export const sendChatMessage = async (
    userMessage: string,
    conversationHistory: string = ''
): Promise<{ success: boolean; message: string; error?: string }> => {
    let lastError: any = null;

    // Try each model in sequence
    for (const modelName of MODELS_TO_TRY) {
        try {
            console.log(`🤖 Trying Gemini model: ${modelName}`);

            const model = genAI.getGenerativeModel({ model: modelName });

            // Replace placeholders in the prompt template
            const prompt = CONVERSATION_PROMPT_TEMPLATE
                .replace('{conversationHistory}', conversationHistory || 'No previous conversation')
                .replace('{userMessage}', userMessage);

            console.log('📤 Sending message to Gemini...');

            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            console.log(`✅ Success with model: ${modelName}`);

            return {
                success: true,
                message: text,
            };
        } catch (error: any) {
            console.info(`❌ Error with model ${modelName}:`, error.message);
            lastError = error;
            // Continue to next model
            continue;
        }
    }

    // All models failed
    console.info('❌ All Gemini models failed:', lastError);
    return {
        success: false,
        message: 'Sorry, I encountered an error. Please try again later.',
        error: lastError?.message || 'Unknown error',
    };
};

/**
 * Quick chat - faster, shorter responses
 */
export const quickChat = async (
    userMessage: string
): Promise<{ success: boolean; message: string }> => {
    try {
        const model = genAI.getGenerativeModel({ model: MODELS_TO_TRY[0] });

        const prompt = `You are ChefiePie Assistant, a friendly cooking expert.
        
Answer this food/cooking question concisely (2-3 sentences max):

User: ${userMessage}

Your response:`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        return {
            success: true,
            message: text,
        };
    } catch (error) {
        console.info('Quick chat error:', error);
        return {
            success: false,
            message: 'Sorry, I encountered an error. Please try again.',
        };
    }
};

/**
 * Get recipe recommendations based on ingredients
 */
export const getRecipeRecommendations = async (
    ingredients: string[],
    preferences?: string
): Promise<{ success: boolean; recommendations?: any; error?: string }> => {
    try {
        const model = genAI.getGenerativeModel({ model: MODELS_TO_TRY[0] });

        const prompt = `You are a recipe recommendation expert.

User has these ingredients: ${ingredients.join(', ')}
${preferences ? `Preferences: ${preferences}` : ''}

Suggest 3-5 specific recipes they can make.

For EACH recipe, provide in this format:
Recipe Name
- Brief description (1 sentence)
- Additional ingredients needed (if any)
- Cooking time

Keep it concise and practical.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        return {
            success: true,
            recommendations: text,
        };
    } catch (error: any) {
        console.error('Recipe recommendations error:', error);
        return {
            success: false,
            error: error.message,
        };
    }
};