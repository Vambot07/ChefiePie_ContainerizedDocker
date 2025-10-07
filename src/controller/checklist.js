import { db, auth } from '../../firebaseConfig';
import { collection, addDoc, getDocs, query, where, updateDoc, doc, deleteDoc, writeBatch, Timestamp } from 'firebase/firestore';

// Get all checklist and food list items for the current user
export const getAllUserItems = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const itemsRef = collection(db, 'checklists');
    const q = query(itemsRef, where('userId', '==', user.uid));
    const snapshot = await getDocs(q);

    const items = snapshot.docs.map(document => ({ id: document.id, ...document.data() }));
    return items.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
};

// Add multiple ingredients to the checklist
export const addItemsToChecklist = async (ingredients) => {
    const user = auth.currentUser;
    if (!user) throw new Error('User is not authenticated');

    const checklistRef = collection(db, 'checklists');
    const batch = writeBatch(db);

    ingredients.forEach((ingredient) => {
        const itemAmountStr = ingredient.amount || '';
        const match = itemAmountStr.match(/^(\d*\.?\d+)\s*(.*)$/);
        const amount = match ? match[1] : itemAmountStr;
        const unit = match ? match[2].trim() : '';

        const newDocRef = doc(checklistRef);
        batch.set(newDocRef, {
            userId: user.uid,
            name: ingredient.name,
            amount,
            unit: ingredient.unit,
            notes: '',
            timestamp: Timestamp.now(),
            checked: false,
            status: 'shopping' // Default status
        });
    });

    await batch.commit();
};

// Move checked items to the food list (pantry)
export const moveItemsToFoodList = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const itemsRef = collection(db, 'checklists');
    const q = query(itemsRef, where('userId', '==', user.uid), where('status', '==', 'shopping'), where('checked', '==', true));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach(document => {
        const docRef = doc(db, 'checklists', document.id);
        batch.update(docRef, { status: 'pantry', checked: false });
    });

    await batch.commit();
};

// Toggle an item's 'checked' status
export const toggleChecklistItem = async (itemId, checked) => {
    const itemRef = doc(db, 'checklists', itemId);
    await updateDoc(itemRef, { checked });
};

// Delete a single checklist item
export const deleteChecklistItem = async (itemId) => {
    const itemRef = doc(db, 'checklists', itemId);
    await deleteDoc(itemRef);
};

// Clear all checked items from the shopping list
export const clearCheckedShoppingItems = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const itemsRef = collection(db, 'checklists');
    const q = query(itemsRef, where('userId', '==', user.uid), where('status', '==', 'shopping'), where('checked', '==', true));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach(document => {
        batch.delete(document.ref);
    });

    await batch.commit();
}; 