import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Linking, Vibration, Platform, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { getRecipeById, unsaveRecipe, isRecipeSaved } from '../../../controller/recipe';
import { addItemsToChecklist } from '../../../controller/checklist';
import Header from '../../../components/Header';
import * as Speech from 'expo-speech';
import {
    ExpoSpeechRecognitionModule,
    useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

const ViewSavedRecipeScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { recipeId } = route.params as { recipeId: string };

    const [recipe, setRecipe] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [isSaved, setIsSaved] = useState<boolean>(true);
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [tab, setTab] = useState<'ingredient' | 'procedure'>('ingredient');
    const [selectedIngredients, setSelectedIngredients] = useState<any[]>([]);
    const [voiceMode, setVoiceMode] = useState<boolean>(false);
    const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
    const [overlaySize, setOverlaySize] = useState({ w: 0, h: 0 });

    // Voice Assistant States
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [isListening, setIsListening] = useState<boolean>(false);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [isSpeaking, setIsSpeaking] = useState<boolean>(false); // NEW: Track speaking state
    const [timerActive, setTimerActive] = useState<boolean>(false);
    const [timerMinutes, setTimerMinutes] = useState<number>(0);
    const [recognizedText, setRecognizedText] = useState<string>('');

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);
    const voiceModeRef = useRef<boolean>(false);

    const shadowStyle = Platform.select({
        android: { elevation: 3 },
        ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.18,
            shadowRadius: 1.00,
        },
    });

    // Sync voiceMode with ref
    useEffect(() => {
        voiceModeRef.current = voiceMode;
    }, [voiceMode]);

    // Helper function to cleanup voice assistant
    const cleanupVoiceAssistant = useCallback(() => {
        console.log('🧹 Cleaning up voice assistant...');

        try {
            // Stop speech recognition
            try {
                ExpoSpeechRecognitionModule.stop();
            } catch (err) {
                console.log('Stop recognition error (expected):', err);
            }

            // Stop text-to-speech
            Speech.stop();

            // Clear timer
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }

            console.log('✅ Voice assistant cleanup complete');
        } catch (error) {
            console.error('❌ Error during cleanup:', error);
        }
    }, []);

    // Handle screen blur (navigation away)
    useEffect(() => {
        const unsubscribe = navigation.addListener('blur', () => {
            console.log('📱 Screen blur detected');
            if (voiceMode) {
                cleanupVoiceAssistant();
                setVoiceMode(false);
                setIsListening(false);
                setIsPaused(false);
                setIsSpeaking(false);
            }
        });

        return unsubscribe;
    }, [navigation, voiceMode, cleanupVoiceAssistant]);

    // Handle Android back button
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (voiceMode) {
                console.log('⬅️ Back button pressed with voice mode active');
                cleanupVoiceAssistant();
                setVoiceMode(false);
                setIsListening(false);
                setIsSpeaking(false);
                // Don't block navigation
                return false;
            }
            return false;
        });

        return () => backHandler.remove();
    }, [voiceMode, cleanupVoiceAssistant]);

    // Handle component unmount (final cleanup)
    useEffect(() => {
        return () => {
            console.log('💀 Component unmounting');
            if (voiceModeRef.current) {
                console.log('🛑 Force stopping voice assistant on unmount');
                try {
                    ExpoSpeechRecognitionModule.stop();
                } catch (err) {
                    console.log('Stop error on unmount:', err);
                }
                Speech.stop();
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                }
            }
        };
    }, []);

    // Result event - processes commands
    useSpeechRecognitionEvent('result', (event) => {
        const transcript = event.results[0]?.transcript.toLowerCase();

        // IGNORE recognition while app is speaking (prevents echo)
        if (isSpeaking) {
            console.log('🔇 Ignoring recognition - app is speaking');
            return;
        }

        if (transcript) {
            console.log('✅ Valid command received:', transcript);
            setRecognizedText(transcript);
            handleVoiceCommand(transcript);
        }
    });

    // End event - rarely fires with continuous mode
    useSpeechRecognitionEvent('end', () => {
        console.log('Speech recognition ended unexpectedly');
        // Only restart if not speaking and still in voice mode
        if (voiceMode && !isPaused && !isSpeaking) {
            setTimeout(() => startListening(), 500);
        }
    });

    // Speech Recognition Event: Error Handler
    useSpeechRecognitionEvent('error', (event) => {
        console.log('Speech recognition error:', event.error);

        // Silently ignore "no-speech" and "client" errors - just auto-restart
        if (event.error === 'no-speech' || event.error === 'client') {
            console.log('No speech/client error, restarting...');
            if (voiceMode && !isPaused && !isSpeaking) {
                setTimeout(() => startListening(), 1000);
            }
            return; // Don't change UI state for silent periods
        }

        // Handle actual errors that require user attention
        switch (event.error) {
            case 'network':
                Alert.alert('Network Error', 'Please check your internet connection');
                break;
            case 'not-allowed':
                Alert.alert('Permission Denied', 'Microphone access is required for voice commands');
                break;
            case 'audio-capture':
                Alert.alert('Microphone Error', 'Could not access microphone');
                break;
        }

        setIsListening(false);
    });

    // Fetch recipe details on screen focus
    useFocusEffect(
        useCallback(() => {
            const fetchRecipeDetails = async () => {
                if (!recipeId) {
                    Alert.alert('Error', 'No recipe ID found.');
                    navigation.goBack();
                    return;
                }
                setLoading(true);
                try {
                    console.log('Fetching recipe with ID:', recipeId);
                    const recipeData = await getRecipeById(recipeId);
                    console.log('Fetched recipe data:', recipeData);
                    const cleanedIntro = recipeData.intro?.replace(/<[^>]+>/g, '') || '';
                    const recipeToSet = {
                        ...recipeData,
                        intro: cleanedIntro,
                    };
                    setRecipe(recipeToSet);

                    const savedStatus = await isRecipeSaved(recipeId);
                    setIsSaved(savedStatus);
                } catch (error) {
                    Alert.alert('Error', 'Could not fetch recipe details.');
                    navigation.goBack();
                } finally {
                    setLoading(false);
                }
            };
            fetchRecipeDetails();
        }, [recipeId])
    );

    // Start listening with continuous mode
    const startListening = async () => {
        try {
            const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
            if (!result.granted) {
                Alert.alert('Permission Denied', 'Microphone permission is required');
                return;
            }

            await ExpoSpeechRecognitionModule.start({
                lang: 'en-US',
                interimResults: false,
                maxAlternatives: 1,
                continuous: true, // Keep continuous for better UX
                requiresOnDeviceRecognition: false,
                addsPunctuation: false,
                contextualStrings: ['next', 'previous', 'repeat', 'pause', 'stop', 'wait', 'timer', 'minutes'],
            });

            setIsListening(true);
            console.log('🎤 Started listening');
        } catch (error) {
            console.error('Error starting speech recognition:', error);
        }
    };

    const stopListening = () => {
        try {
            ExpoSpeechRecognitionModule.stop();
            setIsListening(false);
            console.log('🔇 Stopped listening');
        } catch (error) {
            console.error('Error stopping speech recognition:', error);
        }
    };

    // ⭐ UPDATED: Enhanced speak function with echo prevention
    const speak = (text: string) => {
        console.log('🔊 Speaking:', text.substring(0, 50) + '...');

        // Stop listening before speaking to prevent echo
        if (isListening) {
            stopListening();
        }

        setIsSpeaking(true);

        Speech.speak(text, {
            language: 'en-US',
            pitch: 1.0,
            rate: 0.5,

            onStart: () => {
                console.log('🔊 Speech started');
                setIsSpeaking(true);
            },

            onDone: () => {
                console.log('✅ Speech finished');
                setIsSpeaking(false);

                // Resume listening after speech is done (only if still in voice mode)
                if (voiceMode && !isPaused) {
                    setTimeout(() => {
                        console.log('🎤 Resuming listening after speech...');
                        startListening();
                    }, 500); // 500ms delay for natural feel
                }
            },

            onError: (error) => {
                console.error('❌ Speech error:', error);
                setIsSpeaking(false);

                // Still try to resume listening even if speech fails
                if (voiceMode && !isPaused) {
                    setTimeout(() => {
                        startListening();
                    }, 500);
                }
            },
        });
    };

    const startVoiceAssistant = () => {
        if (!recipe?.steps || recipe.steps.length === 0) {
            Alert.alert('No Steps', 'This recipe does not have cooking steps');
            return;
        }

        setVoiceMode(true);
        setTab('procedure');
        setCurrentStep(0);

        setTimeout(() => {
            const greeting = `Starting cooking assistant for ${recipe.title}. You have ${recipe.steps.length} steps. Say next to continue, previous to go back, repeat to hear again, or pause to stop listening. Let's begin`;
            speak(greeting);

            // Read first step after greeting (handled by speak's onDone callback chain)
            setTimeout(() => {
                readStep(0);
            }, 8000); // Adjust timing based on greeting length
        }, 1000);
    };

    const stopVoiceAssistant = () => {
        setVoiceMode(false);
        setIsPaused(false);
        stopListening();
        Speech.stop();
        setCurrentStep(0);
        setRecognizedText('');
        setIsSpeaking(false);
        speak('Cooking assistant stopped. Goodbye');
    };

    const handleVoiceCommand = (command: string) => {
        console.log('🎯 Voice command received:', command);

        if (command.includes('next') || command.includes('continue')) {
            goToNextStep();
        }
        else if (command.includes('previous') || command.includes('back')) {
            goToPreviousStep();
        }
        else if (command.includes('repeat') || command.includes('again')) {
            readCurrentStep();
        }
        else if (command.includes('pause')) {
            pauseAssistant();
        }
        else if (command.includes('resume')) {
            resumeAssistant();
        }
        else if (command.includes('stop') || command.includes('exit')) {
            stopVoiceAssistant();
        }
        else if (command.includes('wait') || command.includes('timer')) {
            const minutes = extractMinutes(command);
            if (minutes > 0) {
                startTimer(minutes);
            } else {
                speak('Sorry, I could not understand the time. Please say, for example, wait 5 minutes');
            }
        }
    };

    const extractMinutes = (command: string): number => {
        const match = command.match(/(\d+)\s*(minute|min)/i);
        return match ? parseInt(match[1]) : 0;
    };

    const startTimer = (minutes: number) => {
        setTimerMinutes(minutes);
        setTimerActive(true);
        speak(`Starting timer for ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);

        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        let remainingSeconds = minutes * 60;

        timerRef.current = setInterval(() => {
            remainingSeconds -= 1;

            if (remainingSeconds <= 0) {
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                }
                setTimerActive(false);
                Vibration.vibrate([500, 200, 500]);
                speak('Timer finished! Ready to continue cooking?');
            } else {
                setTimerMinutes(Math.ceil(remainingSeconds / 60));
            }
        }, 1000);
    };

    const goToNextStep = () => {
        if (!recipe?.steps || currentStep >= recipe.steps.length - 1) {
            speak('You have completed all steps! Cooking is done. Enjoy your meal!');
            return;
        }
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
        scrollToStep(nextStep);
        readStep(nextStep);
    };

    const goToPreviousStep = () => {
        if (currentStep <= 0) {
            speak('You are already at the first step');
            return;
        }
        const prevStep = currentStep - 1;
        setCurrentStep(prevStep);
        scrollToStep(prevStep);
        readStep(prevStep);
    };

    const readStep = (stepIndex: number) => {
        if (!recipe?.steps || !recipe.steps[stepIndex]) return;

        const step = recipe.steps[stepIndex];
        const stepNumber = stepIndex + 1;
        const totalSteps = recipe.steps.length;

        const announcement = `Step ${stepNumber} of ${totalSteps}. ${step.title || ''}. ${step.details}`;
        speak(announcement);
    };

    const readCurrentStep = () => {
        readStep(currentStep);
    };

    const scrollToStep = (stepIndex: number) => {
        if (tab !== 'procedure') {
            setTab('procedure');
        }
    };

    const pauseAssistant = () => {
        setIsPaused(true);
        stopListening();
        Speech.stop();
        setIsSpeaking(false);
        speak('Voice assistant paused. Say resume to continue');
    };

    const resumeAssistant = () => {
        setIsPaused(false);
        speak('Resuming voice assistant');
        // startListening will be called by speak's onDone callback
    };

    const handleUnsaveRecipe = async () => {
        if (!recipe) return;
        setLoadingAction('unsaving');
        try {
            await unsaveRecipe(recipe.id);
            setIsSaved(false);
            Alert.alert('Success', 'Recipe has been unsaved.', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to unsave recipe');
        } finally {
            setLoadingAction(null);
        }
    };

    const toggleIngredientSelection = (ingredient: any) => {
        setSelectedIngredients((currentSelected) => {
            const isIngredientSelected = currentSelected.some((item) => item.name === ingredient.name);
            if (isIngredientSelected) {
                return currentSelected.filter((item) => item.name !== ingredient.name);
            } else {
                return [...currentSelected, ingredient];
            }
        });
    };

    const handleAddSelectedToChecklist = async () => {
        if (selectedIngredients.length === 0) {
            Alert.alert('No Ingredients Selected', 'Please tap on ingredients to select them first.');
            return;
        }

        setLoadingAction('adding-to-list');
        try {
            await addItemsToChecklist(selectedIngredients);
            Alert.alert('Success!', 'Selected ingredients have been added to your shopping list.');
            setSelectedIngredients([]);
        } catch (error) {
            Alert.alert('Error', 'Could not add ingredients. Please try again.');
        } finally {
            setLoadingAction(null);
        }
    };

    const handleYouTubeLink = () => {
        if (!recipe?.youtube) {
            Alert.alert('No Video', 'This recipe does not have a video tutorial.');
            return;
        }
        Linking.openURL(recipe.youtube).catch(() => {
            Alert.alert('Error', 'Could not open the video link.');
        });
    };

    const handleSourceURL = () => {
        if (!recipe?.sourceUrl) {
            Alert.alert('No Source URL', 'This recipe does not have a source URL.');
            return;
        }
        Linking.openURL(recipe.sourceUrl).catch(() => {
            Alert.alert('Error', 'Could not open the source URL.');
        });
    };

    const handlePressIn = () => {
        const timer = setTimeout(() => {
            Vibration.vibrate(1000);
            startVoiceAssistant();
        }, 1000);
        setPressTimer(timer);
    };

    const handlePressOut = () => {
        if (pressTimer) {
            clearTimeout(pressTimer);
            setPressTimer(null);
        }
    };

    // ⭐ NEW: Manual interrupt function
    const handleManualInterrupt = () => {
        Speech.stop();
        setIsSpeaking(false);
        if (voiceMode && !isPaused) {
            startListening();
        }
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-[#FFF6F0]">
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#FFB47B" />
                    <Text className="mt-2 text-gray-600">Loading Recipe...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!recipe) {
        return (
            <SafeAreaView className="flex-1 bg-[#FFF6F0]">
                <Header title="Error" showBackButton={true} onBack={() => navigation.goBack()} />
                <View className="flex-1 justify-center items-center">
                    <Text className="text-lg text-gray-600">Recipe not found.</Text>
                    <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4 bg-[#FFB47B] px-4 py-2 rounded-lg">
                        <Text className="text-white font-semibold">Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View className="flex-1 bg-[#FFF6F0]">
            <View className="flex-1">
                <Header
                    title={recipe.title}
                    showBackButton={true}
                    onBack={() => navigation.goBack()}
                    backgroundColor="#FFF6F0"
                    textColor="#222"
                />

                {loadingAction && (
                    <View className="absolute inset-0 bg-black/50 z-50 items-center justify-center">
                        <View className="bg-white rounded-xl p-6 items-center">
                            <ActivityIndicator size="large" color="#FFB47B" />
                            <Text className="mt-3 text-gray-700 font-medium">
                                {loadingAction === 'unsaving' && 'Unsaving recipe...'}
                                {loadingAction === 'adding-to-list' && 'Adding to your list...'}
                            </Text>
                        </View>
                    </View>
                )}

                <ScrollView
                    ref={scrollViewRef}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40 }}
                >
                    <View className="p-4">
                        <View className="relative mb-4">
                            <Image
                                source={{ uri: recipe.image }}
                                className="w-full h-56 rounded-2xl"
                            />

                            {recipe.youtube && (
                                <>
                                    <TouchableOpacity
                                        onPress={handleYouTubeLink}
                                        className="absolute top-3 left-5 bg-black/30 px-3 py-1 rounded-full flex-row items-center"
                                    >
                                        <Ionicons name="logo-youtube" size={16} color="#fff" />
                                        <Text className="text-white ml-2 text-xs">Watch on YouTube</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={handleYouTubeLink}
                                        style={{
                                            position: 'absolute',
                                            top: "50%",
                                            left: "50%",
                                            transform: [{ translateX: -24 }, { translateY: -24 }],
                                        }}
                                    >
                                        <Ionicons name="play-circle" size={48} color="#fff" />
                                    </TouchableOpacity>
                                </>
                            )}

                            {!recipe.youtube && recipe.sourceUrl && (
                                <TouchableOpacity
                                    onPress={handleSourceURL}
                                    onLayout={(e) => {
                                        const { width, height } = e.nativeEvent.layout;
                                        setOverlaySize({ w: width, h: height });
                                    }}
                                    style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: [
                                            { translateX: -(overlaySize.w / 2) },
                                            { translateY: -(overlaySize.h / 2) }
                                        ],
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                >
                                    <View
                                        style={{
                                            backgroundColor: 'rgba(0,0,0,0.4)',
                                            paddingVertical: 10,
                                            paddingHorizontal: 18,
                                            borderRadius: 16,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Ionicons name="link-sharp" size={48} color="#fff" />
                                        <Text className="font-bold text-base text-white mt-1">
                                            Go to Recipe Page
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            )}

                            {(recipe.youtube || recipe.sourceUrl) && (
                                <View className="absolute bottom-3 right-5 bg-black/60 px-2 py-1 rounded-full flex-row items-center">
                                    <Ionicons name="time-outline" size={14} color="#fff" />
                                    <Text className="ml-1 text-xs text-white">{recipe.totalTime} Mins</Text>
                                </View>
                            )}

                            {!recipe.youtube && !recipe.sourceUrl && (
                                <View className="absolute inset-0 justify-center items-center bg-black/30 rounded-2xl">
                                    <Text className="text-white font-bold text-sm px-4 text-center">
                                        Source for this recipe is not available
                                    </Text>
                                    <View className="absolute bottom-3 right-5 bg-black/60 px-2 py-1 rounded-full flex-row items-center">
                                        <Ionicons name="time-outline" size={14} color="#fff" />
                                        <Text className="ml-1 text-xs text-white">{recipe.totalTime} Mins</Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        <View className="flex-row items-start justify-between mb-4">
                            <View className="flex-1 pr-4">
                                <Text className="text-2xl font-bold text-gray-900">{recipe.title}</Text>
                            </View>
                            <TouchableOpacity
                                className={`px-4 py-2 rounded-full ${isSaved ? 'bg-red-500' : 'bg-gray-400'}`}
                                onPress={handleUnsaveRecipe}
                                disabled={!!loadingAction || !isSaved}
                            >
                                <Text className="text-white font-semibold">
                                    {isSaved ? 'Unsave' : 'Unsaved'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {recipe.intro && <Text className="text-gray-700 mb-4">{recipe.intro}</Text>}

                        <View className="flex-row justify-around mb-4">
                            <TouchableOpacity
                                className={`flex-1 py-3 rounded-xl ${tab === 'ingredient' ? 'bg-[#FFB47B]' : 'bg-white'}`}
                                onPress={() => setTab('ingredient')}
                            >
                                <Text className={`text-center font-semibold ${tab === 'ingredient' ? 'text-white' : 'text-gray-700'}`}>
                                    Ingredients
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className={`flex-1 py-3 rounded-xl ml-2 ${tab === 'procedure' ? 'bg-[#FFB47B]' : 'bg-white'}`}
                                onPress={() => setTab('procedure')}
                            >
                                <Text className={`text-center font-semibold ${tab === 'procedure' ? 'text-white' : 'text-gray-700'}`}>
                                    Procedure
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {tab === 'ingredient' && (
                            <View>
                                <View className="flex-row justify-between items-center mb-2">
                                    <Text className="text-lg font-bold text-gray-800">
                                        Ingredients ({recipe.ingredients?.length || 0})
                                    </Text>
                                    <TouchableOpacity
                                        onPress={handleAddSelectedToChecklist}
                                        disabled={selectedIngredients.length === 0 || !!loadingAction}
                                        style={{
                                            paddingHorizontal: 12,
                                            paddingVertical: 8,
                                            borderRadius: 16,
                                            backgroundColor: selectedIngredients.length > 0 ? '#22C55E' : '#D1D5DB',
                                            ...shadowStyle,
                                        }}
                                    >
                                        <Text className={`font-semibold ${selectedIngredients.length > 0 ? 'text-white' : 'text-gray-400'}`}>
                                            Add to List
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                {recipe.ingredients?.map((ing: any, idx: number) => {
                                    const isSelected = selectedIngredients.some(item => item.name === ing.name);
                                    return (
                                        <TouchableOpacity
                                            key={idx}
                                            onPress={() => toggleIngredientSelection(ing)}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                padding: 12,
                                                marginBottom: 8,
                                                borderRadius: 16,
                                                backgroundColor: isSelected ? '#DCFCE7' : '#fff',
                                                borderWidth: isSelected ? 1 : 0,
                                                borderColor: isSelected ? '#22C55E' : 'transparent',
                                                ...shadowStyle,
                                            }}
                                        >
                                            <Text className="flex-1 font-semibold text-gray-800 capitalize">
                                                {ing.name}
                                            </Text>
                                            <Text className="text-gray-500 mr-2">
                                                {ing.amount + ' ' + ing.unit}
                                            </Text>
                                            <View className="w-7 h-7">
                                                {isSelected && (
                                                    <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}

                        {tab === 'procedure' && (
                            <View>
                                <Text className="text-lg font-semibold text-gray-800 mb-4">Instructions</Text>
                                {recipe.steps?.map((step: any, idx: number) => {
                                    const isCurrentStep = voiceMode && idx === currentStep;
                                    return (
                                        <View
                                            key={idx}
                                            className={`mb-6 rounded-xl p-4 ${isCurrentStep ? 'bg-green-50 border-2 border-green-500' : 'bg-white'}`}
                                            style={!isCurrentStep ? shadowStyle : undefined}
                                        >
                                            <View className="flex-row items-center mb-2">
                                                <Text className={`font-bold mr-3 text-lg ${isCurrentStep ? 'text-green-600' : 'text-[#FFB47B]'}`}>
                                                    {idx + 1}
                                                </Text>
                                                <Text className="font-semibold text-gray-800 flex-1">
                                                    {step.title || `Step ${idx + 1}`}
                                                </Text>
                                                {isCurrentStep && (
                                                    <Ionicons name="volume-high" size={20} color="#22C55E" />
                                                )}
                                            </View>
                                            <Text className="text-gray-700 ml-8">{step.details}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                </ScrollView>

                {/* Main Microphone Button */}
                <TouchableOpacity
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    style={{
                        position: 'absolute',
                        bottom: 100,
                        right: 25,
                        backgroundColor: voiceMode ? '#22C55E' : '#F9A826',
                        width: 60,
                        height: 60,
                        borderRadius: 30,
                        justifyContent: 'center',
                        alignItems: 'center',
                        ...shadowStyle,
                    }}
                >
                    <Ionicons name={voiceMode ? "mic" : "mic-outline"} size={30} color="white" />
                </TouchableOpacity>

                {/* Stop Voice Assistant Button */}
                {voiceMode && (
                    <TouchableOpacity
                        onPress={stopVoiceAssistant}
                        style={{
                            position: 'absolute',
                            bottom: 170,
                            right: 25,
                            backgroundColor: '#EF4444',
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            justifyContent: 'center',
                            alignItems: 'center',
                            ...shadowStyle,
                        }}
                    >
                        <Ionicons name="close" size={24} color="white" />
                    </TouchableOpacity>
                )}

                {/* ⭐ NEW: Manual Interrupt Button (only shows when speaking) */}
                {voiceMode && isSpeaking && (
                    <TouchableOpacity
                        onPress={handleManualInterrupt}
                        style={{
                            position: 'absolute',
                            bottom: 240,
                            right: 25,
                            backgroundColor: '#FF9500',
                            width: 50,
                            height: 50,
                            borderRadius: 25,
                            justifyContent: 'center',
                            alignItems: 'center',
                            ...shadowStyle,
                        }}
                    >
                        <Ionicons name="hand-left" size={24} color="white" />
                    </TouchableOpacity>
                )}

                {/* Voice Assistant Overlay */}
                {voiceMode && (
                    <View className="absolute top-20 left-4 right-4 bg-white rounded-2xl p-4 z-40" style={shadowStyle}>
                        <View className="flex-row items-center justify-between mb-2">
                            <View className="flex-row items-center">
                                <View className={`w-3 h-3 rounded-full mr-2 ${isSpeaking ? 'bg-blue-500' : isListening ? 'bg-green-500' : 'bg-gray-400'
                                    }`} />
                                <Text className="font-bold text-gray-800">
                                    {isSpeaking ? 'Speaking...' : 'Voice Assistant'}
                                </Text>
                            </View>
                            <Text className="text-sm text-gray-600">
                                Step {currentStep + 1}/{recipe.steps?.length || 0}
                            </Text>
                        </View>

                        {timerActive && (
                            <View className="bg-blue-50 p-3 rounded-lg mb-2">
                                <Text className="text-center font-semibold text-blue-700">
                                    ⏱ Timer: {timerMinutes} {timerMinutes === 1 ? 'minute' : 'minutes'} remaining
                                </Text>
                            </View>
                        )}

                        {recognizedText && !isSpeaking && (
                            <View className="bg-gray-50 p-2 rounded-lg mb-2">
                                <Text className="text-xs text-gray-600">Heard: "{recognizedText}"</Text>
                            </View>
                        )}

                        <Text className="text-xs text-gray-500 text-center">
                            {isSpeaking
                                ? 'Tap interrupt button to stop speaking'
                                : isPaused
                                    ? 'Paused - Say "resume" to continue'
                                    : 'Listening for commands...'}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
};

export default ViewSavedRecipeScreen;