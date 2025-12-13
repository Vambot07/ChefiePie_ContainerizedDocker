// ~/controller/recipe.ts
import { db, auth } from '../../firebaseConfig';
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  doc,
  deleteDoc,
  query,
  where,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  DocumentData,
  Timestamp,
} from 'firebase/firestore';
import { fetchRecipeApiById, fetchRandomRecipes } from '~/api/spoonacular';

// ==================== INTERFACES ====================

export interface RecipeData {
  image: string;
  title: string;
  intro: string;
  prepTime: string;
  cookTime: string;
  totalTime: string;
  difficulty: string;
  ingredients: Ingredient[];
  steps: Step[];
  tips: string;
  serving: string;
  nutrition: string;
  sourceUrl: string;
  youtube: string;
  isPrivate?: boolean;
}

export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
}

export interface Step {
  title: string;
  details: string;
  time?: string;
}

export interface Recipe {
  id: string;
  userId?: string;
  title: string;
  image: string;
  username?: string;
  profileImage?: string | null;
  totalTime?: string;
  difficulty?: string;
  source: 'created' | 'api';
  intro?: string;
  ingredients?: Ingredient[];
  steps?: Step[];
  sourceUrl?: string | null;
  youtube?: string;
  createdAt?: Timestamp;
  savedDocId?: string;
  isPrivate?: boolean;
}

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  profileImage: string | null;
  bio: string | null;
  instagram: string | null;
  youtube: string | null;
  tiktok: string | null;
  dietaryRestrictions?: string[];
  cookingGoal?: string;
  ingredientsToAvoid?: string[];
  servingSize?: number;
}

// ==================== HELPER FUNCTIONS ====================

export const getUsernameById = async (userId: string): Promise<string> => {
  if (!userId) return 'Unknown';

  try {
    const userRef = doc(db, 'users', userId);
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

export const getProfileImageById = async (userId: string): Promise<string | null> => {
  if (!userId) return null;

  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const profileImage = userDoc.data().profileImage;
      return profileImage && profileImage.trim() !== '' ? profileImage : null;
    }
    return null;
  } catch (error) {
    console.warn(`⚠️ Could not fetch profile image for user ${userId}:`, error);
    return null;
  }
};

// NEW: Get complete user profile by userId
export const getUserProfileById = async (
  userId: string | undefined
): Promise<UserProfile | null> => {
  // Strict validation
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    console.error('❌ Invalid userId provided to getUserProfileById:', userId);
    return null;
  }

  try {
    console.log('🔍 Fetching profile for userId:', userId);

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.log('⚠️ User document does not exist for:', userId);
      return null;
    }

    const data = userDoc.data();

    if (!data) {
      console.log('⚠️ User document exists but has no data');
      return null;
    }

    const profile: UserProfile = {
      uid: userDoc.id,
      username: data.username || 'Unknown User',
      email: data.email || '',
      profileImage: data.profileImage || null,
      bio: data.bio || null,
      instagram: data.instagram || null,
      youtube: data.youtube || null,
      tiktok: data.tiktok || null,
      dietaryRestrictions: Array.isArray(data.dietaryRestrictions) ? data.dietaryRestrictions : [],
      cookingGoal: data.cookingGoal || '',
      ingredientsToAvoid: Array.isArray(data.ingredientsToAvoid) ? data.ingredientsToAvoid : [],
      servingSize: typeof data.servingSize === 'number' ? data.servingSize : 1,
    };

    console.log('✅ Profile loaded successfully:', profile.username);
    return profile;
  } catch (error: any) {
    console.error('❌ Error in getUserProfileById:');
    console.error('   userId:', userId);
    console.error('   Error:', error);
    console.error('   Stack:', error.stack);
    return null;
  }
};

// ==================== RECIPE CRUD ====================

export const addRecipe = async (recipeData: RecipeData): Promise<string> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const recipesRef = collection(db, 'recipes');
    const docRef = await addDoc(recipesRef, {
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
      isPrivate: recipeData.isPrivate || false,
      createdAt: serverTimestamp(),
      savedBy: [],
      source: 'created',
    });

    console.log('Recipe added successfully!');
    return docRef.id;
  } catch (error) {
    console.error('Error adding recipe:', error);
    throw new Error('Error adding recipe. Please try again.');
  }
};

export const searchRecipes = async (searchQuery: string): Promise<Recipe[]> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const recipesRef = collection(db, 'recipes');
    const snapshot = await getDocs(recipesRef);

    const allRecipes = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        userId: data.userId || '',
        title: data.title || '',
        source: (data.source as 'created' | 'api') || 'created',
        isPrivate: data.isPrivate || false,
      };
    });

    const filtered = allRecipes.filter(
      (recipe) =>
        recipe.title &&
        recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        // Privacy filter: Only show public recipes OR private recipes owned by current user
        (!recipe.isPrivate || recipe.userId === user.uid)
    );

    const recipesWithUserData = await Promise.all(
      filtered.map(async (recipe) => {
        // ✅ Only fetch username/image if userId exists
        if (!recipe.userId) {
          return {
            ...recipe,
            username: 'Unknown',
            profileImage: null,
            source: recipe.source || 'created',
          } as Recipe;
        }

        const username = await getUsernameById(recipe.userId);
        const profileImage = await getProfileImageById(recipe.userId);

        return {
          ...recipe,
          username,
          profileImage,
          source: recipe.source || 'created',
        } as Recipe;
      })
    );

    console.log(`✅ Found ${recipesWithUserData.length} recipes matching "${searchQuery}"`);
    return recipesWithUserData;
  } catch (error) {
    console.error('Error searching recipes:', error);
    throw error;
  }
};

export const deleteRecipe = async (recipeId: string): Promise<string> => {
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

// ==================== SAVE/UNSAVE ====================

export const saveRecipe = async ({
  id,
  title,
  source,
  image,
  totalTime,
  sourceUrl,
  isPrivate,
}: {
  id: string;
  title: string;
  source: string;
  image: string;
  totalTime?: string;
  sourceUrl?: string | null;
  isPrivate?: boolean;
}): Promise<string> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const savedRef = collection(db, 'saved');

    const savedDoc = {
      recipeId: id.toString(),
      userId: user.uid,
      title: title || 'Untitled',
      image: image || 'https://placehold.co/400x300/e2e8f0/64748b?text=No+Recipe+Image',
      source: source || 'created',
      totalTime: totalTime || null,
      sourceUrl: sourceUrl || null,
      isPrivate: isPrivate || false,
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

export const saveApiRecipe = async (recipe: any): Promise<string> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not logged in');

    const savedRef = collection(db, 'saved');

    await addDoc(savedRef, {
      recipeId: recipe.id.toString(),
      title: recipe.title,
      image: recipe.image || '',
      source: 'api',
      totalTime: recipe.readyInMinutes ? `${recipe.readyInMinutes}` : 'N/A',
      sourceUrl: recipe.sourceUrl || null,
      userId: user.uid,
      isPrivate: false,
      savedAt: serverTimestamp(),
    });

    console.log('✅ API recipe saved successfully!');
    return 'Recipe saved successfully!';
  } catch (error) {
    console.error('❌ Error saving API recipe:', error);
    throw error;
  }
};

export const unsaveRecipe = async (recipeId: string): Promise<string> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const recipeIdStr = recipeId.toString();

    const savedRef = collection(db, 'saved');
    const q = query(
      savedRef,
      where('userId', '==', user.uid),
      where('recipeId', '==', recipeIdStr)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('Recipe not saved yet, nothing to unsave.');
      return 'Recipe unsaved successfully!';
    }

    const deletePromises = snapshot.docs.map((docItem) => deleteDoc(doc(db, 'saved', docItem.id)));
    await Promise.all(deletePromises);

    console.log('Recipe unsaved successfully!');
    return 'Recipe unsaved successfully!';
  } catch (error) {
    console.error('Error unsaving recipe:', error);
    throw new Error('Error unsaving recipe. Please try again.');
  }
};

export const isRecipeSaved = async (recipeId: string): Promise<boolean> => {
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

export const getRecipeById = async (recipeId: string): Promise<Recipe> => {
  try {
    const currentUserId = auth.currentUser?.uid;
    const recipeRef = doc(db, 'recipes', recipeId);
    const docSnap = await getDoc(recipeRef);

    if (docSnap.exists()) {
      const recipeData = docSnap.data();
      const isCreator = recipeData.userId === currentUserId;

      const username = await getUsernameById(recipeData.userId);
      const profileImage = await getProfileImageById(recipeData.userId);

      if (recipeData.source === 'created' || !recipeData.source) {
        return {
          id: docSnap.id,
          ...recipeData,
          username,
          profileImage,
          source: recipeData.source || 'created',
        } as Recipe;
      }

      if (recipeData.source === 'api') {
        const apiRecipe = await fetchRecipeApiById(recipeId);
        return {
          id: recipeId,
          ...apiRecipe,
          username: 'Unknown',
          profileImage: null,
          source: 'api',
        } as Recipe;
      }
    }

    // Try API if not found in Firestore
    console.log(`Recipe ID ${recipeId} not found in Firestore, trying API...`);
    const apiRecipe = await fetchRecipeApiById(recipeId);

    if (apiRecipe) {
      return {
        id: apiRecipe.id,
        title: apiRecipe.title,
        image: apiRecipe.image,
        intro: apiRecipe.summary,
        totalTime: apiRecipe.readyInMinutes ? `${apiRecipe.readyInMinutes}` : 'N/A',
        ingredients: apiRecipe.extendedIngredients.map((ing: any) => ({
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit,
        })),
        steps:
          apiRecipe.analyzedInstructions?.[0]?.steps.map((s: any, index: number) => ({
            title: `Step ${index + 1}`,
            details: s.step,
          })) || [],
        sourceUrl: apiRecipe.sourceUrl || null,
        source: 'api',
      } as Recipe;
    }

    throw new Error('Recipe not found');
  } catch (error) {
    console.error('Error fetching recipe by ID:', error);
    throw new Error('Could not fetch recipe details.');
  }
};

export const getSavedRecipes = async (userId?: string): Promise<Recipe[]> => {
  try {
    const user = auth.currentUser;
    const targetUserId = userId || user?.uid;

    if (!targetUserId) {
      console.log('⚠️ No user ID provided');
      return [];
    }

    const savedRef = collection(db, 'saved');
    const q = query(savedRef, where('userId', '==', targetUserId));
    const snapshot = await getDocs(q);

    const savedRecipes = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();

        if (!data.recipeId) return null;

        // CASE 1: CREATED RECIPE
        if (data.source === 'created') {
          const recipeRef = doc(db, 'recipes', data.recipeId);
          const recipeDoc = await getDoc(recipeRef);

          if (!recipeDoc.exists()) return null;

          const recipeData = recipeDoc.data();

          const username = await getUsernameById(recipeData.userId);
          const profileImage = await getProfileImageById(recipeData.userId);
          const recipeImage = recipeData.image || '';

          return {
            id: recipeDoc.id,
            ...recipeData,
            image: recipeImage,
            username,
            profileImage,
            source: 'created',
            savedDocId: docSnap.id,
          } as Recipe;
        }

        // CASE 2: API RECIPE
        if (data.source === 'api') {
          return {
            id: data.recipeId,
            username: 'Spoonacular',
            title: data.title || 'Untitled Recipe',
            image: data.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
            totalTime: data.totalTime || 'N/A',
            source: 'api',
            profileImage: null,
            savedDocId: docSnap.id,
          } as Recipe;
        }

        return null;
      })
    );

    const validRecipes = savedRecipes.filter((r): r is Recipe => r !== null);
    console.log(`✅ Found ${validRecipes.length} saved recipes for user: ${targetUserId}`);
    return validRecipes;
  } catch (error) {
    console.error('❌ Error fetching saved recipes:', error);
    return [];
  }
};

export const getRecipeByUser = async (userId?: string): Promise<Recipe[]> => {
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

    const username = await getUsernameById(targetUserId);
    const profileImage = await getProfileImageById(targetUserId);

    const recipes: Recipe[] = snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
          username,
          profileImage,
          source: 'created' as 'created' | 'api',
        }) as Recipe
    );

    console.log(`✅ Found ${recipes.length} recipes for ${username} (${targetUserId})`);
    return recipes;
  } catch (error) {
    console.error('❌ Error fetching user recipes:', error);
    return [];
  }
};

export const getRandomRecipes = async (number: number): Promise<any[]> => {
  try {
    const recipes = await fetchRandomRecipes(number);
    console.log(recipes);
    return recipes;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
