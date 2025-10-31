import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';
import { getDocs, collection, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

// ✅ Convert file URI to blob using FileSystem (more reliable for iOS)
const uriToBlob = async (uri: string): Promise<Blob> => {
    try {
        console.log('🔄 Reading file with FileSystem...');

        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        console.log('✅ File read successfully');
        console.log('📦 Base64 length:', base64.length);

        // Convert base64 to blob
        const response = await fetch(`data:image/jpeg;base64,${base64}`);
        const blob = await response.blob();

        console.log('✅ Blob created');
        console.log('📦 Blob size:', blob.size, 'bytes');
        console.log('📄 Blob type:', blob.type);

        return blob;
    } catch (error) {
        console.error('❌ Error in uriToBlob:', error);
        throw error;
    }
};

export const uploadImageToFirebase = async (uri: string, fileName: string): Promise<string> => {
    try {
        console.log('🔄 Starting upload process...');
        console.log('📁 File name:', fileName);
        console.log('🖼️ Image URI:', uri);

        // Convert URI to blob
        const blob = await uriToBlob(uri);

        const storage = getStorage();
        console.log('🪣 Storage bucket:', storage.app.options.storageBucket);

        if (!storage.app.options.storageBucket) {
            throw new Error('❌ Storage bucket not configured!');
        }

        const storageRef = ref(storage, `recipes/${fileName}`);
        console.log('📍 Storage path:', storageRef.fullPath);
        console.log('📤 Uploading to Firebase...');
        console.log("blob:", blob)
        // Use uploadBytes (simpler, sometimes more reliable)
        await uploadBytes(storageRef, blob);

        console.log('✅ Upload complete! Getting download URL...');
        const downloadURL = await getDownloadURL(storageRef);
        console.log('✅ Download URL received:', downloadURL);

        return downloadURL;
    } catch (error: any) {
        console.error('❌ Error in uploadImageToFirebase:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);

        if (error.serverResponse) {
            console.error('🔴 Server response:', error.serverResponse);
        }

        throw error;
    }
};

export const uploadProfileToFirebase = async (uri: string, fileName: string): Promise<string> => {
    try {
        console.log('🔄 Starting profile upload...');
        const blob = await uriToBlob(uri);

        const storage = getStorage();
        console.log('🪣 Storage bucket:', storage.app.options.storageBucket);

        if (!storage.app.options.storageBucket) {
            throw new Error('❌ Storage bucket not configured!');
        }

        const storageRef = ref(storage, `profiles/${fileName}`);
        console.log('📍 Storage path:', storageRef.fullPath);
        console.log('📤 Uploading to Firebase...');

        await uploadBytes(storageRef, blob);
        console.log('✅ Upload complete! Getting download URL...');

        const downloadURL = await getDownloadURL(storageRef);

        console.log('✅ Profile URL:', downloadURL);
        return downloadURL;
    } catch (error) {
        console.error('❌ Error in uploadProfileToFirebase:', error);
        throw error;
    }
};

export const migrateImages = async () => {
    const recipesRef = collection(db, 'recipes');
    const snapshot = await getDocs(recipesRef);

    for (const recipeDoc of snapshot.docs) {
        const recipe = recipeDoc.data();
        if (recipe.image && recipe.image.startsWith('file://')) {
            try {
                const fileName = `recipe_${recipeDoc.id}_${Date.now()}.jpg`;
                const newImageUrl = await uploadImageToFirebase(recipe.image, fileName);

                await updateDoc(doc(db, 'recipes', recipeDoc.id), {
                    image: newImageUrl,
                });

                console.log(`✅ Migrated image for recipe ${recipeDoc.id}`);
            } catch (error) {
                console.error(`❌ Failed to migrate recipe ${recipeDoc.id}:`, error);
            }
        }
    }
};