import { db, auth } from '../../firebaseConfig';
import { collection, addDoc, serverTimestamp, getDocs, doc, deleteDoc, query, where, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';

const currentUserId = auth.currentUser?.uid;

export const addRecipe = async (recipeData) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');

        // Fetch the user's profile to get the username
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const username = userDoc.exists() ? userDoc.data().username : 'Unknown';

        const recipesRef = collection(db, 'recipes');
        await addDoc(recipesRef, {
            userId: user.uid,
            username, // <-- Add username here
            image: recipeData.image,
            title: recipeData.title,
            intro: recipeData.intro,
            prepTime: recipeData.prepTime,
            cookTime: recipeData.cookTime,
            totalTime: recipeData.totalTime,
            difficulty: recipeData.difficulty,
            ingredients: recipeData.ingredients,
            steps: recipeData.steps,
            tips: recipeData.tips,
            serving: recipeData.serving,
            nutrition: recipeData.nutrition,
            youtube: recipeData.youtube,
            createdAt: serverTimestamp(),
            savedBy: [], // NEW: list of users who saved it
        });

        console.log('Recipe added successfully!');
        return 'Recipe added successfully!';
    } catch (error) {
        console.error('Error adding recipe:', error);
        throw new Error('Error adding recipe. Please try again.');
    }
};

// Search recipes by title (case-insensitive, client-side filter)
export const searchRecipes = async (searchQuery) => {
    try {
        const recipesRef = collection(db, 'recipes');
        const snapshot = await getDocs(recipesRef);
        const allRecipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const filtered = allRecipes.filter(recipe =>
            recipe.title && recipe.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return filtered;
    } catch (error) {
        console.error('Error searching recipes:', error);
        throw error;
    }
};

// Delete recipe by ID
export const deleteRecipe = async (recipeId) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');

        const recipeRef = doc(db, 'recipes', recipeId);
        const docSnap = await getDoc(recipeRef);

        if (!docSnap.exists()) throw new Error('Recipe not found');
        const recipeData = docSnap.data();

        if (recipeData.userId !== user.uid) {
            throw new Error('You are not authorized to delete this recipe.');
        }

        await deleteDoc(recipeRef);
        return 'Recipe deleted successfully!';
    } catch (error) {
        console.error('Error deleting recipe:', error);
        throw new Error('Error deleting recipe. Please try again.');
    }
};

// NEW SAVE LOGIC
export const saveRecipe = async (recipeId) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');

        const recipeRef = doc(db, 'recipes', recipeId);

        // First, get the current document to check if savedBy field exists
        const docSnap = await getDoc(recipeRef);
        if (!docSnap.exists()) {
            throw new Error('Recipe not found');
        }

        const recipeData = docSnap.data();

        // If savedBy doesn't exist or is not an array, initialize it
        if (!recipeData.savedBy || !Array.isArray(recipeData.savedBy)) {
            await updateDoc(recipeRef, {
                savedBy: [user.uid]
            });
        } else {
            // If it exists and is an array, use arrayUnion
            await updateDoc(recipeRef, {
                savedBy: arrayUnion(user.uid)
            });
        }

        console.log('Recipe saved successfully!');
        return 'Recipe saved successfully!';
    } catch (error) {
        console.error('Error saving recipe:', error);
        throw new Error('Error saving recipe. Please try again.');
    }
};

// NEW UNSAVE LOGIC
export const unsaveRecipe = async (recipeId) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');

        const recipeRef = doc(db, 'recipes', recipeId);

        // First, get the current document to check if savedBy field exists
        const docSnap = await getDoc(recipeRef);
        if (!docSnap.exists()) {
            throw new Error('Recipe not found');
        }

        const recipeData = docSnap.data();

        // If savedBy doesn't exist or is not an array, nothing to unsave
        if (!recipeData.savedBy || !Array.isArray(recipeData.savedBy)) {
            console.log('Recipe has no savedBy field, nothing to unsave');
            return 'Recipe unsaved successfully!';
        } else {
            // If it exists and is an array, use arrayRemove
            await updateDoc(recipeRef, {
                savedBy: arrayRemove(user.uid)
            });
        }

        console.log('Recipe unsaved successfully!');
        return 'Recipe unsaved successfully!';
    } catch (error) {
        console.error('Error unsaving recipe:', error);
        throw new Error('Error unsaving recipe. Please try again.');
    }
};

// NEW CHECK LOGIC
export const isRecipeSaved = async (recipeId) => {
    try {
        const user = auth.currentUser;
        if (!user) return false;

        const recipeRef = doc(db, 'recipes', recipeId);
        const docSnap = await getDoc(recipeRef);

        if (docSnap.exists()) {
            const recipeData = docSnap.data();
            // Check if user's ID is in the savedBy array
            return recipeData.savedBy && recipeData.savedBy.includes(user.uid);
        } else {
            console.log("No such document!");
            return false;
        }
    } catch (error) {
        console.error('Error checking if recipe is saved:', error);
        return false;
    }
};

// Get recipe by ID
export const getRecipeById = async (recipeId) => {
    try {
        const recipeRef = doc(db, 'recipes', recipeId);
        const docSnap = await getDoc(recipeRef);

        if (docSnap.exists()) {
            const recipeData = docSnap.data();
            const isCreator = recipeData.userId === currentUserId;
            return { id: docSnap.id, ...recipeData, isCreator };
        } else {
            throw new Error('Recipe not found');
        }
    } catch (error) {
        console.error('Error fetching recipe by ID:', error);
        throw new Error('Could not fetch recipe details.');
    }
};

// Get all recipes saved by the current user
export const getSavedRecipes = async () => {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.log('No user logged in, returning empty list of saved recipes.');
            return [];
        }

        const recipesRef = collection(db, 'recipes');
        const q = query(recipesRef, where('savedBy', 'array-contains', user.uid));

        const snapshot = await getDocs(q);
        const savedRecipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        return savedRecipes;
    } catch (error) {
        console.error('Error fetching saved recipes:', error);
        throw new Error('Could not fetch saved recipes.');
    }
};
