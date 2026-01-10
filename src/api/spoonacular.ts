import axios from 'axios';

const API_KEY = process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY;
const BASE_URL = process.env.EXPO_PUBLIC_SPOONACULAR_BASE_URL;

// Haram ingredients to ALWAYS exclude from recipes (Islamic dietary laws)
export const HARAM_INGREDIENTS = [
  // Pork products
  'pork',
  'bacon',
  'ham',
  'prosciutto',
  'pancetta',
  'lard',
  'pork chops',
  'pork belly',
  'pork sausage',
  'chorizo',
  'pepperoni',
  'salami',
  'mortadella',
  'guanciale',

  // Alcohol
  'wine',
  'beer',
  'rum',
  'vodka',
  'whiskey',
  'brandy',
  'sake',
  'champagne',
  'sherry',
  'port wine',
  'liqueur',
  'tequila',
  'gin',
  'cognac',
  'bourbon',
  'alcohol',
  'liquor',
  'red wine',
  'white wine',
  'cooking wine',
  'marsala',
  'amaretto',
  'kahlua',
  'baileys',
];

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
export const fetchRecipesByCategory = async (cuisine: string = 'All', number: number = 10) => {
  try {
    let url = '';
    let params: any = {
      apiKey: API_KEY,
      number,
      excludeIngredients: HARAM_INGREDIENTS.join(','), // Always exclude haram ingredients
    };

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
    console.log('Error fetching recipes:', error);
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
      excludeIngredients: HARAM_INGREDIENTS.join(','), // Always exclude haram ingredients
    };

    const response = await axios.get(url, { params });

    // Shuffle the results for randomness
    const shuffledResults = shuffleArray(response.data);

    return shuffledResults;
  } catch (error) {
    console.log('Error fetching recipes by ingredients:', error);
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
    console.log(`Error fetching recipe by ID (${recipeId}):`, error);
    throw error;
  }
};

export const fetchRandomRecipes = async (
  number: number = 10,
  filters?: {
    diet?: string[];
    excludeIngredients?: string[];
  }
) => {
  try {
    const url = `${BASE_URL}/recipes/random`;
    const params: any = {
      apiKey: API_KEY,
      number,
    };

    // Add diet filter (Spoonacular supports: vegetarian, vegan, glutenFree, ketogenic, etc.)
    if (filters?.diet && filters.diet.length > 0) {
      // Map common dietary restrictions to Spoonacular format
      const dietMap: Record<string, string> = {
        'Vegetarian': 'vegetarian',
        'Vegan': 'vegan',
        'Gluten': 'gluten free',
        'Gluten-Free': 'gluten free',
        'Ketogenic': 'ketogenic',
        'Paleo': 'paleo',
        'Dairy-Free': 'dairy free',
      };

      const mappedDiets = filters.diet
        .map(d => dietMap[d] || d.toLowerCase())
        .join(',');

      if (mappedDiets) {
        params.tags = mappedDiets;
      }
    }

    // Always exclude haram ingredients + merge with user-provided exclusions
    const allExcludedIngredients = [
      ...HARAM_INGREDIENTS,
      ...(filters?.excludeIngredients || []),
    ];

    params.excludeIngredients = allExcludedIngredients.join(',');

    console.log('🔍 Fetching random recipes with filters:', params);

    const response = await axios.get(url, { params });

    console.log(response.data.recipes);

    return response.data.recipes || [];
  } catch (error) {
    console.log('Error fetching random recipes:', error);
    throw error;
  }
};

// Fetch a single recipe by ID from Spoonacular
export const fetchRecipeById = async (recipeId: string) => {
  try {
    const apiKey = process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY;
    const url = `https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    console.log('✅ Recipe fetched by ID:', data.title);
    return data;
  } catch (error) {
    console.log('❌ Error fetching recipe by ID:', error);
    return null;
  }
};
