import { db } from '../firebaseConfig';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { getUsernameById, getProfileImageById } from '~/controller/recipe';

// Import your API function
import { fetchRecipeById } from '~/api/spoonacular';

interface Recipe {
  id: string;
  title: string;
  image: string;
  totalTime?: string;
  difficulty?: string;
  source?: 'created' | 'api';
  userId?: string;
  username?: string;
  profileImage?: string;
  ingredients?: any[];
  steps?: any[];
  intro?: string;
  serves?: number;
  items?: number;
  youtube?: string;
}

// ✅ Generate a unique week ID based on the week start date
export const getWeekId = (weekOffset: number): string => {
  const today = new Date();
  const currentDay = today.getDay();
  const diff = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff + weekOffset * 7);

  // Format: "2024-01-15" (year-month-day)
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const day = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ✅ Get week start and end dates
const getWeekDates = (weekOffset: number) => {
  const today = new Date();
  const currentDay = today.getDay();
  const diff = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    startDate: monday.toISOString().split('T')[0],
    endDate: sunday.toISOString().split('T')[0],
  };
};

// Save meal plan for a week
export const saveMealPlan = async (
  userId: string,
  weekOffset: number,
  recipesByDay: { [key: number]: Recipe[] }
) => {
  try {
    const weekId = getWeekId(weekOffset);
    const { startDate, endDate } = getWeekDates(weekOffset);
    console.log(startDate);
    console.log(endDate);

    // Save both ID and source
    const days: { [key: number]: Array<{ id: string; source: 'created' | 'api' }> } = {};
    Object.keys(recipesByDay).forEach((dayIndex) => {
      const dayNum = Number(dayIndex);
      days[dayNum] = recipesByDay[dayNum].map((recipe) => ({
        id: recipe.id,
        source: recipe.source || 'api',
      }));
    });

    const weekDocRef = doc(db, 'planner', userId, 'weeks', weekId);

    await setDoc(weekDocRef, {
      weekOffset,
      startDate,
      endDate,
      days,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Meal plan saved successfully!');
    return { success: true };
  } catch (error) {
    console.error('❌ Error saving meal plan:', error);
    return { success: false, error };
  }
};

// Load meal plan for a specific week (IDs only)
export const loadMealPlan = async (
  userId: string,
  weekOffset: number
): Promise<{ [key: number]: string[] } | null> => {
  try {
    const weekId = getWeekId(weekOffset);
    const weekDocRef = doc(db, 'planner', userId, 'weeks', weekId);

    const weekDoc = await getDoc(weekDocRef);

    if (weekDoc.exists()) {
      const data = weekDoc.data();
      console.log('✅ Meal plan loaded:', data.days);
      return data.days || {};
    } else {
      console.log('ℹ️ No meal plan found for this week');
      return null;
    }
  } catch (error) {
    console.error('❌ Error loading meal plan:', error);
    return null;
  }
};

// Fetch full recipe details from IDs
export const fetchRecipeDetails = async (
  userId: string,
  recipeIds: string[],
  source: 'created' | 'api' = 'api'
): Promise<Recipe[]> => {
  try {
    const recipes: Recipe[] = [];

    for (const recipeId of recipeIds) {
      if (source === 'created') {
        // Fetch from Firestore (user-created recipes)
        const recipeDocRef = doc(db, 'recipes', recipeId);
        const recipeDoc = await getDoc(recipeDocRef);

        if (recipeDoc.exists()) {
          const data = recipeDoc.data();
          recipes.push({
            id: recipeDoc.id,
            title: data.title || 'Untitled Recipe',
            image: data.image || '',
            totalTime: data.totalTime?.toString() || '',
            difficulty: data.difficulty || '',
            source: 'created',
            // Include ALL fields needed by ViewRecipeScreen
            userId: data.userId,
            username: data.username,
            profileImage: data.profileImage,
            ingredients: data.ingredients || [],
            steps: data.steps || [],
            intro: data.intro || '',
            serves: data.serves,
            items: data.ingredients?.length || 0,
            youtube: data.youtube,
          });
        }
      } else if (source === 'api') {
        // Fetch from Spoonacular API
        const apiRecipe = await fetchRecipeById(recipeId);

        if (apiRecipe) {
          recipes.push({
            id: apiRecipe.id.toString(),
            title: apiRecipe.title,
            image: apiRecipe.image,
            totalTime: apiRecipe.readyInMinutes?.toString() || '',
            difficulty: '',
            source: 'api',
          });
        }
      }
    }

    return recipes;
  } catch (error) {
    console.error('❌ Error fetching recipe details:', error);
    return [];
  }
};

/// Load meal plan WITH full recipe details
export const loadMealPlanWithDetails = async (
  userId: string,
  weekOffset: number
): Promise<{ [key: number]: Recipe[] } | null> => {
  try {
    const weekId = getWeekId(weekOffset);
    const weekDocRef = doc(db, 'planner', userId, 'weeks', weekId);

    const weekDoc = await getDoc(weekDocRef);

    if (weekDoc.exists()) {
      const data = weekDoc.data();
      const savedDays = data.days || {};

      //console.log('✅ Meal plan loaded (IDs only):', savedDays);

      const recipesByDay: { [key: number]: Recipe[] } = {};

      for (const dayIndex in savedDays) {
        const dayNum = Number(dayIndex);
        const recipesData = savedDays[dayNum];

        // Handle both old format (string[]) and new format (object[])
        const recipes: Recipe[] = [];

        for (const recipeData of recipesData) {
          let recipeId: string;
          let source: 'created' | 'api';

          // Handle both old format (string) and new format (object)
          if (typeof recipeData === 'string') {
            recipeId = recipeData;
            source = 'api'; // Default for old data
          } else {
            recipeId = recipeData.id;
            source = recipeData.source || 'api';
          }

          // Fetch recipe details based on source
          const [recipeDetails] = await fetchRecipeDetails(userId, [recipeId], source);

          if (recipeDetails) {
            // If it's a created recipe and username is missing, fetch it
            if (source === 'created' && recipeDetails.userId && !recipeDetails.username) {
              const username = await getUsernameById(recipeDetails.userId);
              recipeDetails.username = username;
              const profileImage = await getProfileImageById(recipeDetails.userId);
              recipeDetails.profileImage = profileImage || '';
              //console.log(`✅ Fetched username for recipe ${recipeId}: ${username}`);
            }

            recipes.push(recipeDetails);
          }
        }

        recipesByDay[dayNum] = recipes;
      }

      //console.log('✅ Full recipes loaded:', recipesByDay);
      return recipesByDay;
    } else {
      //console.log('ℹ️ No meal plan found for this week');
      return null;
    }
  } catch (error) {
    console.error('❌ Error loading meal plan with details:', error);
    return null;
  }
};

// Delete a recipe from a specific day
export const deleteRecipeFromDay = async (
  userId: string,
  weekOffset: number,
  dayIndex: number,
  recipeId: string
) => {
  try {
    const weekId = getWeekId(weekOffset);
    const weekDocRef = doc(db, 'planner', userId, 'weeks', weekId);

    const weekDoc = await getDoc(weekDocRef);

    if (weekDoc.exists()) {
      const data = weekDoc.data();
      const days = data.days || {};

      if (days[dayIndex]) {
        // Handle both old and new format
        days[dayIndex] = days[dayIndex].filter((recipe: any) => {
          const id = typeof recipe === 'string' ? recipe : recipe.id;
          return id !== recipeId;
        });

        // If day is empty, remove the day entry
        if (days[dayIndex].length === 0) {
          delete days[dayIndex];
        }
      }

      // If no days left, delete the entire week document
      if (Object.keys(days).length === 0) {
        await deleteDoc(weekDocRef);
        console.log('✅ Week deleted (no recipes left)');
      } else {
        await updateDoc(weekDocRef, {
          days,
          updatedAt: new Date(),
        });
        console.log('✅ Recipe deleted from day');
      }

      return { success: true, days };
    }

    return { success: false };
  } catch (error) {
    console.error('❌ Error deleting recipe:', error);
    return { success: false, error };
  }
};

// Add a recipe to a specific day
export const addRecipeToDay = async (
  userId: string,
  weekOffset: number,
  dayIndex: number,
  recipe: Recipe
) => {
  try {
    const weekId = getWeekId(weekOffset);
    const { startDate, endDate } = getWeekDates(weekOffset);
    const weekDocRef = doc(db, 'planner', userId, 'weeks', weekId);

    const weekDoc = await getDoc(weekDocRef);

    if (weekDoc.exists()) {
      // Week exists, update it
      const data = weekDoc.data();
      const days = data.days || {};

      if (!days[dayIndex]) {
        days[dayIndex] = [];
      }

      // Save with source info
      const recipeEntry = {
        id: recipe.id,
        source: recipe.source || 'api',
      };

      // Check if recipe already exists
      const exists = days[dayIndex].some(
        (r: any) => (typeof r === 'string' ? r : r.id) === recipe.id
      );

      if (!exists) {
        days[dayIndex].push(recipeEntry);
      }

      await updateDoc(weekDocRef, {
        days,
        updatedAt: new Date(),
      });
    } else {
      // Week doesn't exist, create it
      const days: { [key: number]: Array<{ id: string; source: 'created' | 'api' }> } = {
        [dayIndex]: [
          {
            id: recipe.id,
            source: recipe.source || 'api',
          },
        ],
      };

      await setDoc(weekDocRef, {
        weekOffset,
        startDate,
        endDate,
        days,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    console.log('✅ Recipe added to day');
    return { success: true };
  } catch (error) {
    console.error('❌ Error adding recipe:', error);
    return { success: false, error };
  }
};

// Get all planned weeks for a user
export const getAllPlannedWeeks = async (userId: string) => {
  try {
    const weeksRef = collection(db, 'planner', userId, 'weeks');
    const snapshot = await getDocs(weeksRef);

    const weeks: { [key: string]: any } = {};
    snapshot.forEach((doc) => {
      weeks[doc.id] = doc.data();
    });

    console.log('✅ All planned weeks:', weeks);
    return weeks;
  } catch (error) {
    console.error('❌ Error getting planned weeks:', error);
    return {};
  }
};

// Delete an entire week
export const deleteWeek = async (userId: string, weekId: string) => {
  try {
    const weekDocRef = doc(db, 'planner', userId, 'weeks', weekId);
    await deleteDoc(weekDocRef);
    console.log(`✅ Week ${weekId} deleted successfully`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Error deleting week ${weekId}:`, error);
    return { success: false, error };
  }
};

// Cleanup past weeks (delete weeks that have completely passed)
export const cleanupPastWeeks = async (userId: string) => {
  try {
    const weeks = await getAllPlannedWeeks(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let deletedCount = 0;

    for (const [weekId, weekData] of Object.entries(weeks)) {
      if (weekData.endDate) {
        const endDate = new Date(weekData.endDate);
        endDate.setHours(23, 59, 59, 999);

        // If the week's end date has passed, delete it
        if (endDate < today) {
          console.log(`🗑️ Deleting past week: ${weekId} (ended: ${weekData.endDate})`);
          await deleteWeek(userId, weekId);
          deletedCount++;
        }
      }
    }

    if (deletedCount > 0) {
      console.log(`✅ Cleaned up ${deletedCount} past week(s)`);
    } else {
      console.log('ℹ️ No past weeks to clean up');
    }

    return { success: true, deletedCount };
  } catch (error) {
    console.error('❌ Error cleaning up past weeks:', error);
    return { success: false, error };
  }
};
