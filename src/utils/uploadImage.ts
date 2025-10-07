import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getDocs, collection, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';



export const uploadImageToFirebase = async (uri: string, fileName: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();

    const storage = getStorage();
    const storageRef = ref(storage, `recipes/${fileName}`);

    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
}


export const uploadProfileToFirebase = async (uri: string, fileName: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();

    const storage = getStorage();
    const storageRef = ref(storage, `profiles/${fileName}`);

    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
}


export const migrateImages = async () => {
    const recipesRef = collection(db, 'recipes');
    const snapshot = await getDocs(recipesRef);

    for (const recipeDoc of snapshot.docs) {
        const recipe = recipeDoc.data();
        // Check if image is a local URI
        if (recipe.image && recipe.image.startsWith('file://')) {
            try {
                const fileName = `recipe_${recipeDoc.id}_${Date.now()}.jpg`;
                const newImageUrl = await uploadImageToFirebase(recipe.image, fileName);

                // Update Firestore document
                await updateDoc(doc(db, 'recipes', recipeDoc.id), {
                    image: newImageUrl,
                });

                console.log(`Migrated image for recipe ${recipeDoc.id}`);
            } catch (error) {
                console.error(`Failed to migrate image for recipe ${recipeDoc.id}:`, error);
            }
        }
    }
};