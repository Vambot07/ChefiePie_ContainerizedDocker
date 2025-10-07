import { View, Text, TouchableOpacity, TextInput, ScrollView, Image, Alert, RefreshControl } from 'react-native'
import React, { useState, useEffect } from 'react'
import { Entypo, Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AntDesign from '@expo/vector-icons/AntDesign';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { searchRecipes } from '~/controller/recipe';
import Header from '../../components/Header';

// Add navigation type
type RootStackParamList = {
    AddRecipe: undefined;
    ViewRecipe: { recipe: Recipe };
};
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Recipe {
    id: string;
    title: string;
    image: string;
    totalTime?: string;
    difficulty?: string;
}



const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert('Camera permission is required!');
        return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 1 });
    if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log(result.assets[0].uri);
    }
};

interface RecipeCardProps {
    recipe: Recipe;
    navigation: NavigationProp;
}

const RecipeCard = ({ recipe, navigation }: RecipeCardProps) => (
    <TouchableOpacity className="bg-white rounded-xl shadow-sm mb-4 w-[48%]" onPress={() => navigation.navigate('ViewRecipe', { recipe })}>
        <Image
            source={{ uri: recipe.image }}
            className="w-full h-32 rounded-t-xl"
        />
        <View className="p-3">
            <Text className="font-semibold text-gray-800 mb-1">{recipe.title}</Text>
            <View className="flex-row justify-between">
                <Text className="text-gray-500 text-sm">{recipe.totalTime || ''}</Text>
                <Text className="text-gray-500 text-sm">{recipe.difficulty || ''}</Text>
            </View>
        </View>
    </TouchableOpacity>
);

export default function SearchScreen() {
    const [searchQuery, setSearchQuery] = useState('');
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const navigation = useNavigation<NavigationProp>();

    const fetchRecipes = async () => {
        try {
            const results = await searchRecipes(searchQuery);
            setRecipes(results as Recipe[]);
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch recipes');
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchRecipes();
    }, [searchQuery]);

    // Refresh recipes when screen comes into focus (e.g., after deleting a recipe)
    useFocusEffect(
        React.useCallback(() => {
            fetchRecipes();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchRecipes();
    };

    const clearSearch = () => {
        setSearchQuery('');
        fetchRecipes();
    };

    return (
        <View className="flex-1 bg-gray-50">
            <Header
                title="Search Recipes"
                showBackButton={false}
                onBack={() => navigation.goBack()}
            />

            {/* Search Bar */}
            <View className="bg-white border-b border-gray-100">
                <View className="flex-row items-center px-4">
                    <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2 flex-1 mr-3">
                        <Ionicons name="search" size={18} color="#FF9966" />
                        <TextInput
                            className="flex-1 ml-4 py-2"
                            placeholder="Search recipes..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 ? (
                            <TouchableOpacity onPress={clearSearch}>
                                <Ionicons name="close" size={18} color="#FF9966" />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={takePhoto}>
                                <Entypo name="camera" size={18} color="#FF9966" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity
                        className="w-10 h-10 items-center justify-center rounded-xl bg-gray-100"
                        onPress={() => navigation.navigate('AddRecipe')}
                    >
                        <AntDesign name="plussquareo" size={24} color="#FF9966" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Recipe Grid */}
            <ScrollView
                className="flex-1 bg-lightPeach px-4 pt-4"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <View className="flex-row flex-wrap justify-between">
                    {recipes.map((recipe) => (
                        <RecipeCard key={recipe.id} recipe={recipe} navigation={navigation} />
                    ))}
                </View>
            </ScrollView>
        </View>
    )
}