import axios from "axios";

const API_KEY = process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY 
const BASE_URL = process.env.EXPO_PUBLIC_SPOONACULAR_BASE_URL;

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
export const fetchRecipes = async (cuisine = "All", number = 10) => {
    try {
        let url = "";
        let params = { apiKey: API_KEY, number };

        const mappedCuisine = categoryToCuisine[cuisine] || cuisine;

        if (mappedCuisine === "All") {
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

            // 🔀 Shuffle and limit results
            const randomSubset = shuffleArray(allResults).slice(0, number);

            return { results: randomSubset };
        }
    } catch (error) {
        console.error("Error fetching recipes:", error);
        throw error;
    }
};

//IM USING FISHER-YATES Shuffle to get stronger randomness
export const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}


//BELOW IS SIMPLAE SORT USING sort()
// export const shuffleArray = (array) => {
//     if (!Array.isArray(array)) return [];

//     const newArray = [...array];
//     return newArray.sort(() => Math.random() - 0.5);
// }

export const fetchRecipesByIngredients = async ([ingredients], number) => {
    try {
        let url = "";
        let params = { apiKey: API_KEY, number }

    }
    catch (error) {
        console.error("Error fetching Ingredients", error);
        throw error;
    }
}