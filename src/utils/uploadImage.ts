import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';
import { getDocs, collection, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

// ✅ Convert file URI to blob using XMLHttpRequest (more reliable for React Native)
const uriToBlob = async (uri: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        console.log('🔄 Converting URI to blob...');
        console.log('📍 URI:', uri);

        const xhr = new XMLHttpRequest();

        xhr.onload = function () {
            try {
                const blob = xhr.response as Blob;
                console.log('✅ Blob created');
                console.log('📦 Blob size:', blob.size, 'bytes');
                console.log('📄 Blob type:', blob.type);
                resolve(blob);
            } catch (error) {
                console.error('❌ Error creating blob:', error);
                reject(error);
            }
        };

        xhr.onerror = function (e) {
            console.error('❌ XHR error:', e);
            reject(new TypeError('Failed to convert URI to blob'));
        };

        xhr.responseType = 'blob';
        xhr.open('GET', uri, true);
        xhr.send(null);
    });
};

// ✅ Delete image from Firebase Storage
export const deleteImageFromFirebase = async (imageUrl: string): Promise<void> => {
    try {
        if (!imageUrl) {
            console.log('⚠️ No image URL provided, skipping delete');
            return;
        }

        console.log('🗑️ Deleting old image:', imageUrl);

        const storage = getStorage();

        // Extract the file path from the download URL
        // URL format: https://firebasestorage.googleapis.com/v0/b/bucket/o/path%2Fto%2Ffile.jpg?alt=media&token=...
        const decodedUrl = decodeURIComponent(imageUrl);
        const pathMatch = decodedUrl.match(/\/o\/(.+?)\?/);

        if (!pathMatch || !pathMatch[1]) {
            console.error('❌ Could not extract file path from URL');
            return;
        }

        const filePath = pathMatch[1];
        console.log('📍 File path:', filePath);

        const imageRef = ref(storage, filePath);
        await deleteObject(imageRef);

        console.log('✅ Old image deleted successfully');
    } catch (error: any) {
        // Don't throw - we don't want to block the upload if delete fails
        console.error('❌ Error deleting image:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);

        // Only log warning, don't fail the operation
        if (error.code === 'storage/object-not-found') {
            console.log('⚠️ Image file not found (may have been already deleted)');
        }
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

// ✅ NEW: Upload profile with automatic deletion of old image
export const updateProfileImage = async (
    uri: string,
    userId: string,
    oldImageUrl?: string
): Promise<string> => {
    try {
        console.log('🔄 Starting profile image update...');

        // 1. Delete old image first (if exists)
        if (oldImageUrl) {
            console.log('🗑️ Deleting old profile picture...');
            await deleteImageFromFirebase(oldImageUrl);
        }

        // 2. Upload new image
        const fileName = `profile_${userId}_${Date.now()}.jpg`;
        console.log('📁 New filename:', fileName);

        const newImageUrl = await uploadProfileToFirebase(uri, fileName);
        console.log('✅ Profile image updated successfully!');

        return newImageUrl;
    } catch (error) {
        console.error('❌ Error updating profile image:', error);
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