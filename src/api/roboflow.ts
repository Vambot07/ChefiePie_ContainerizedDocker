// src/api/roboflow.ts
import axios from 'axios';
import * as FileSystem from 'expo-file-system';

interface DetectedIngredient {
  class: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RoboflowResponse {
  predictions: DetectedIngredient[];
  image: {
    width: number;
    height: number;
  };
  time?: number;
}

/**
 * Detect ingredients from an image using Roboflow API
 * @param imageUri - Local URI of the image to analyze
 * @returns Array of detected ingredient names
 */
export const detectIngredientsFromImage = async (imageUri: string): Promise<string[]> => {
  try {
    console.log('🔍 Starting ingredient detection...');
    console.log('📸 Image URI:', imageUri);

    // Convert image to base64
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log('✅ Image converted to base64');

    // Get credentials from environment
    const ROBOFLOW_API_KEY = process.env.EXPO_PUBLIC_ROBOFLOW_API_KEY;
    const MODEL_ID = process.env.EXPO_PUBLIC_ROBOFLOW_MODEL_ID;
    const MODEL_VERSION = process.env.EXPO_PUBLIC_ROBOFLOW_MODEL_VERSION || '1';

    // Validate environment variables
    if (!ROBOFLOW_API_KEY) {
      throw new Error('❌ Roboflow API key not found. Please check your .env file');
    }

    if (!MODEL_ID) {
      throw new Error('❌ Roboflow Model ID not found. Please check your .env file');
    }

    const url = `https://detect.roboflow.com/${MODEL_ID}/${MODEL_VERSION}`;
    console.log('🌐 Calling Roboflow API:', url);

    // Call Roboflow API
    const response = await axios({
      method: 'POST',
      url: url,
      params: {
        api_key: ROBOFLOW_API_KEY,
        confidence: 40, // 40% minimum confidence threshold
        overlap: 30, // Overlap threshold for non-max suppression
      },
      data: base64Image,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 30000, // 30 second timeout
    });

    const data: RoboflowResponse = response.data;
    console.log('✅ Roboflow response received');
    console.log(`📊 Detection time: ${data.time || 'N/A'}ms`);
    console.log(`🔢 Predictions count: ${data.predictions?.length || 0}`);

    // Check if any predictions were made
    if (!data.predictions || data.predictions.length === 0) {
      console.log('⚠️ No ingredients detected in image');
      return [];
    }

    // Extract and clean ingredient names
    const ingredients: string[] = data.predictions
      .filter((pred) => pred.confidence > 0.4) // Filter by confidence threshold
      .map((pred) => {
        // Clean up class names
        let cleanName = pred.class
          .toLowerCase()
          .replace(/_/g, ' ') // Replace underscores with spaces
          .replace(/-/g, ' ') // Replace hyphens with spaces
          .replace(/\d+/g, '') // Remove numbers
          .trim();

        console.log(`  ✓ ${cleanName} (${(pred.confidence * 100).toFixed(1)}% confidence)`);
        return cleanName;
      })
      .filter((value, index, self) => self.indexOf(value) === index) // Remove duplicates
      .filter((name) => name.length > 0); // Remove empty strings

    console.log('🎉 Final ingredients detected:', ingredients);

    return ingredients;
  } catch (error) {
    console.error('❌ Ingredient detection error:', error);

    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));

        // Get credentials for error messages
        const MODEL_ID = process.env.EXPO_PUBLIC_ROBOFLOW_MODEL_ID || 'unknown';
        const MODEL_VERSION = process.env.EXPO_PUBLIC_ROBOFLOW_MODEL_VERSION || '1';

        // Handle specific error codes
        if (error.response.status === 403) {
          throw new Error(
            'Invalid API key. Please check EXPO_PUBLIC_ROBOFLOW_API_KEY in .env file'
          );
        } else if (error.response.status === 404) {
          throw new Error(
            `Model not found: ${MODEL_ID}/${MODEL_VERSION}. Please check your model ID and version`
          );
        } else if (error.response.status === 400) {
          throw new Error('Invalid image format. Please try again with a different photo');
        } else if (error.response.status === 429) {
          throw new Error('API rate limit exceeded. Please wait a moment and try again');
        }
      } else if (error.request) {
        console.error('No response received:', error.message);
        throw new Error('Network error. Please check your internet connection');
      }
    }

    throw new Error('Failed to detect ingredients. Please try again');
  }
};

/**
 * Format ingredients array for Spoonacular API search
 * @param ingredients - Array of ingredient names
 * @returns Comma-separated string of ingredients
 */
export const formatIngredientsForSearch = (ingredients: string[]): string => {
  return ingredients.join(',');
};
