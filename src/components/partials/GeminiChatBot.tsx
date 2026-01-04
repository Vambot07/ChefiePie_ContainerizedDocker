import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Animated, Image } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { sendChatMessage } from '~/api/gemini/chatService';
import Markdown from 'react-native-markdown-display';
import UnsplashImage from './UnsplashImage';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
}

const GeminiChatbot = () => {
    // Custom markdown rules to properly render images
    const markdownRules = {
        image: (node: any, children: any, parent: any, styles: any) => {
            // The src is in node.attributes.src for react-native-markdown-display
            const imageUri = node.attributes?.src || '';
            const altText = node.attributes?.alt || 'Recipe Image';

            console.log('🖼️ Rendering image:', imageUri); // Debug log

            // Check if it's an Unsplash Source URL (now deprecated, so we handle it with our custom component)
            if (imageUri.includes('source.unsplash.com')) {
                // Extract query from URL like: https://source.unsplash.com/800x600/?chicken-rice,asian-food
                const urlParts = imageUri.split('?');
                const query = urlParts[1] || 'food';

                console.log('🔄 Using Unsplash API for query:', query);

                return (
                    <UnsplashImage
                        key={node.key}
                        query={query}
                        alt={altText}
                        style={styles.image}
                    />
                );
            }

            // For regular image URLs, use standard Image component
            return (
                <Image
                    key={node.key}
                    source={{ uri: imageUri }}
                    style={styles.image}
                    resizeMode="cover"
                    onError={(error) => console.error('❌ Image load error:', error.nativeEvent.error)}
                    onLoad={() => console.log('✅ Image loaded successfully:', imageUri)}
                />
            );
        },
    };

    const [messages, setMessages] = useState<Message[]>([
        {
            id: '0',
            text: "👋 Hi! I'm your ChefiePie Assistant. Ask me anything about cooking, recipes, ingredients, or food!",
            sender: 'bot',
            timestamp: new Date(),
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    // Wait for fonts to load
    if (!fontsLoaded) {
        return (
            <View className="flex-1 items-center justify-center bg-[#FF9966]">
                <ActivityIndicator size="large" color="white" />
            </View>
        );
    }

    const sendMessage = async () => {
        if (!inputText.trim() || loading) return;

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
            // Build conversation history (last 5 messages)
            const history = messages
                .slice(-5)
                .map(msg => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
                .join('\n\n');

            console.log('📤 Sending to Gemini AI...');

            const response = await sendChatMessage(currentInput, history);

            if (response.success) {
                const botMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    text: response.message,
                    sender: 'bot',
                    timestamp: new Date(),
                };

                setMessages(prev => [...prev, botMessage]);
            } else {
                throw new Error(response.error || 'Failed to get response');
            }
        } catch (error) {
            console.error('Error sending message:', error);

            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: '⚠️ Sorry, I encountered an error. Please try again.',
                sender: 'bot',
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const quickSuggestions = [
        { icon: '🍗', text: "What can I make with chicken and rice?", color: '#FFE5B4' },
        { icon: '🍝', text: "How to make pasta from scratch?", color: '#FFE4E1' },
        { icon: '🥚', text: "Substitute for eggs in baking", color: '#FFF9E6' },
        { icon: '🍚', text: "Tips for perfect fried rice", color: '#E8F5E9' },
    ];

    const handleSuggestion = (suggestion: string) => {
        setInputText(suggestion);
    };

    // ✅ Fixed MessageBubble - Won't re-animate on parent re-renders
    const MessageBubble = ({
        message,
        shouldAnimate
    }: {
        message: Message;
        shouldAnimate: boolean;
    }) => {
        const fadeAnim = useRef(new Animated.Value(shouldAnimate ? 0 : 1)).current;
        const slideAnim = useRef(new Animated.Value(
            shouldAnimate ? (message.sender === 'user' ? 30 : -30) : 0
        )).current;

        // Track if animation has already run
        const hasAnimated = useRef(false);

        useEffect(() => {
            // Only animate ONCE when component first mounts
            if (shouldAnimate && !hasAnimated.current) {
                hasAnimated.current = true; // Mark as animated

                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        tension: 80,
                        friction: 8,
                        useNativeDriver: true,
                    }),
                ]).start();
            } else if (!shouldAnimate && !hasAnimated.current) {
                // If shouldn't animate, just set values immediately
                fadeAnim.setValue(1);
                slideAnim.setValue(0);
                hasAnimated.current = true;
            }
        }, []); // Empty dependency array - only run on mount!

        return (
            <Animated.View
                style={{
                    opacity: fadeAnim,
                    transform: [{ translateX: slideAnim }],
                }}
                className={`mb-5 ${message.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
                <View className={`flex-row items-end gap-2 max-w-[85%] ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <View className={`w-8 h-8 rounded-full items-center justify-center ${message.sender === 'user' ? 'bg-[#FF9966]' : 'bg-white border-2 border-orange-200'
                        }`}>
                        {message.sender === 'user' ? (
                            <Ionicons name="person" size={16} color="white" />
                        ) : (
                            <MaterialCommunityIcons name="chef-hat" size={18} color="#FF9966" />
                        )}
                    </View>

                    {/* Message Bubble */}
                    <View
                        className={`p-4 rounded-3xl ${message.sender === 'user'
                            ? 'bg-[#FF9966] rounded-br-md'
                            : 'bg-white rounded-bl-md'
                            }`}
                        style={{
                            shadowColor: message.sender === 'user' ? '#FF9966' : '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: message.sender === 'user' ? 0.3 : 0.1,
                            shadowRadius: 6,
                            elevation: 3,
                        }}
                    >

                        <Markdown
                            rules={markdownRules}
                            style={{
                                body: {
                                    color: message.sender === 'user' ? '#FFFFFF' : '#1F2937',
                                    fontSize: 16,
                                    lineHeight: 28,
                                    fontFamily: Platform.select({
                                        ios: 'System',
                                        android: 'Roboto',
                                        default: 'System',
                                    }),
                                },
                                paragraph: {
                                    marginTop: 8,
                                    marginBottom: 8,
                                    lineHeight: 28,
                                },
                                heading1: {
                                    fontSize: 24,
                                    fontWeight: 'bold',
                                    marginTop: 16,
                                    marginBottom: 12,
                                    color: message.sender === 'user' ? '#FFFFFF' : '#1F2937',
                                },
                                heading2: {
                                    fontSize: 20,
                                    fontWeight: 'bold',
                                    marginTop: 14,
                                    marginBottom: 10,
                                    color: message.sender === 'user' ? '#FFFFFF' : '#1F2937',
                                },
                                heading3: {
                                    fontSize: 18,
                                    fontWeight: 'bold',
                                    marginTop: 12,
                                    marginBottom: 8,
                                    color: message.sender === 'user' ? '#FFFFFF' : '#1F2937',
                                },
                                strong: {
                                    fontWeight: 'bold',
                                    marginVertical: 2,
                                },
                                em: {
                                    fontStyle: 'italic',
                                },
                                image: {
                                    width: 220,
                                    height: 160,
                                    borderRadius: 12,
                                    marginVertical: 12,
                                    backgroundColor: '#F3F4F6',
                                    borderWidth: 2,
                                    borderColor: message.sender === 'user' ? 'rgba(255,255,255,0.3)' : '#E5E7EB',
                                },
                                code_inline: {
                                    backgroundColor: message.sender === 'user' ? 'rgba(255,255,255,0.2)' : '#F3F4F6',
                                    color: message.sender === 'user' ? '#FFFFFF' : '#EF4444',
                                    paddingHorizontal: 4,
                                    paddingVertical: 2,
                                    borderRadius: 4,
                                    fontFamily: Platform.select({
                                        ios: 'Courier',
                                        android: 'monospace',
                                        default: 'monospace',
                                    }),
                                },
                                code_block: {
                                    backgroundColor: message.sender === 'user' ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
                                    padding: 10,
                                    borderRadius: 8,
                                    marginVertical: 12,
                                    fontFamily: Platform.select({
                                        ios: 'Courier',
                                        android: 'monospace',
                                        default: 'monospace',
                                    }),
                                },
                                bullet_list: {
                                    marginVertical: 12,
                                    paddingLeft: 4,
                                },
                                ordered_list: {
                                    marginVertical: 12,
                                    paddingLeft: 4,
                                },
                                list_item: {
                                    marginVertical: 14,
                                    lineHeight: 28,
                                    paddingBottom: 4,
                                },
                            }}
                        >
                            {message.text}
                        </Markdown>

                        <Text
                            className={`text-xs mt-2 ${message.sender === 'user' ? 'text-white/70' : 'text-gray-400'
                                }`}
                        >
                            {message.timestamp.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </Text>
                    </View>
                </View>
            </Animated.View>
        );
    };

    // Typing Indicator with Animation
    const TypingIndicator = () => {
        const dot1 = useRef(new Animated.Value(0)).current;
        const dot2 = useRef(new Animated.Value(0)).current;
        const dot3 = useRef(new Animated.Value(0)).current;

        useEffect(() => {
            const animate = (dot: Animated.Value, delay: number) => {
                Animated.loop(
                    Animated.sequence([
                        Animated.delay(delay),
                        Animated.timing(dot, {
                            toValue: -6,
                            duration: 400,
                            useNativeDriver: true,
                        }),
                        Animated.timing(dot, {
                            toValue: 0,
                            duration: 400,
                            useNativeDriver: true,
                        }),
                    ])
                ).start();
            };

            animate(dot1, 0);
            animate(dot2, 150);
            animate(dot3, 300);
        }, []);

        return (
            <View className="items-start mb-5">
                <View className="flex-row items-end gap-2">
                    <View className="w-8 h-8 rounded-full bg-white border-2 border-orange-200 items-center justify-center">
                        <MaterialCommunityIcons name="chef-hat" size={18} color="#FF9966" />
                    </View>
                    <View className="bg-white p-4 rounded-3xl rounded-bl-md" style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 6,
                        elevation: 3,
                    }}>
                        <View className="flex-row gap-2">
                            <Animated.View
                                style={{ transform: [{ translateY: dot1 }] }}
                                className="w-2 h-2 rounded-full bg-orange-400"
                            />
                            <Animated.View
                                style={{ transform: [{ translateY: dot2 }] }}
                                className="w-2 h-2 rounded-full bg-orange-400"
                            />
                            <Animated.View
                                style={{ transform: [{ translateY: dot3 }] }}
                                className="w-2 h-2 rounded-full bg-orange-400"
                            />
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            {/* Beautiful Header */}
            <View
                className="bg-[#FF9966] pt-12 pb-6 px-5"
                style={{
                    shadowColor: '#FF9966',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 8,
                }}
            >
                <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                        <View className="flex-row items-center gap-2 mb-1">
                            <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
                                <MaterialCommunityIcons name="chef-hat" size={24} color="white" />
                            </View>
                            <Text style={{ fontFamily: 'ArchivoBlack_400Regular', fontSize: 24, color: 'white' }}>
                                ChefiePie AI 🍳
                            </Text>
                        </View>
                        <View className="flex-row items-center ml-12">
                            <View className="w-2 h-2 rounded-full bg-green-300 mr-2" />
                            <Text className="text-white/90 text-sm">Online • Ready to help</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Messages */}
            <ScrollView
                ref={scrollViewRef}
                className="flex-1 px-4 pt-6"
                style={{ backgroundColor: '#FFF9F5' }}
                contentContainerStyle={{ paddingBottom: 20 }}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {messages.map((message, index) => (
                    <MessageBubble
                        key={message.id}
                        message={message}
                        shouldAnimate={
                            // Don't animate while user is typing
                            inputText.length === 0 &&
                            // Only animate the latest message
                            index === messages.length - 1
                        }
                    />
                ))}

                {loading && <TypingIndicator />}

                {/* Beautiful Quick Suggestions */}
                {messages.length === 1 && !loading && (
                    <View className="mt-6">
                        <Text className="text-gray-700 text-base mb-4 font-bold">
                            ✨ Popular Questions
                        </Text>
                        <View className="gap-3">
                            {quickSuggestions.map((suggestion, index) => (
                                <TouchableOpacity
                                    key={index}
                                    className="bg-white rounded-2xl p-4 flex-row items-center"
                                    onPress={() => handleSuggestion(suggestion.text)}
                                    style={{
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.08,
                                        shadowRadius: 8,
                                        elevation: 2,
                                    }}
                                >
                                    <View
                                        className="w-12 h-12 rounded-full items-center justify-center mr-3"
                                        style={{ backgroundColor: suggestion.color }}
                                    >
                                        <Text className="text-2xl">{suggestion.icon}</Text>
                                    </View>
                                    <Text className="text-gray-800 text-base font-medium flex-1">
                                        {suggestion.text}
                                    </Text>
                                    <Ionicons name="chevron-forward" size={20} color="#FF9966" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Beautiful Input Section */}
            <View className="bg-white px-4 py-4 border-t border-gray-100"
                style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 8,
                }}
            >
                <View className="flex-row items-center gap-3">
                    <View
                        className="flex-1 bg-gray-50 rounded-full px-5 flex-row items-center border border-gray-200"
                        style={{ height: 52 }}
                    >
                        <TextInput
                            className="flex-1 text-base text-gray-800"
                            placeholder="Ask me anything about cooking..."
                            placeholderTextColor="#9CA3AF"
                            value={inputText}
                            onChangeText={setInputText}
                            onSubmitEditing={sendMessage}
                            returnKeyType="send"
                            editable={!loading}
                            multiline={false}
                            maxLength={500}
                        />
                        {inputText.length > 0 && (
                            <Text className="text-xs text-gray-400 ml-2 font-medium">
                                {inputText.length}/500
                            </Text>
                        )}
                    </View>

                    <TouchableOpacity
                        className={`w-14 h-14 rounded-full items-center justify-center ${inputText.trim() && !loading ? 'bg-[#FF9966]' : 'bg-gray-300'
                            }`}
                        onPress={sendMessage}
                        disabled={!inputText.trim() || loading}
                        style={{
                            shadowColor: inputText.trim() && !loading ? '#FF9966' : '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 6,
                            elevation: 5,
                            transform: [{ scale: inputText.trim() && !loading ? 1 : 0.9 }]
                        }}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Ionicons name="send" size={22} color="white" />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Quick Action Chips */}
                <View className="flex-row gap-2 mt-3">
                    <TouchableOpacity
                        className="bg-orange-50 border border-orange-200 rounded-full px-4 py-2.5 flex-row items-center flex-1"
                        onPress={() => setInputText("What's a quick recipe for dinner?")}
                        disabled={loading}
                    >
                        <MaterialCommunityIcons name="clock-fast" size={16} color="#FF9966" />
                        <Text className="text-orange-600 text-sm font-semibold ml-2">Quick Recipe</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="bg-purple-50 border border-purple-200 rounded-full px-4 py-2.5 flex-row items-center flex-1"
                        onPress={() => setInputText("Give me cooking tips")}
                        disabled={loading}
                    >
                        <Ionicons name="bulb" size={16} color="#9333EA" />
                        <Text className="text-purple-600 text-sm font-semibold ml-2">Get Tips</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

export default GeminiChatbot;