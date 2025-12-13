import { db, auth } from '../../firebaseConfig';
import { collection, addDoc, getDocs, query, where, updateDoc, doc, deleteDoc, writeBatch, Timestamp } from 'firebase/firestore';

// ==================== INTERFACES ====================

export interface ChecklistItem {
    id: string;
    userId: string;
    name: string;
    amount: string;
    unit: string;
    timestamp: Timestamp;
    checked: boolean;
    status: 'shopping' | 'history';
}

export interface Ingredient {
    name: string;
    amount?: string | number;
    unit?: string;
}

// ==================== FUNCTIONS ====================

// Get all checklist and food list items for the current user
export const getAllUserItems = async (): Promise<ChecklistItem[]> => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const itemsRef = collection(db, 'checklists');
    const q = query(itemsRef, where('userId', '==', user.uid));
    const snapshot = await getDocs(q);

    const items = snapshot.docs.map(document => ({
        id: document.id,
        ...document.data()
    } as ChecklistItem));

    return items.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
};

// Add multiple ingredients to the checklist
export const addItemsToChecklist = async (ingredients: Ingredient[]): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error('User is not authenticated');

    const checklistRef = collection(db, 'checklists');
    const batch = writeBatch(db);

    ingredients.forEach((ingredient) => {
        let amount = ingredient.amount;
        let unit = ingredient.unit || '';

        // Convert amount to string if it's a number
        if (typeof amount === 'number') {
            amount = amount.toString();
        }

        // Default fallback
        if (!ingredient.name) ingredient.name = "Unknown";

        const newDocRef = doc(checklistRef);
        batch.set(newDocRef, {
            userId: user.uid,
            name: ingredient.name,
            amount: amount || '',
            unit: unit || '',
            timestamp: Timestamp.now(),
            checked: false,
            status: 'shopping'
        });
    });

    await batch.commit();
};

// Move checked items to the food list (pantry)
export const moveItemsToHistoryList = async (): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const itemsRef = collection(db, 'checklists');
    const q = query(itemsRef, where('userId', '==', user.uid), where('status', '==', 'shopping'), where('checked', '==', true));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach(document => {
        const docRef = doc(db, 'checklists', document.id);
        batch.update(docRef, { status: 'history', checked: false });
    });

    await batch.commit();
};

// Toggle an item's 'checked' status
export const toggleChecklistItem = async (itemId: string, checked: boolean): Promise<void> => {
    const itemRef = doc(db, 'checklists', itemId);
    await updateDoc(itemRef, { checked });
};

// Delete a single checklist item
export const deleteChecklistItem = async (itemId: string): Promise<void> => {
    const itemRef = doc(db, 'checklists', itemId);
    await deleteDoc(itemRef);
};

// Clear all checked items from the shopping list
export const clearHistoryListItems = async (): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const itemsRef = collection(db, 'checklists');
    const q = query(itemsRef, where('userId', '==', user.uid), where('status', '==', 'history'), where('checked', '==', false));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach(document => {
        batch.delete(document.ref);
    });

    await batch.commit();
};
