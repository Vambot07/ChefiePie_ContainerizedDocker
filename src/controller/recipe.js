import { db, auth } from '../../firebaseConfig';
import { collection, addDoc, serverTimestamp, getDocs, doc, deleteDoc, query, where, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { fetchRecipeApiById } from '~/api/spoonacular';

const currentUserId = auth.currentUser?.uid;

export const addRecipe = async (recipeData) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');

        const recipesRef = collection(db, 'recipes');
        await addDoc(recipesRef, {
            userId: user.uid,
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
            sourceUrl: recipeData.sourceUrl,
            youtube: recipeData.youtube,
            createdAt: serverTimestamp(),
            savedBy: [],
            source: 'created',
        });

        console.log('Recipe added successfully!');
        return 'Recipe added successfully!';
    } catch (error) {
        console.error('Error adding recipe:', error);
        throw new Error('Error adding recipe. Please try again.');
    }
};

// ✅ HELPER: Get username by userId
const getUsernameById = async (userId) => {
    if (!userId) return 'Unknown';
    
    try {
        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            return userDoc.data().username || 'Unknown';
        }
        return 'Unknown';
    } catch (error) {
        console.warn(`⚠️ Could not fetch username for user ${userId}:`, error);
        return 'Unknown';
    }
};

// ✅ HELPER: Get profile image by userId
const getProfileImageById = async (userId) => {
    if (!userId) return null; // ✅ Return null instead of empty string

    try {
        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            const profileImage = userDoc.data().profileImage;
            // ✅ Return null if empty or undefined
            return profileImage && profileImage.trim() !== "" ? profileImage : null;
        }
        return null;
    } catch (error) {
        console.warn(`⚠️ Could not fetch profile image for user ${userId}:`, error);
        return null; // ✅ Return null on error
    }
};

// Search recipes by title with username and profile image lookup
export const searchRecipes = async (searchQuery) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');

        const recipesRef = collection(db, 'recipes');
        const snapshot = await getDocs(recipesRef);

        const allRecipes = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            source: 'created'
        }));

        const filtered = allRecipes.filter(recipe =>
            recipe.title && recipe.title.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // ✅ Fetch usernames and profile images for filtered recipes
        const recipesWithUserData = await Promise.all(
            filtered.map(async (recipe) => {
                const username = await getUsernameById(recipe.userId);
                const profileImage = await getProfileImageById(recipe.userId);
                
                console.log(`Recipe: ${recipe.title}, Username: ${username}, ProfileImage: ${profileImage || 'No image'}`);
                
                return {
                    ...recipe,
                    username,
                    profileImage // ✅ Will be null if no image, not empty string
                };
            })
        );

        console.log(`✅ Found ${recipesWithUserData.length} recipes matching "${searchQuery}"`);
        return recipesWithUserData;
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

// SAVE LOGIC
export const saveRecipe = async ({ id, title, source, image, totalTime, sourceUrl }) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');

        const savedRef = collection(db, 'saved');

        const savedDoc = {
            recipeId: id.toString(),
            userId: user.uid,
            title: title || 'Untitled',
            image: image || '',
            source: source || 'created',
            totalTime: totalTime || null,
            sourceUrl: sourceUrl || null,
            savedAt: serverTimestamp(),
        };

        await addDoc(savedRef, savedDoc);

        console.log('✅ Recipe saved successfully!');
        return 'Recipe saved successfully!';
    } catch (error) {
        console.error('❌ Error saving recipe:', error);
        throw new Error('Error saving recipe. Please try again.');
    }
};

export const saveApiRecipe = async (recipe) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("User not logged in");

        const savedRef = collection(db, "saved");

        await addDoc(savedRef, {
            recipeId: recipe.id.toString(),
            title: recipe.title,
            image: recipe.image || "",
            source: "api",
            totalTime: recipe.readyInMinutes ? `${recipe.readyInMinutes}` : 'N/A',
            sourceUrl: recipe.sourceUrl || null,
            userId: user.uid, 
            savedAt: serverTimestamp(),
        });

        console.log("✅ API recipe saved successfully!");
        return 'Recipe saved successfully!';
    } catch (error) {
        console.error("❌ Error saving API recipe:", error);
        throw error;
    }
};

// UNSAVE RECIPE
export const unsaveRecipe = async (recipeId) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');
        
        const recipeIdStr = recipeId.toString();

        const savedRef = collection(db, 'saved');
        const q = query(savedRef, where('userId', '==', user.uid), where('recipeId', '==', recipeIdStr));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.log('Recipe not saved yet, nothing to unsave.');
            return 'Recipe unsaved successfully!';
        }

        const deletePromises = snapshot.docs.map(docItem => 
            deleteDoc(doc(db, 'saved', docItem.id))
        );
        await Promise.all(deletePromises);

        console.log('Recipe unsaved successfully!');
        return 'Recipe unsaved successfully!';
    } catch (error) {
        console.error('Error unsaving recipe:', error);
        throw new Error('Error unsaving recipe. Please try again.');
    }
};

export const isRecipeSaved = async (recipeId) => {
    try {
        const user = auth.currentUser;
        const recipeIdString = recipeId.toString();

        if (!user) return false;

        const savedRef = collection(db, 'saved');
        const q = query(
            savedRef, 
            where('userId', '==', user.uid), 
            where('recipeId', '==', recipeIdString)
        );
        const snapshot = await getDocs(q);

        return !snapshot.empty;
    } catch (error) {
        console.error('Error checking if recipe is saved:', error);
        return false;
    }
};

export const getRecipeById = async (recipeId) => {
    try {
        const recipeRef = doc(db, 'recipes', recipeId);
        const docSnap = await getDoc(recipeRef);

        if (docSnap.exists()) {
            const recipeData = docSnap.data();
            const isCreator = recipeData.userId === currentUserId;

            if (recipeData.source === 'created' || !recipeData.source) {
                return { 
                    id: docSnap.id, 
                    ...recipeData, 
                    source: recipeData.source || 'created',
                    isCreator 
                };
            }

            if (recipeData.source === 'api') {
                const apiRecipe = await fetchRecipeApiById(recipeId);
                return {
                    id: recipeId,
                    ...apiRecipe,
                    source: 'api',
                    isCreator
                };
            }
        } else {
            console.log(`Recipe ID ${recipeId} not found in Firestore, trying API...`);
            try {
                const apiRecipe = await fetchRecipeApiById(recipeId);
                if (apiRecipe) {
                    return {
                        id: apiRecipe.id,
                        title: apiRecipe.title,
                        image: apiRecipe.image,
                        intro: apiRecipe.summary,
                        totalTime: apiRecipe.readyInMinutes ? `${apiRecipe.readyInMinutes}` : 'N/A',
                        ingredients: apiRecipe.extendedIngredients.map((ing) => ({
                            name: ing.name,
                            amount: ing.amount,
                            unit: ing.unit
                        })),
                        steps: apiRecipe.analyzedInstructions?.[0]?.steps.map((s, index) => ({
                            title: `Step ${index + 1}`,
                            details: s.step
                        })) || [],
                        sourceUrl: apiRecipe.sourceUrl || null,
                        source: 'api'
                    };
                }
            } catch {
                throw new Error('Recipe not found');
            }
        }
    } catch (error) {
        console.error('Error fetching recipe by ID:', error);
        throw new Error('Could not fetch recipe details.');
    }
};

// GET ALL SAVED RECIPES FOR CURRENT USER
export const getSavedRecipes = async (userId) => {
    try {
        const user = auth.currentUser;
        const targetUserId = userId || user?.uid;
        
        if (!targetUserId) {
            console.log('⚠️ No user ID provided');
            return [];
        }

        const savedRef = collection(db, "saved");
        const q = query(savedRef, where("userId", "==", targetUserId));
        const snapshot = await getDocs(q);

        const savedRecipes = await Promise.all(
            snapshot.docs.map(async (docSnap) => {
                const data = docSnap.data();

                if (!data.recipeId) return null;

                // CASE 1: CREATED RECIPE
                if (data.source === "created") {
                    const recipeRef = doc(db, "recipes", data.recipeId);
                    const recipeDoc = await getDoc(recipeRef);

                    if (!recipeDoc.exists()) return null;

                    const recipeData = recipeDoc.data();
                    
                    // ✅ Fetch username and profile image
                    const username = await getUsernameById(recipeData.userId);
                    const profileImage = await getProfileImageById(recipeData.userId);

                    return {
                        id: recipeDoc.id,
                        ...recipeData,
                        username,
                        profileImage, // ✅ Will be null if no image
                        source: "created",
                        savedDocId: docSnap.id 
                    };
                }

                // CASE 2: API RECIPE
                if (data.source === "api") {
                    return {
                        id: data.recipeId,
                        username: "Spoonacular",
                        title: data.title || "Untitled Recipe",
                        image: data.image || "https://images.unsplash.com/photo-1504674900247-0877df9cc836",
                        totalTime: data.totalTime || 'N/A',
                        source: "api",
                        profileImage: null, // ✅ API recipes don't have profile images
                        savedDocId: docSnap.id
                    };
                }

                return null;
            })
        );

        const validRecipes = savedRecipes.filter(r => r !== null);
        console.log(`✅ Found ${validRecipes.length} saved recipes for user: ${targetUserId}`);
        return validRecipes;

    } catch (error) {
        console.error("❌ Error fetching saved recipes:", error);
        return [];
    }
};

// GET RECIPES BY USER
export const getRecipeByUser = async (userId) => {
    try {
        const user = auth.currentUser;
        const targetUserId = userId || user?.uid;
        
        if (!targetUserId) {
            console.log('⚠️ No user ID provided');
            return [];
        }

        const recipesRef = collection(db, 'recipes');
        const q = query(recipesRef, where('userId', '==', targetUserId));
        const snapshot = await getDocs(q);

        // ✅ Fetch username and profile image once for all recipes
        const username = await getUsernameById(targetUserId);
        const profileImage = await getProfileImageById(targetUserId);
        
        const recipes = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            username,
            profileImage, // ✅ Will be null if no image
            source: 'created'
        }));

        console.log(`✅ Found ${recipes.length} recipes for ${username} (${targetUserId})`);
        return recipes;
    } catch (error) {
        console.error('❌ Error fetching user recipes:', error);
        return [];
    }
};