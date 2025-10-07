import React from 'react';
import { View, Button, Alert } from 'react-native';
import { migrateImages } from '~/utils/uploadImage';

export default function MigrateImagesScreen() {
    const handleMigrate = async () => {
        try {
            await migrateImages();
            Alert.alert('Migration complete!');
        } catch (error) {
            Alert.alert('Migration failed', error instanceof Error ? error.message : 'Unknown error');
        }
    };

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Button title="Migrate Recipe Images" onPress={handleMigrate} />
        </View>
    );
}
