import axios from "axios";

const API_KEY = "720a8118c88844529d83117f6612d670"; // Replace with your Spoonacular key
const BASE_URL = "https://api.spoonacular.com";

// Map category names to Spoonacular cuisine names
const categoryToCuisine = {
    'All': 'All',
    'Indian': 'indian',
    'Italian': 'italian',
    'Asian': 'asian',
    'Chinese': 'chinese',
    'Mexican': 'mexican'
};

// Fetch recipes (random or by cuisine)
export const fetchRecipes = async (cuisine = "All", number = 30) => {
    try {
        let url = "";
        let params = { apiKey: API_KEY, number };

        // Map category to Spoonacular cuisine name
        const mappedCuisine = categoryToCuisine[cuisine] || cuisine;

        if (mappedCuisine === "All") {
            // Random recipes
            url = `${BASE_URL}/recipes/random`;
        } else {
            // Filtered by cuisine
            url = `${BASE_URL}/recipes/complexSearch`;
            params.cuisine = mappedCuisine;
            params.addRecipeInformation = true; // Include more recipe details
        }

        const response = await axios.get(url, { params });
        return response.data;
    } catch (error) {
        console.error("Error fetching recipes:", error);
        throw error;
    }
};
