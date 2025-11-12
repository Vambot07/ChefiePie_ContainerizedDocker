import axios from 'axios';

const API_KEY = process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY;
const BASE_URL = process.env.EXPO_PUBLIC_SPOONACULAR_BASE_URL;

// Map category names to Spoonacular cuisine names
const categoryToCuisine: Record<string, string> = {
  All: 'All',
  Indian: 'indian',
  Italian: 'italian',
  Asian: 'asian',
  Chinese: 'chinese',
  Mexican: 'mexican',
};

// Fetch recipes (random or by cuisine)
export const fetchRecipes = async (cuisine: string = 'All', number: number = 10) => {
  try {
    let url = '';
    let params: any = { apiKey: API_KEY, number };

    const mappedCuisine = categoryToCuisine[cuisine] || cuisine;

    if (mappedCuisine === 'All') {
      // Random recipes directly
      url = `${BASE_URL}/recipes/random`;
      const response = await axios.get(url, { params });
      return response.data;
    } else {
      // Fetch filtered recipes first
      url = `${BASE_URL}/recipes/complexSearch`;
      params.cuisine = mappedCuisine;
      params.addRecipeInformation = true;
      params.number = 50; // Fetch more to shuffle from

      const response = await axios.get(url, { params });
      const allResults = response.data.results || [];

      const randomSubset = shuffleArray(allResults).slice(0, number);

      return { results: randomSubset };
    }
  } catch (error) {
    console.error('Error fetching recipes:', error);
    throw error;
  }
};

// Fisher-Yates Shuffle to get stronger randomness
export const shuffleArray = (array: any[]) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Fetch recipes by ingredients
export const fetchRecipesByIngredients = async (
  ingredients: string[] | string,
  number: number = 10
) => {
  try {
    const url = `${BASE_URL}/recipes/findByIngredients`;

    // Convert array to comma-separated string if it's an array
    const ingredientsString = Array.isArray(ingredients) ? ingredients.join(',') : ingredients;

    const params = {
      apiKey: API_KEY,
      ingredients: ingredientsString,
      number: number,
      ranking: 2, // 1 = maximize used ingredients, 2 = minimize missing ingredients
      ignorePantry: true, // Ignore typical pantry items
    };

    const response = await axios.get(url, { params });

    // Shuffle the results for randomness
    const shuffledResults = shuffleArray(response.data);

    return shuffledResults;
  } catch (error) {
    console.error('Error fetching recipes by ingredients:', error);
    throw error;
  }
};

// Fetch a single recipe by its Spoonacular API ID
export const fetchRecipeApiById = async (recipeId: string | number) => {
  try {
    const url = `${BASE_URL}/recipes/${recipeId}/information`;
    const params = {
      apiKey: API_KEY,
      includeNutrition: true, // Optional, include nutrition info if needed
    };

    const response = await axios.get(url, { params });

    // Return the recipe data
    return response.data;
  } catch (error) {
    console.error(`Error fetching recipe by ID (${recipeId}):`, error);
    throw error;
  }
};
