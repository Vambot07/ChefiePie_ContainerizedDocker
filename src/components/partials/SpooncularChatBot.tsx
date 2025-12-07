import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Linking, Alert } from 'react-native';
import { useState, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NavigationProps } from '~/navigation/AppStack';
import { fetchRecipeById } from '~/api/spoonacular';

interface Recipe {
    id: string;
    title: string;
    image: string;
    readyInMinutes?: number;
    servings?: number;
    link?: string;
}

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
    media?: {
        type: 'image' | 'link';
        url: string;
        title?: string;
    };
    recipes?: Recipe[];
}

const SpoonacularChatbot = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [contextId, setContextId] = useState<string | null>(null);
    const [loadingRecipe, setLoadingRecipe] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);
    const navigation = useNavigation<NavigationProps>();

    const SPOONACULAR_API_KEY = process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY;

    const sendMessage = async () => {
        if (!inputText.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: inputText,
            sender: 'user',
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        const currentInput = inputText;
        setInputText('');
        setLoading(true);

        try {
            const url = `https://api.spoonacular.com/food/converse?apiKey=${SPOONACULAR_API_KEY}&text=${encodeURIComponent(currentInput)}${contextId ? `&contextId=${contextId}` : ''}`;

            console.log('📡 Calling Spoonacular API...');

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            console.log('Spoonacular response:', data);

            if (data.status === 'failure' || data.code === 401) {
                throw new Error(data.message || 'API authentication failed');
            }

            if (data.contextId) {
                setContextId(data.contextId);
            }

            let mediaData = undefined;
            let recipesData: Recipe[] | undefined = undefined;

            if (data.media && data.media.length > 0) {
                const recipeMedia = data.media.filter((item: any) =>
                    item.image && item.title && item.link
                );

                if (recipeMedia.length > 0) {
                    const extractedRecipes: Recipe[] = recipeMedia.map((item: any, index: number) => {
                        // ✅ FIXED: Extract ID from URL - the ID is at the end after the last dash
                        const match = item.link.match(/-(\d+)$/);
                        const recipeId = match ? match[1] : null;

                        if (!recipeId) {
                            console.warn('⚠️ Could not extract recipe ID from:', item.link);
                        }

                        return {
                            id: recipeId || `recipe-${Date.now()}-${index}`,
                            title: item.title,
                            image: item.image,
                            readyInMinutes: item.readyInMinutes,
                            servings: item.servings,
                            link: item.link,
                        };
                    });

                    // Only keep recipes with valid IDs
                    recipesData = extractedRecipes.filter((recipe: Recipe) =>
                        recipe.id && !recipe.id.startsWith('recipe-')
                    );

                    console.log('✅ Extracted recipe IDs:', recipesData.map((r: Recipe) => r.id));
                } else {
                    const firstMedia = data.media[0];
                    if (firstMedia.image) {
                        mediaData = {
                            type: 'image' as const,
                            url: firstMedia.image,
                            title: firstMedia.title,
                        };
                    } else if (firstMedia.link) {
                        mediaData = {
                            type: 'link' as const,
                            url: firstMedia.link,
                            title: firstMedia.title,
                        };
                    }
                }
            }

            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: data.answerText || data.text || 'I\'m not sure how to respond to that.',
                sender: 'bot',
                timestamp: new Date(),
                media: mediaData,
                recipes: recipesData,
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error('Error calling Spoonacular chat:', error);

            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: error instanceof Error && error.message.includes('authorized')
                    ? '⚠️ API Key Error: Please check your Spoonacular API key in the code.'
                    : 'Sorry, I encountered an error. Please try again.',
                sender: 'bot',
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleLinkPress = async (url: string) => {
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                console.error("Can't open URL:", url);
            }
        } catch (error) {
            console.error('Error opening link:', error);
        }
    };

    const handleRecipePress = async (recipe: Recipe) => {
        console.log('📖 Fetching full recipe details for:', recipe.title, 'ID:', recipe.id);

        if (!recipe.id || recipe.id.startsWith('recipe-')) {
            Alert.alert(
                'Invalid Recipe',
                'This recipe doesn\'t have a valid ID. Please try another recipe.',
                [{ text: 'OK' }]
            );
            return;
        }

        setLoadingRecipe(true);

        try {
            const fullRecipe = await fetchRecipeById(recipe.id);

            if (!fullRecipe) {
                throw new Error('Failed to fetch recipe details');
            }

            console.log('✅ Full recipe data:', fullRecipe);

            const completeRecipe = {
                id: fullRecipe.id?.toString() || recipe.id,
                title: fullRecipe.title || recipe.title,
                image: fullRecipe.image || recipe.image,
                totalTime: fullRecipe.readyInMinutes?.toString() || '30',
                time: fullRecipe.readyInMinutes?.toString() || '30',
                difficulty: '',
                source: 'api' as const,
                servings: fullRecipe.servings || 4,
                serving: fullRecipe.servings?.toString() || '4',
                ingredients: fullRecipe.extendedIngredients?.map((ing: any) => ({
                    name: ing.name || ing.original,
                    amount: ing.amount?.toString() || '',
                    unit: ing.unit || ''
                })) || [],
                items: fullRecipe.extendedIngredients?.length || 0,
                steps: fullRecipe.analyzedInstructions?.[0]?.steps?.map((step: any, idx: number) => ({
                    title: `Step ${idx + 1}`,
                    details: step.step,
                    time: ''
                })) || [],
                instructions: fullRecipe.instructions ||
                    fullRecipe.analyzedInstructions?.[0]?.steps?.map((step: any, idx: number) =>
                        `${idx + 1}. ${step.step}`
                    ).join('\n\n') || 'No instructions available',
                intro: fullRecipe.summary?.replace(/<[^>]*>/g, '').substring(0, 200) + '...' || '',
                summary: fullRecipe.summary || '',
                cuisines: fullRecipe.cuisines || [],
                dishTypes: fullRecipe.dishTypes || [],
                diets: fullRecipe.diets || [],
                sourceUrl: fullRecipe.sourceUrl || null,
            };

            console.log('🍽️ Complete recipe ready for navigation:', completeRecipe.title);
            console.log('📊 Recipe data structure:', {
                id: completeRecipe.id,
                title: completeRecipe.title,
                source: completeRecipe.source,
                hasIngredients: completeRecipe.ingredients.length > 0,
                hasSteps: completeRecipe.steps.length > 0,
            });

            navigation.navigate('ViewRecipe', {
                recipe: completeRecipe,
                viewMode: 'discover'
            });
        } catch (error) {
            console.error('❌ Error fetching recipe details:', error);

            Alert.alert(
                'Error',
                'Failed to load recipe details. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setLoadingRecipe(false);
        }
    };

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-white"
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            {/* Header */}
            <View className="bg-[#FF9966] p-4 pt-12">
                <Text className="text-white text-xl font-bold">Food Assistant</Text>
                <Text className="text-white/80 text-sm">Ask me anything about food!</Text>
            </View>

            {/* Messages */}
            <ScrollView
                ref={scrollViewRef}
                className="flex-1 p-4"
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                showsVerticalScrollIndicator={false}
            >
                {messages.length === 0 && (
                    <View className="items-center justify-center mt-20">
                        <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
                        <Text className="text-gray-400 text-center mt-4 px-8">
                            Start a conversation!{'\n\n'}
                            Try asking:{'\n'}
                            "What can I make with chicken?"{'\n'}
                            "Show me 5 pasta recipes"{'\n'}
                            "I want easy dessert ideas"
                        </Text>
                    </View>
                )}

                {messages.map((message) => (
                    <View
                        key={message.id}
                        className={`mb-3 ${message.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                        <View
                            className={`${message.recipes ? 'w-full' : 'max-w-[80%]'} rounded-2xl ${message.sender === 'user'
                                ? 'bg-[#FF9966] rounded-br-sm'
                                : 'bg-gray-200 rounded-bl-sm'
                                }`}
                        >
                            {/* Text Content */}
                            <View className="p-3">
                                <Text
                                    className={`text-base ${message.sender === 'user' ? 'text-white' : 'text-gray-800'
                                        }`}
                                >
                                    {message.text}
                                </Text>
                            </View>

                            {/* Recipes List (Horizontal Scroll) */}
                            {message.recipes && message.recipes.length > 0 && (
                                <View className="pb-3">
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={{ paddingHorizontal: 12 }}
                                    >
                                        {message.recipes.map((recipe) => (
                                            <TouchableOpacity
                                                key={recipe.id}
                                                className="w-40 mr-3 bg-white rounded-xl overflow-hidden"
                                                style={{
                                                    shadowColor: '#000',
                                                    shadowOffset: { width: 0, height: 2 },
                                                    shadowOpacity: 0.1,
                                                    shadowRadius: 4,
                                                    elevation: 3,
                                                }}
                                                onPress={() => handleRecipePress(recipe)}
                                                disabled={loadingRecipe}
                                                activeOpacity={0.7}
                                            >
                                                {/* Recipe Image */}
                                                <Image
                                                    source={{ uri: recipe.image }}
                                                    className="w-full h-32"
                                                    resizeMode="cover"
                                                />

                                                {/* Recipe Details */}
                                                <View className="p-2">
                                                    <Text
                                                        className="text-gray-800 font-semibold text-sm"
                                                        numberOfLines={2}
                                                    >
                                                        {recipe.title}
                                                    </Text>

                                                    {/* Time & Servings */}
                                                    <View className="flex-row items-center mt-2">
                                                        {recipe.readyInMinutes && (
                                                            <View className="flex-row items-center mr-3">
                                                                <Ionicons name="time-outline" size={14} color="#666" />
                                                                <Text className="text-xs text-gray-600 ml-1">
                                                                    {recipe.readyInMinutes}m
                                                                </Text>
                                                            </View>
                                                        )}
                                                        {recipe.servings && (
                                                            <View className="flex-row items-center">
                                                                <Ionicons name="people-outline" size={14} color="#666" />
                                                                <Text className="text-xs text-gray-600 ml-1">
                                                                    {recipe.servings}
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                </View>

                                                {/* View Recipe Button */}
                                                <View className="bg-[#FF9966] py-2 items-center">
                                                    <Text className="text-white text-xs font-semibold">
                                                        View Recipe
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>

                                    {/* Recipe Count */}
                                    <Text className="text-xs text-gray-500 text-center mt-2">
                                        {message.recipes.length} recipe{message.recipes.length !== 1 ? 's' : ''} found • Tap to view details
                                    </Text>
                                </View>
                            )}

                            {/* Single Media Content (Image) */}
                            {message.media && message.media.type === 'image' && !message.recipes && (
                                <View className="overflow-hidden rounded-b-2xl">
                                    <Image
                                        source={{ uri: message.media.url }}
                                        className="w-full h-48"
                                        resizeMode="cover"
                                    />
                                    {message.media.title && (
                                        <View className="bg-black/50 absolute bottom-0 left-0 right-0 p-2">
                                            <Text className="text-white text-sm font-semibold">
                                                {message.media.title}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* Link Content */}
                            {message.media && message.media.type === 'link' && (
                                <TouchableOpacity
                                    className="border-t border-gray-300 p-3 flex-row items-center"
                                    onPress={() => handleLinkPress(message.media!.url)}
                                >
                                    <Ionicons name="link" size={20} color="#FF9966" />
                                    <Text className="text-[#FF9966] ml-2 flex-1" numberOfLines={1}>
                                        {message.media.title || 'View Link'}
                                    </Text>
                                    <Ionicons name="chevron-forward" size={20} color="#FF9966" />
                                </TouchableOpacity>
                            )}
                        </View>

                        <Text className="text-xs text-gray-400 mt-1 px-2">
                            {message.timestamp.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </Text>
                    </View>
                ))}

                {loading && (
                    <View className="items-start mb-3">
                        <View className="bg-gray-200 p-3 rounded-2xl rounded-bl-sm">
                            <ActivityIndicator size="small" color="#FF9966" />
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Loading Recipe Overlay */}
            {loadingRecipe && (
                <View
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 999,
                    }}
                >
                    <View className="bg-white rounded-3xl p-8 items-center min-w-[200px]">
                        <ActivityIndicator size="large" color="#FF9966" />
                        <Text className="text-gray-800 font-semibold mt-4 text-center">
                            Loading recipe details...
                        </Text>
                    </View>
                </View>
            )}

            {/* Input */}
            <View className="border-t border-gray-200 p-4 bg-white">
                <View className="flex-row items-center gap-2">
                    <TextInput
                        className="flex-1 bg-gray-100 rounded-full px-4 py-3 text-base"
                        placeholder="Ask about recipes, ingredients..."
                        value={inputText}
                        onChangeText={setInputText}
                        onSubmitEditing={sendMessage}
                        returnKeyType="send"
                        editable={!loading}
                    />
                    <TouchableOpacity
                        className={`w-12 h-12 rounded-full items-center justify-center ${inputText.trim() && !loading ? 'bg-[#FF9966]' : 'bg-gray-300'
                            }`}
                        onPress={sendMessage}
                        disabled={!inputText.trim() || loading}
                    >
                        <Ionicons
                            name="send"
                            size={20}
                            color="white"
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

export default SpoonacularChatbot;