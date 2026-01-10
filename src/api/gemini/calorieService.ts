import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

if (!API_KEY) {
    throw new Error('Gemini API key is not configured in env. file');
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(API_KEY);

// Models to try in order (fallback strategy)
const MODELS_TO_TRY = [
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
];

export interface NutritionFacts {
    foodName: string;
    servingSize: string;
    calories: string;
    protein: string;
    carbohydrates: string;
    fat: string;
    fiber: string;
    sugar: string;
    sodium: string;
    cholesterol?: string;
    saturatedFat?: string;
    transFat?: string;
    confidence: 'high' | 'medium' | 'low';
}

/**
 * Detects nutritional information from an image using Gemini AI
 */
export const detectNutritionFromImage = async (imageUri: string): Promise<NutritionFacts> => {
    console.log('🍎 Starting nutrition detection for:', imageUri);

    // Convert image to base64 first (only once)
    let base64Image: string;
    try {
        console.log('Step 1: Fetching image...');
        const response = await fetch(imageUri);
        const blob = await response.blob();
        console.log('Step 2: Converting to base64...');

        base64Image = await new Promise<string>((resolve, reject) => {
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
    } catch (error: any) {
        console.error('❌ Error converting image:', error);
        throw new Error('Failed to process image. Please try again.');
    }

    let lastError: any = null;

    // Try each model in sequence
    for (const modelName of MODELS_TO_TRY) {
        try {
            console.log(`🤖 Trying Gemini model: ${modelName}`);

            const model = genAI.getGenerativeModel({ model: modelName });

            const prompt = `Analyze this food image and provide detailed nutritional information.

IMPORTANT: You must respond ONLY with valid JSON in this exact format (no markdown, no code blocks, just pure JSON):

{
  "foodName": "Name of the food/dish",
  "servingSize": "Estimated serving size (e.g., '1 plate', '200g', '1 bowl')",
  "calories": "Total calories (e.g., '450 kcal')",
  "protein": "Protein content (e.g., '25g')",
  "carbohydrates": "Carbohydrate content (e.g., '45g')",
  "fat": "Total fat content (e.g., '15g')",
  "fiber": "Fiber content (e.g., '5g')",
  "sugar": "Sugar content (e.g., '8g')",
  "sodium": "Sodium content (e.g., '600mg')",
  "cholesterol": "Cholesterol content (e.g., '50mg') - optional",
  "saturatedFat": "Saturated fat content (e.g., '5g') - optional",
  "transFat": "Trans fat content (e.g., '0g') - optional",
  "confidence": "high or medium or low - based on how clear the food is visible"
}

Guidelines:
- If you can clearly identify the food, use "high" confidence
- If the food is partially visible or mixed, use "medium" confidence
- If the food is unclear or hard to identify, use "low" confidence
- Provide realistic estimates based on typical serving sizes
- Include units with all values (g, mg, kcal, etc.)
- If you cannot determine a value, use "Unknown"
- Do NOT include any explanation, just return the JSON object`;

            console.log('📤 Sending request to Gemini...');

            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: base64Image,
                        mimeType: 'image/jpeg',
                    },
                },
            ]);

            const responseText = result.response.text();
            console.log('📥 Received response from Gemini');
            console.log('Response:', responseText);

            // Clean the response to extract JSON
            let jsonText = responseText.trim();

            // Remove markdown code blocks if present
            jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');

            // Try to extract JSON object if there's extra text
            const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonText = jsonMatch[0];
            }

            console.log('Cleaned JSON:', jsonText);

            const nutritionData: NutritionFacts = JSON.parse(jsonText);

            console.log(`✅ Success with model: ${modelName}`);
            console.log('Nutrition data:', nutritionData);

            return nutritionData;
        } catch (error: any) {
            console.info(`❌ Error with model ${modelName}:`, error.message);
            lastError = error;
            // Continue to next model
            continue;
        }
    }

    // All models failed
    console.error('❌ All Gemini models failed:', lastError);
    throw new Error(
        lastError?.message || 'Failed to detect nutritional information. Please try again with a clearer image.'
    );
};
