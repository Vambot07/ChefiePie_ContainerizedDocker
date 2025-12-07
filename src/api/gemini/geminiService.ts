import { GoogleGenerativeAI } from "@google/generative-ai";
import { DETECTION_PROMPT_TEMPLATE } from './prompts';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

if (!API_KEY) {
    throw new Error('Gemini API key is not configured in env. file');
}

const genAI = new GoogleGenerativeAI(API_KEY);

export interface DetectedIngredient {
    name: string;
    confidence?: string;
}

const MODELS_TO_TRY = [

    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash',

    'gemini-flash-latest',
    'gemini-pro-latest',

];

export const detectIngredientsFromImage = async (
    imageUri: string
): Promise<DetectedIngredient[]> => {
    try {
        console.log('🔍 Starting Gemini ingredient detection...');
        console.log('📷 Image URI:', imageUri);

        // 1 Convert image kepada base64
        console.log('Converting image to base64...');
        const response = await fetch(imageUri);
        const blob = await response.blob();

        const base64Image = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result as string;
                const base64 = base64data.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        console.log('✅ Image converted to base64');

        // 2 Prepare the prompt
        const prompt = DETECTION_PROMPT_TEMPLATE;

        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: 'image/jpeg',
            },
        };

        // 3 Try different model as backup
        let lastError: any = null;
        let attemptCount = 0;

        for (const modelName of MODELS_TO_TRY) {
            try {
                attemptCount++;
                console.log(`Attempt ${attemptCount}/${MODELS_TO_TRY.length}: Trying model: ${modelName}`);

                const model = genAI.getGenerativeModel({ model: modelName });

                console.log(`Sending request to Gemini...`);
                const result = await model.generateContent([prompt, imagePart]);

                const responseData = await result.response;
                const text = responseData.text();

                console.log(`SUCCESS! Model that worked:`, modelName);
                console.log(`Response:`, text);

                const ingredients = text
                    .split('\n')
                    .map((line) => line.trim())
                    .filter((line) => line.length > 0)
                    .filter((line) => !line.toLowerCase().includes('here are'))
                    .filter((line) => !line.toLowerCase().includes('ingredients:'))
                    .filter((line) => !line.toLowerCase().includes('visible in'))
                    .map((name) => {
                        const cleanName = name
                            .replace(/^[-*•]\s*/, '')
                            .replace(/^\d+\.\s*/, '')
                            .replace(/^\d+\)\s*/, '')
                            .trim();

                        return {
                            name: cleanName,
                            confidence: 'high',
                        };
                    })
                    .filter((ingredient) => ingredient.name.length > 2);

                console.log('✅ Detected ingredients:', ingredients);
                console.log(`🎯 Total attempts: ${attemptCount}, Working model: ${modelName}`);

                return ingredients;

            } catch (error: any) {
                console.log(`❌ Model ${modelName} failed:`, error.message);
                lastError = error;
                // Continue to next model
                continue;
            }
        }

        // ADDED: If all models failed
        console.error('❌ All models failed. Last error:', lastError);
        console.error(`Tried ${MODELS_TO_TRY.length} different models`);
        throw new Error(`All Gemini models failed. Last error: ${lastError?.message || 'Unknown error'}`);

    } catch (error) {  // ✅ ADDED: Main catch block
        console.error('❌ Error in detectedIngredientFromImage:', error);
        throw error;
    }
};

export const listAvailableModels = async () => {
    try {
        console.log('📋 Checking all available models...');
        console.log(`Total models to check: ${MODELS_TO_TRY.length}`);

        const workingModels: string[] = [];
        const failedModels: string[] = [];

        for (const modelName of MODELS_TO_TRY) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                console.log(`✅ ${modelName} - Available`);
                workingModels.push(modelName);
            } catch (error: any) {
                console.log(`❌ ${modelName} - Not available: ${error.message}`);
                failedModels.push(modelName);
            }
        }

        console.log('\n=== SUMMARY ===');
        console.log(`✅ Working models: ${workingModels.length}`);
        console.log(`❌ Failed models: ${failedModels.length}`);
        console.log('\nWorking models:', workingModels);

    } catch (error) {
        console.error('Error listing models:', error);
    }
};

// Get the best working model for your API key
export const findBestModel = async (): Promise<string | null> => {
    console.log('🔍 Finding best working model...');

    for (const modelName of MODELS_TO_TRY) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            // Try a simple text generation to verify it works
            const result = await model.generateContent('Hello');
            await result.response;

            console.log(`✅ Best model found: ${modelName}`);
            return modelName;
        } catch (error) {
            continue;
        }
    }

    console.log('❌ No working model found');
    return null;
};