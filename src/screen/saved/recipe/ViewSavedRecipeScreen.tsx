import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Linking, Vibration, Platform, BackHandler, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { wrapScrollView, ScrollIntoView } from 'react-native-scroll-into-view';
import { getRecipeById, unsaveRecipe, isRecipeSaved } from '../../../controller/recipe';
import { addItemsToChecklist } from '../../../controller/checklist';
import Header from '../../../components/partials/Header';
import * as Speech from 'expo-speech';
import {
    ExpoSpeechRecognitionModule,
    useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { Audio } from 'expo-av';
import colors from '~/utils/color';

// Create enhanced ScrollView with scroll-into-view functionality
const EnhancedScrollView = wrapScrollView(ScrollView);
import { getVoiceResponse } from '../../../api/gemini/recognitionService';

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
    const [overlaySize, setOverlaySize] = useState({ w: 0, h: 0 });

    //Time countdown
    const [showTimerModal, setShowTimerModal] = useState<boolean>(false);
    const [timerSeconds, setTimerSeconds] = useState<number>(0);
    const [timerPaused, setTimerPaused] = useState<boolean>(false);

    // Voice Assistant States
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [isListening, setIsListening] = useState<boolean>(false);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [isSpeaking, setIsSpeaking] = useState<boolean>(false); // NEW: Track speaking state
    const [timerActive, setTimerActive] = useState<boolean>(false);
    const [timerMinutes, setTimerMinutes] = useState<number>(0);
    const [recognizedText, setRecognizedText] = useState<string>('');
    const [speechRate, setSpeechRate] = useState<number>(0.75); // Adjustable speech rate (0.5 = slow, 0.75 = normal, 1.0 = fast)
    const [showIntroModal, setShowIntroModal] = useState<boolean>(false);
    const [wakeWordListening, setWakeWordListening] = useState<boolean>(false); // NEW: Wake word detection mode
    const [isProcessingAI, setIsProcessingAI] = useState<boolean>(false); // NEW: AI processing state
    const [showWakeWordModal, setShowWakeWordModal] = useState<boolean>(false); // NEW: Modal for wake word indicator
    const [activationStage, setActivationStage] = useState<'idle' | 'ready' | 'command'>('idle'); // NEW: Activation flow stage

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);
    const voiceModeRef = useRef<boolean>(false);
    const isSpeakingRef = useRef<boolean>(false); // NEW: Ref for immediate synchronous check
    const lastSpeechEndTime = useRef<number>(0); // NEW: Timestamp of last speech end for cooldown
    const lastSpeechLength = useRef<number>(0); // NEW: Length of last speech for dynamic cooldown
    const recentAppSpeech = useRef<string[]>([]); // NEW: Track recent app speech for echo detection
    const alarmSound = useRef<Audio.Sound | null>(null); // NEW: Alarm sound reference

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

    // Load alarm sound on mount
    useEffect(() => {
        const loadAlarmSound = async () => {
            try {
                await Audio.setAudioModeAsync({
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: false,
                });

                // Use a simple notification beep sound
                // You can replace this with a custom alarm.mp3 file in assets folder
                const { sound } = await Audio.Sound.createAsync(
                    { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
                    { shouldPlay: false, isLooping: true, volume: 1.0 }
                );
                alarmSound.current = sound;
            } catch (error) {
                console.error('Failed to load alarm sound:', error);
            }
        };

        loadAlarmSound();

        // Cleanup alarm sound on unmount
        return () => {
            if (alarmSound.current) {
                alarmSound.current.unloadAsync();
            }
        };
    }, []);

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

            // Clear speaking state
            isSpeakingRef.current = false;

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
            // Clean up wake word listening
            if (wakeWordListening) {
                stopListening();
                setWakeWordListening(false);
            }
            // Clean up voice assistant
            if (voiceMode) {
                cleanupVoiceAssistant();
                setVoiceMode(false);
                setIsListening(false);
                setIsPaused(false);
                setIsSpeaking(false);
            }
        });

        return unsubscribe;
    }, [navigation, voiceMode, wakeWordListening, cleanupVoiceAssistant]);

    // Handle Android back button
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            // Clean up wake word listening
            if (wakeWordListening) {
                console.log('⬅️ Back button pressed with wake word listening active');
                stopListening();
                setWakeWordListening(false);
            }
            // Clean up voice mode
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
    }, [voiceMode, wakeWordListening, cleanupVoiceAssistant]);

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

        console.log('📍 Event berlaku');
        console.log('   isSpeaking state:', isSpeaking);
        const transcript = event.results[0]?.transcript.toLowerCase();

        // IGNORE recognition while app is speaking (prevents echo)
        // Check BOTH state and ref for immediate protection
        if (isSpeaking || isSpeakingRef.current) {
            console.log('🔇 Ignoring recognition - app is speaking (ref:', isSpeakingRef.current, ', state:', isSpeaking, ')');
            return;
        }

        // DYNAMIC COOLDOWN: Longer cooldown for longer speeches to prevent echo
        // Base cooldown: 3 seconds
        // Add 50ms per character of last speech (up to max 10 seconds)
        const baseCooldown = 3000;
        const additionalCooldown = Math.min(lastSpeechLength.current * 50, 7000);
        const dynamicCooldown = baseCooldown + additionalCooldown;

        const timeSinceLastSpeech = Date.now() - lastSpeechEndTime.current;
        if (timeSinceLastSpeech < dynamicCooldown) {
            console.log(`🔇 Ignoring recognition - cooldown period (${timeSinceLastSpeech}ms / ${dynamicCooldown}ms since last speech)`);
            return;
        }

        if (transcript) {
            // ECHO FILTER: Check if recognized text matches recent app speech
            const isEcho = recentAppSpeech.current.some(appSpeech => {
                // Check if the transcript is similar to what the app just said
                const similarity = transcript.includes(appSpeech.substring(0, Math.min(20, appSpeech.length))) ||
                    appSpeech.includes(transcript.substring(0, Math.min(20, transcript.length)));
                return similarity;
            });

            if (isEcho) {
                console.log('🔇 Ignoring recognition - detected echo of app speech:', transcript);
                return;
            }

            console.log('✅ Valid command received:', transcript);
            setRecognizedText(transcript);

            // Check for wake word if in wake word listening mode
            if (wakeWordListening && !voiceMode) {
                if (transcript.includes('chef') || transcript.includes('chefiepie') || transcript.includes('chef pie') || transcript.includes('chefie pie')
                    || transcript.includes('hi') || transcript.includes('hello') || transcript.includes('hey')) {
                    console.log('🎯 Wake word detected! Starting activation flow...');
                    Vibration.vibrate([100, 50, 100]); // Double vibration for wake word
                    setWakeWordListening(false); // Stop wake word listening
                    stopListening(); // Stop current listening session
                    setActivationStage('ready'); // Set to ready stage
                    setTimeout(() => {
                        startActivationFlow(); // Start the activation flow
                    }, 500);
                    return;
                }
            }

            // Handle activation flow stages
            if (activationStage === 'ready') {
                // Waiting for user to say "ready"
                if (transcript.includes('ready') || transcript.includes('start') || transcript.includes('begin')) {
                    console.log('✅ User confirmed ready');
                    Vibration.vibrate(100);
                    setActivationStage('command');
                    stopListening();
                    setTimeout(() => {
                        askForCommand(); // Ask user for first step or question
                    }, 500);
                    return;
                }
            } else if (activationStage === 'command') {
                // Waiting for "first step" or a question
                if (transcript.includes('first step') || transcript.includes('start step') || transcript.includes('begin step')) {
                    console.log('✅ User requested first step');
                    Vibration.vibrate([100, 50, 100]);
                    setActivationStage('idle');
                    stopListening();
                    setTimeout(() => {
                        startVoiceAssistant(); // Start normal cooking flow
                    }, 500);
                    return;
                } else {
                    // User asked a question - send to Gemini
                    console.log('🤖 User asked question before steps:', transcript);
                    setActivationStage('idle');
                    setVoiceMode(true); // Enable voice mode for continuing conversation
                    handleInitialQuestion(transcript);
                    return;
                }
            }

            // Handle regular voice commands when in voice mode
            if (voiceMode) {
                handleVoiceCommand(transcript);
            }
        }
    });

    // End event - rarely fires with continuous mode
    useSpeechRecognitionEvent('end', () => {
        console.log('Speech recognition ended unexpectedly');
        // Restart wake word listening if we were in wake word mode
        if (wakeWordListening && !voiceMode && !isSpeaking) {
            setTimeout(() => startWakeWordListening(), 500);
        }
        // Only restart if not speaking and still in voice mode
        else if (voiceMode && !isPaused && !isSpeaking) {
            setTimeout(() => startListening(), 500);
        }
    });

    // Speech Recognition Event: Error Handler
    useSpeechRecognitionEvent('error', (event) => {
        console.log('Speech recognition error:', event.error);

        // Silently ignore "no-speech" and "client" errors - just auto-restart
        if (event.error === 'no-speech' || event.error === 'client') {
            console.log('No speech/client error, restarting...');
            // Restart wake word listening if we were in wake word mode
            if (wakeWordListening && !voiceMode && !isSpeaking) {
                setTimeout(() => startWakeWordListening(), 1000);
            }
            // Restart voice mode listening
            else if (voiceMode && !isPaused && !isSpeaking) {
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
        setWakeWordListening(false);
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
                    if (!recipeData) {
                        Alert.alert('Error', 'No recipe Data found');
                        navigation.goBack();
                        return;
                    }
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

    // Start wake word listening when screen is focused
    useFocusEffect(
        useCallback(() => {
            // Small delay to ensure screen is fully loaded
            const timer = setTimeout(() => {
                if (!voiceMode && !wakeWordListening) {
                    console.log('📱 Screen focused - starting wake word detection');
                    startWakeWordListening();
                }
            }, 1000);

            return () => {
                clearTimeout(timer);
                // Stop wake word listening when screen loses focus
                if (wakeWordListening && !voiceMode) {
                    console.log('📱 Screen unfocused - stopping wake word detection');
                    stopListening();
                }
            };
        }, [voiceMode, wakeWordListening])
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
                contextualStrings: ['next', 'previous', 'repeat', 'pause', 'stop', 'wait', 'timer', 'minutes', 'seconds'],
            });

            setIsListening(true);
            console.log('🎤 Started listening');
        } catch (error) {
            console.error('Error starting speech recognition:', error);
        }
    };

    // Start wake word listening (for detecting "hi chefiepie")
    const startWakeWordListening = async () => {
        try {
            const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
            if (!result.granted) {
                console.log('❌ Microphone permission denied for wake word');
                return;
            }

            await ExpoSpeechRecognitionModule.start({
                lang: 'en-US',
                interimResults: false,
                maxAlternatives: 1,
                continuous: true,
                requiresOnDeviceRecognition: false,
                addsPunctuation: false,
                contextualStrings: ['chef', 'chefiepie', 'chef pie', 'chefie pie', 'hey', 'hi', 'hello'],
            });

            setWakeWordListening(true);
            setIsListening(true);
            console.log('👂 Started wake word listening for "hi chefiepie"');
        } catch (error) {
            console.error('Error starting wake word listening:', error);
        }
    };

    const stopListening = () => {
        try {
            ExpoSpeechRecognitionModule.stop();
            setIsListening(false);
            setWakeWordListening(false); // Also stop wake word listening
            console.log('🔇 Stopped listening');
        } catch (error) {
            console.error('Error stopping speech recognition:', error);
        }
    };

    // Enhanced speak function with echo prevention and adjustable rate
    const speak = (text: string, skipEchoTracking = false) => {
        console.log('🔊 Speaking:', text.substring(0, 50) + '...');

        // Track speech length for dynamic cooldown
        lastSpeechLength.current = text.length;

        // Track what the app is saying to filter echoes later
        // Skip tracking for prompts where we expect user to repeat keywords
        if (!skipEchoTracking) {
            const lowerText = text.toLowerCase();
            recentAppSpeech.current.push(lowerText);
            // Keep only last 5 utterances to prevent memory bloat
            if (recentAppSpeech.current.length > 5) {
                recentAppSpeech.current.shift();
            }
        }

        // IMMEDIATELY set ref to prevent ANY recognition during speech
        isSpeakingRef.current = true;
        setIsSpeaking(true);

        // Stop listening before speaking to prevent echo
        console.log("Check sini", isListening);
        if (isListening) {
            stopListening();
        }

        // Add small delay to ensure microphone actually stops before speaking
        setTimeout(() => {
            Speech.speak(text, {
                language: 'en-US',
                pitch: 1.0,
                rate: speechRate, // Use adjustable speech rate

                onStart: () => {
                    console.log('🔊 Speech started');
                    isSpeakingRef.current = true;
                    setIsSpeaking(true);
                },

                onDone: () => {
                    console.log('✅ Speech finished');

                    // Record the timestamp when speech ends for cooldown checking
                    lastSpeechEndTime.current = Date.now();

                    // Keep blocking recognition for a bit longer to avoid tail-end echo
                    setTimeout(() => {
                        isSpeakingRef.current = false;
                        setIsSpeaking(false);
                    }, 500); // Increased to 500ms buffer after speech ends

                    // Resume listening after speech is done (only if still in voice mode)
                    if (voiceMode && !isPaused) {
                        setTimeout(() => {
                            console.log('🎤 Resuming listening after speech...');
                            startListening();
                        }, 1500); // Increased to 1500ms for better protection
                    }
                },

                onError: (error) => {
                    console.error('❌ Speech error:', error);
                    lastSpeechEndTime.current = Date.now();
                    isSpeakingRef.current = false;
                    setIsSpeaking(false);

                    // Still try to resume listening even if speech fails
                    if (voiceMode && !isPaused) {
                        setTimeout(() => {
                            startListening();
                        }, 1000);
                    }
                },
            });
        }, 200); // 200ms delay to ensure microphone stops
    };

    // Start activation flow - ask user to say "ready"
    const startActivationFlow = () => {
        const greeting = "Voice assistant on. Say ready to start.";

        console.log('🔊 Starting activation flow...');
        isSpeakingRef.current = true;
        setIsSpeaking(true);

        // Track speech length and add to echo filter
        lastSpeechLength.current = greeting.length;
        recentAppSpeech.current.push(greeting.toLowerCase());
        if (recentAppSpeech.current.length > 5) {
            recentAppSpeech.current.shift();
        }

        Speech.speak(greeting, {
            language: 'en-US',
            pitch: 1.0,
            rate: speechRate,
            onStart: () => {
                isSpeakingRef.current = true;
                setIsSpeaking(true);
            },
            onDone: () => {
                console.log('✅ Greeting finished, waiting for ready');
                lastSpeechEndTime.current = Date.now();
                setTimeout(() => {
                    isSpeakingRef.current = false;
                    setIsSpeaking(false);
                }, 500);

                // Start listening for "ready"
                setTimeout(() => {
                    console.log('🎤 Listening for ready...');
                    startListening();
                }, 1500);
            },
            onError: (error) => {
                console.error('❌ Activation greeting error:', error);
                isSpeakingRef.current = false;
                setIsSpeaking(false);
                setTimeout(() => startListening(), 1000);
            }
        });
    };

    // Ask for command - first step or question
    const askForCommand = () => {
        // First say "Okay", then ask for command
        const okayMessage = "Okay";
        const prompt = "Say first step or ask me anything related to cooking";

        console.log('🔊 Saying okay and asking for command...');
        isSpeakingRef.current = true;
        setIsSpeaking(true);

        // Track "Okay" in echo filter and length
        lastSpeechLength.current = okayMessage.length;
        recentAppSpeech.current.push(okayMessage.toLowerCase());
        if (recentAppSpeech.current.length > 5) {
            recentAppSpeech.current.shift();
        }

        // Say "Okay" first
        Speech.speak(okayMessage, {
            language: 'en-US',
            pitch: 1.0,
            rate: speechRate,
            onStart: () => {
                isSpeakingRef.current = true;
                setIsSpeaking(true);
            },
            onDone: () => {
                console.log('✅ Okay said, now asking for command');

                // Small pause, then say the prompt
                // DO NOT track the prompt in echo filter since we expect "first step" response
                setTimeout(() => {
                    // Track length for cooldown but not content for echo detection
                    lastSpeechLength.current = prompt.length;

                    Speech.speak(prompt, {
                        language: 'en-US',
                        pitch: 1.0,
                        rate: speechRate,
                        onStart: () => {
                            isSpeakingRef.current = true;
                            setIsSpeaking(true);
                        },
                        onDone: () => {
                            console.log('✅ Command prompt finished');
                            lastSpeechEndTime.current = Date.now();
                            setTimeout(() => {
                                isSpeakingRef.current = false;
                                setIsSpeaking(false);
                            }, 500);

                            // Start listening for command
                            setTimeout(() => {
                                console.log('🎤 Listening for first step or question...');
                                startListening();
                            }, 1500);
                        },
                        onError: (error) => {
                            console.error('❌ Command prompt error:', error);
                            isSpeakingRef.current = false;
                            setIsSpeaking(false);
                            setTimeout(() => startListening(), 1000);
                        }
                    });
                }, 500); // 500ms pause between "Okay" and the prompt
            },
            onError: (error) => {
                console.error('❌ Okay speech error:', error);
                isSpeakingRef.current = false;
                setIsSpeaking(false);
                setTimeout(() => startListening(), 1000);
            }
        });
    };

    // Handle initial question before starting steps
    const handleInitialQuestion = async (question: string) => {
        console.log('🤖 Processing initial question:', question);
        setIsProcessingAI(true);
        speak('Let me help you with that');

        try {
            // Build recipe context for Gemini
            const recipeContext = {
                recipeName: recipe?.title || 'Unknown Recipe',
                currentStepNumber: 0,
                totalSteps: recipe?.steps?.length || 0,
                currentStepDetails: 'Not started yet',
                ingredients: recipe?.ingredients?.map((ing: any) => ing.name) || [],
                difficulty: recipe?.difficulty || 'N/A'
            };

            const aiResponse = await getVoiceResponse(question, recipeContext);
            console.log('✅ Gemini response:', aiResponse);

            setIsProcessingAI(false);

            // Speak the AI response, then ask if user wants to start
            Speech.speak(aiResponse, {
                language: 'en-US',
                pitch: 1.0,
                rate: speechRate,
                onStart: () => {
                    isSpeakingRef.current = true;
                    setIsSpeaking(true);
                },
                onDone: () => {
                    lastSpeechEndTime.current = Date.now();
                    setTimeout(() => {
                        isSpeakingRef.current = false;
                        setIsSpeaking(false);
                    }, 500);

                    // After answer, ask if they want to continue
                    setTimeout(() => {
                        speak("Say first step or ask me anything related to cooking", true); // Skip echo tracking
                        setActivationStage('command'); // Go back to command stage
                    }, 1500);
                },
                onError: (error) => {
                    console.error('❌ AI response speech error:', error);
                    isSpeakingRef.current = false;
                    setIsSpeaking(false);
                    setIsProcessingAI(false);
                }
            });
        } catch (error) {
            console.error('❌ Error getting AI response:', error);
            setIsProcessingAI(false);
            speak('Sorry, I could not process your question. Say first step to begin cooking');
            setActivationStage('command');
        }
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
            const greeting = `Starting cooking assistant for ${recipe.title}. You have ${recipe.steps.length} steps. You can say next, previous, repeat steps or wait for certain minutes for the recipe, or ask me any questions about the recipe. Let's begin`;

            console.log('🔊 Speaking greeting:', greeting.substring(0, 50) + '...');

            // IMMEDIATELY set ref to prevent recognition
            isSpeakingRef.current = true;
            setIsSpeaking(true);

            // Stop listening before speaking to prevent echo
            if (isListening) {
                stopListening();
            }

            // Speak greeting with custom onDone callback
            Speech.speak(greeting, {
                language: 'en-US',
                pitch: 1.0,
                rate: speechRate,

                onStart: () => {
                    console.log('🔊 Greeting started');
                    isSpeakingRef.current = true;
                    setIsSpeaking(true);
                },

                onDone: () => {
                    console.log('✅ Greeting finished');

                    // Record timestamp for cooldown
                    lastSpeechEndTime.current = Date.now();

                    // Keep blocking for buffer period
                    setTimeout(() => {
                        isSpeakingRef.current = false;
                        setIsSpeaking(false);
                    }, 500);

                    // Wait 1.5 seconds after greeting finishes, then read first step
                    setTimeout(() => {
                        console.log('📖 Reading first step...');
                        readStep(0);
                    }, 1500);
                },

                onError: (error) => {
                    console.error('❌ Greeting speech error:', error);
                    isSpeakingRef.current = false;
                    setIsSpeaking(false);

                    // Still try to read first step even if greeting fails
                    setTimeout(() => {
                        readStep(0);
                    }, 1000);
                }
            });
        }, 1000);
    };

    const stopVoiceAssistant = () => {
        // Set voiceMode to false FIRST to prevent speak() from restarting listening
        setVoiceMode(false);
        setIsPaused(false);
        setActivationStage('idle'); // Reset activation stage
        stopListening();
        Speech.stop();
        setCurrentStep(0);
        setRecognizedText('');

        // Speak goodbye WITHOUT using the regular speak function to avoid complications
        isSpeakingRef.current = true;
        setIsSpeaking(true);

        // Track the goodbye message for echo filtering
        const goodbyeText = 'Cooking assistant stopped. Goodbye';
        recentAppSpeech.current.push(goodbyeText.toLowerCase());
        if (recentAppSpeech.current.length > 5) {
            recentAppSpeech.current.shift();
        }

        Speech.speak(goodbyeText, {
            language: 'en-US',
            pitch: 1.0,
            rate: speechRate,
            onStart: () => {
                isSpeakingRef.current = true;
                setIsSpeaking(true);
            },
            onDone: () => {
                lastSpeechEndTime.current = Date.now();
                setTimeout(() => {
                    isSpeakingRef.current = false;
                    setIsSpeaking(false);
                }, 500);
                // Do NOT restart listening since voiceMode is false
            },
            onError: () => {
                lastSpeechEndTime.current = Date.now();
                isSpeakingRef.current = false;
                setIsSpeaking(false);
            }
        });
    };

    const handleVoiceCommand = async (command: string) => {
        console.log('🎯 Voice command received:', command);

        // Haptic feedback for command recognition
        Vibration.vibrate(50);

        // Check for timer-specific commands first (higher priority when timer is active)
        if ((command.includes('cancel') && command.includes('timer')) ||
            (command.includes('stop') && command.includes('timer'))) {
            if (timerActive) {
                Vibration.vibrate([100, 50, 100]);
                cancelTimer();
            } else {
                speak('No timer is running');
            }
        }
        // Check for pause - prioritize timer if active, otherwise pause assistant
        else if (command.includes('pause')) {
            Vibration.vibrate([100, 50, 100]); // Double vibration for pause
            if (timerActive && !timerPaused) {
                pauseTimer();
            } else if (!timerActive) {
                pauseAssistant();
            } else {
                speak('Timer is already paused');
            }
        }
        // Check for resume - prioritize timer if paused, otherwise resume assistant
        else if (command.includes('resume')) {
            Vibration.vibrate([100, 50, 100]); // Double vibration for resume
            if (timerActive && timerPaused) {
                resumeTimer();
            } else if (isPaused) {
                resumeAssistant();
            } else {
                speak('Nothing to resume');
            }
        }
        // Check for standard navigation commands
        else if (command.includes('next') || command.includes('continue')) {
            speak('Next step');
            setTimeout(() => goToNextStep(), 800);
        }
        else if (command.includes('previous') || command.includes('back')) {
            speak('Going back');
            setTimeout(() => goToPreviousStep(), 800);
        }
        else if (command.includes('repeat') || command.includes('again')) {
            speak('Repeating');
            setTimeout(() => readCurrentStep(), 600);
        }
        else if (command.includes('stop') || command.includes('exit')) {
            Vibration.vibrate([100, 50, 100, 50, 100]); // Triple vibration for stop
            stopVoiceAssistant();
        }
        else if (command.includes('wait') || command.includes('timer')) {
            const { minutes, seconds, totalSeconds } = extractTime(command);
            if (totalSeconds > 0) {
                Vibration.vibrate(100);
                startTimer(totalSeconds, minutes, seconds);
            } else {
                Vibration.vibrate([50, 50, 50]); // Error pattern
                speak('Sorry, I could not understand the time. Please say, for example, wait 5 minutes or wait 30 seconds');
            }
        }
        else {
            // Unknown command - ask Gemini AI for help
            console.log('🤖 Sending to Gemini AI:', command);
            setIsProcessingAI(true);
            speak('Let me think about that');

            try {
                // Build recipe context for Gemini
                const recipeContext = {
                    recipeName: recipe?.title || 'Unknown Recipe',
                    currentStepNumber: currentStep + 1,
                    totalSteps: recipe?.steps?.length || 0,
                    currentStepDetails: recipe?.steps?.[currentStep]?.details || 'No step details',
                    ingredients: recipe?.ingredients?.map((ing: any) => ing.name) || [],
                    difficulty: recipe?.difficulty || 'N/A'
                };

                const aiResponse = await getVoiceResponse(command, recipeContext);
                console.log('✅ Gemini response:', aiResponse);

                setIsProcessingAI(false);

                // Speak the AI response
                speak(aiResponse);
            } catch (error) {
                console.error('❌ Error getting AI response:', error);
                setIsProcessingAI(false);
                speak('Sorry, I could not process your question. Please try asking in a different way');
            }
        }
    };

    const extractTime = (command: string): { minutes: number; seconds: number; totalSeconds: number } => {
        // Extract minutes
        const minuteMatch = command.match(/(\d+)\s*(minute|min)/i);
        const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;

        // Extract seconds
        const secondMatch = command.match(/(\d+)\s*(second|sec)/i);
        const seconds = secondMatch ? parseInt(secondMatch[1]) : 0;

        const totalSeconds = (minutes * 60) + seconds;

        return { minutes, seconds, totalSeconds };
    };

    const startTimer = (totalSeconds: number, minutes: number, seconds: number) => {
        setTimerMinutes(Math.ceil(totalSeconds / 60));
        setTimerSeconds(totalSeconds);
        setTimerActive(true);
        setShowTimerModal(true);

        // Build announcement message
        let announcement = 'Starting timer for ';
        if (minutes > 0 && seconds > 0) {
            announcement += `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} and ${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
        } else if (minutes > 0) {
            announcement += `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
        } else {
            announcement += `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
        }

        speak(announcement);

        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        let remainingSeconds = totalSeconds;

        timerRef.current = setInterval(() => {
            remainingSeconds -= 1;
            setTimerSeconds(remainingSeconds);

            if (remainingSeconds <= 0) {
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                }
                setTimerActive(false);
                setShowTimerModal(false);
                playAlarm();
                Vibration.vibrate([500, 200, 500, 200, 500]);
                speak('Timer finished! Ready to continue cooking?');
            } else {
                setTimerMinutes(Math.ceil(remainingSeconds / 60));
            }
        }, 1000);
    };

    const playAlarm = async () => {
        try {
            if (alarmSound.current) {
                await alarmSound.current.replayAsync();
                await alarmSound.current.playAsync();

                // Stop alarm after 10 seconds
                setTimeout(async () => {
                    if (alarmSound.current) {
                        await alarmSound.current.stopAsync();
                    }
                }, 10000);
            }
        } catch (error) {
            console.error('Failed to play alarm:', error);
        }
    };

    const stopAlarm = async () => {
        try {
            if (alarmSound.current) {
                await alarmSound.current.stopAsync();
            }
        } catch (error) {
            console.error('Failed to stop alarm:', error);
        }
    };

    const cancelTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setTimerActive(false);
        setTimerSeconds(0);
        setShowTimerModal(false);
        stopAlarm();
        speak('Timer cancelled');
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const pauseTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setTimerPaused(true);
        speak('Timer paused');
    };

    const resumeTimer = () => {
        setTimerPaused(false);
        speak('Timer resumed');

        let remainingSeconds = timerSeconds;

        timerRef.current = setInterval(() => {
            remainingSeconds -= 1;
            setTimerSeconds(remainingSeconds);

            if (remainingSeconds <= 0) {
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                }
                setTimerActive(false);
                setTimerPaused(false);
                setShowTimerModal(false);
                playAlarm();
                Vibration.vibrate([500, 200, 500, 200, 500]);
                speak('Timer finished! Ready to continue cooking?');
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
        // ScrollIntoView component will handle the actual scrolling automatically
        // when currentStep changes, based on the scrollIntoViewKey prop
        console.log(`📜 Scrolling to step ${stepIndex + 1}`);
    };

    const pauseAssistant = () => {
        setIsPaused(true);
        stopListening();
        Speech.stop();
        isSpeakingRef.current = false; // Clear the ref
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

    // Manual interrupt function
    const handleManualInterrupt = () => {
        Speech.stop();
        isSpeakingRef.current = false; // Clear the ref immediately
        setIsSpeaking(false);
        if (voiceMode && !isPaused) {
            // Add small delay before resuming listening
            setTimeout(() => {
                startListening();
            }, 500);
        }
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1"
                style={{ backgroundColor: colors.secondary }}>
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#FFB47B" />
                    <Text className="mt-2 text-gray-600">Loading Recipe...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!recipe) {
        return (
            <SafeAreaView className="flex-1"
                style={{ backgroundColor: colors.secondary }}>
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
        <View className="flex-1"
            style={{ backgroundColor: colors.secondary }}>
            <View className="flex-1">
                <Header
                    title={recipe.title}
                    showBackButton={true}
                    onBack={() => navigation.goBack()}
                    backgroundColor={colors.secondary}
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

                <EnhancedScrollView
                    innerRef={scrollViewRef}
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

                        {recipe.intro && (
                            <View className="mb-4">
                                <Text className="text-gray-700" numberOfLines={3}>
                                    {recipe.intro}
                                </Text>
                                {recipe.intro.length > 150 && (
                                    <TouchableOpacity onPress={() => setShowIntroModal(true)} className="mt-1">
                                        <Text className="text-orange-500 font-semibold text-sm">Read more</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}


                        {/* Tips Section for Created Recipes */}
                        {recipe.source === 'created' && recipe?.tips && (
                            <View className="mb-4">
                                <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                                    <View className="flex-row items-center mb-2">
                                        <Ionicons name="bulb-outline" size={20} color="#F59E0B" />
                                        <Text className="font-bold text-gray-800 ml-2 text-base">Tips & Tricks</Text>
                                    </View>
                                    <Text className="text-gray-700 leading-5">{recipe.tips}</Text>
                                </View>
                            </View>
                        )}

                        {/* Nutrition Section for Created Recipes */}
                        {recipe.source === 'created' && recipe?.nutrition && (
                            <View className="mb-4">
                                <View className="bg-green-50 border border-green-200 rounded-2xl p-4">
                                    <View className="flex-row items-center mb-2">
                                        <Ionicons name="nutrition-outline" size={20} color="#10B981" />
                                        <Text className="font-bold text-gray-800 ml-2 text-base">Nutrition Facts</Text>
                                    </View>
                                    <Text className="text-gray-700 leading-5">{recipe.nutrition}</Text>
                                </View>
                            </View>
                        )}

                        {/* Difficulty Badge for Created Recipes */}
                        {recipe.source === 'created' && recipe.difficulty && (
                            <View className="mb-4">
                                <View className="bg-purple-50 border border-purple-200 rounded-2xl px-4 py-3 flex-row items-center">
                                    <Ionicons name="bar-chart-outline" size={20} color="#9333EA" />
                                    <Text className="font-bold text-gray-800 ml-2">Difficulty:</Text>
                                    <Text className="font-bold text-purple-600 ml-2 capitalize">{recipe.difficulty}</Text>
                                </View>
                            </View>
                        )}

                        {/* Serving & Items */}
                        {((recipe.serving && recipe.serving !== 'N/A') || (recipe.ingredients?.length > 0)) && (
                            <View className="flex-row justify-between px-5 mt-4 mb-2">
                                {/* Left side - Serving (always render to hold position) */}
                                <View>
                                    {recipe.serving && recipe.serving !== 'N/A' && (
                                        <Text className="text-xs text-gray-500 font-bold">
                                            {recipe.serving} serve{Number(recipe.serving) > 1 ? 's' : ''}
                                        </Text>
                                    )}
                                </View>

                                {/* Right side - Items (always render to hold position) */}
                                <View>
                                    {recipe.ingredients?.length > 0 && (
                                        <Text className="text-xs text-gray-500 font-bold">
                                            {recipe.ingredients.length} item{recipe.ingredients.length > 1 ? 's' : ''}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        )}

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
                                <View className="flex-row justify-between items-center mb-3">
                                    <Text className="text-lg font-bold text-gray-800">
                                        Ingredients ({recipe.ingredients?.length || 0})
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => {
                                            if (selectedIngredients.length === recipe.ingredients?.length) {
                                                setSelectedIngredients([]);
                                            } else {
                                                setSelectedIngredients(recipe.ingredients || []);
                                            }
                                        }}
                                        className="flex-row items-center px-3 py-1.5 bg-orange-100 rounded-lg"
                                    >
                                        <Ionicons
                                            name={selectedIngredients.length === recipe.ingredients?.length ? "checkbox" : "square-outline"}
                                            size={18}
                                            color="#F97316"
                                        />
                                        <Text className="text-orange-600 font-semibold text-sm ml-1">
                                            Select All
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Instructional Banner */}
                                <View className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3 flex-row items-center">
                                    <Ionicons name="information-circle" size={20} color="#3B82F6" />
                                    <Text className="text-green-700 text-xs ml-2 flex-1">
                                        Tap ingredients below to select, then click "Add to List"
                                    </Text>
                                </View>
                                {recipe.ingredients?.map((ing: any, idx: number) => {
                                    const isSelected = selectedIngredients.some(item => item.name === ing.name);
                                    return (
                                        <TouchableOpacity
                                            key={idx}
                                            onPress={() => toggleIngredientSelection(ing)}
                                            activeOpacity={0.7}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                padding: 14,
                                                marginBottom: 10,
                                                borderRadius: 12,
                                                backgroundColor: isSelected ? '#DCFCE7' : '#fff',
                                                borderWidth: 2,
                                                borderColor: isSelected ? '#22C55E' : '#F3F4F6',
                                                ...shadowStyle,
                                            }}
                                        >
                                            <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center mr-3">
                                                <Text className="text-lg">🛒</Text>
                                            </View>
                                            <View className="flex-1">
                                                <Text className="font-bold text-gray-800 capitalize text-base">
                                                    {ing.name}
                                                </Text>
                                                <Text className="text-gray-500 text-sm mt-0.5">
                                                    {ing.amount} {ing.unit}
                                                </Text>
                                            </View>
                                            <View className="w-8 h-8 rounded-full items-center justify-center" style={{
                                                backgroundColor: isSelected ? '#22C55E' : '#E5E7EB'
                                            }}>
                                                {isSelected ? (
                                                    <Ionicons name="checkmark" size={20} color="white" />
                                                ) : (
                                                    <Ionicons name="add" size={20} color="#9CA3AF" />
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}

                                {/* Spacer for floating button */}
                                {selectedIngredients.length > 0 && (
                                    <View style={{ height: 80 }} />
                                )}
                            </View>
                        )}

                        {tab === 'procedure' && (
                            <View>
                                <Text className="text-lg font-semibold text-gray-800 mb-4">Instructions</Text>
                                {recipe.steps?.map((step: any, idx: number) => {
                                    const isCurrentStep = voiceMode && idx === currentStep;
                                    return (
                                        <ScrollIntoView
                                            key={idx}
                                            scrollIntoViewKey={isCurrentStep ? `step-${idx}` : undefined}
                                            animated={true}
                                            onUpdate={true}
                                            scrollIntoViewOptions={{
                                                insets: { top: 200, bottom: 300 }
                                            }}
                                        >
                                            <View
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
                                        </ScrollIntoView>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                </EnhancedScrollView>

                {/* Add to Shopping List Floating Button */}
                {tab === 'ingredient' && selectedIngredients.length > 0 && (
                    <TouchableOpacity
                        onPress={handleAddSelectedToChecklist}
                        disabled={!!loadingAction}
                        style={{
                            position: 'absolute',
                            bottom: 20,
                            left: 20,
                            right: 20,
                            backgroundColor: '#22C55E',
                            paddingVertical: 16,
                            paddingHorizontal: 24,
                            borderRadius: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            ...shadowStyle,
                        }}
                    >
                        <Ionicons name="cart" size={24} color="white" />
                        <Text className="text-white font-bold text-base ml-2">
                            Add to List ({selectedIngredients.length})
                        </Text>
                    </TouchableOpacity>
                )}


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

                {/* Manual Interrupt Button (only shows when speaking) */}
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

                {/* Wake Word Detection Floating Icon */}
                {wakeWordListening && !voiceMode && (
                    <TouchableOpacity
                        onPress={() => setShowWakeWordModal(true)}
                        style={{
                            position: 'absolute',
                            top: 90,
                            right: 20,
                            backgroundColor: '#3B82F6',
                            width: 50,
                            height: 50,
                            borderRadius: 25,
                            justifyContent: 'center',
                            alignItems: 'center',
                            zIndex: 40,
                            ...shadowStyle,
                        }}
                    >
                        <View style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: 12,
                            height: 12,
                            borderRadius: 6,
                            backgroundColor: '#22C55E',
                        }} />
                        <Ionicons name="mic" size={24} color="white" />
                    </TouchableOpacity>
                )}

                {/* Voice Assistant Overlay */}
                {voiceMode && (
                    <View className="absolute top-20 left-4 right-4 bg-white rounded-2xl p-4 z-40" style={shadowStyle}>
                        <View className="flex-row items-center justify-between mb-2">
                            <View className="flex-row items-center">
                                <View className={`w-3 h-3 rounded-full mr-2 ${isProcessingAI ? 'bg-purple-500' :
                                    isSpeaking ? 'bg-blue-500' :
                                        isListening ? 'bg-green-500' :
                                            'bg-gray-400'
                                    }`} />
                                <Text className="font-bold text-gray-800">
                                    {isProcessingAI ? '🤖 AI Thinking...' : isSpeaking ? 'Speaking...' : 'Voice Assistant'}
                                </Text>
                            </View>
                            <Text className="text-sm text-gray-600">
                                Step {currentStep + 1}/{recipe.steps?.length || 0}
                            </Text>
                        </View>

                        {/* AI Processing Indicator */}
                        {isProcessingAI && (
                            <View className="bg-purple-50 p-2 rounded-lg mb-2">
                                <Text className="text-xs text-purple-700 text-center">
                                    🧠 Processing your question with AI...
                                </Text>
                            </View>
                        )}

                        {/* Speech Rate Controls */}
                        <View className="bg-gray-50 p-2 rounded-lg mb-2">
                            <Text className="text-xs text-gray-600 mb-2 text-center">Speech Speed</Text>
                            <View className="flex-row justify-around">
                                <TouchableOpacity
                                    onPress={() => setSpeechRate(0.5)}
                                    className={`px-3 py-1.5 rounded-lg ${speechRate === 0.5 ? 'bg-orange-500' : 'bg-gray-200'}`}
                                    disabled={isSpeaking}
                                >
                                    <Text className={`text-xs font-semibold ${speechRate === 0.5 ? 'text-white' : 'text-gray-600'}`}>
                                        Slow
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setSpeechRate(0.75)}
                                    className={`px-3 py-1.5 rounded-lg ${speechRate === 0.75 ? 'bg-orange-500' : 'bg-gray-200'}`}
                                    disabled={isSpeaking}
                                >
                                    <Text className={`text-xs font-semibold ${speechRate === 0.75 ? 'text-white' : 'text-gray-600'}`}>
                                        Normal
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setSpeechRate(1.0)}
                                    className={`px-3 py-1.5 rounded-lg ${speechRate === 1.0 ? 'bg-orange-500' : 'bg-gray-200'}`}
                                    disabled={isSpeaking}
                                >
                                    <Text className={`text-xs font-semibold ${speechRate === 1.0 ? 'text-white' : 'text-gray-600'}`}>
                                        Fast
                                    </Text>
                                </TouchableOpacity>
                            </View>
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
                            {isProcessingAI
                                ? 'AI is thinking about your question...'
                                : isSpeaking
                                    ? 'Tap interrupt button to stop speaking'
                                    : isPaused
                                        ? 'Paused - Say "resume" to continue'
                                        : 'Say commands (next/previous/repeat) or ask questions about the recipe'}
                        </Text>
                    </View>
                )}

                {/* Intro Modal */}
                <Modal
                    visible={showIntroModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowIntroModal(false)}
                >
                    <Pressable
                        style={{
                            flex: 1,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: 20,
                        }}
                        onPress={() => setShowIntroModal(false)}
                    >
                        <Pressable
                            style={{
                                backgroundColor: 'white',
                                borderRadius: 16,
                                padding: 24,
                                maxHeight: '80%',
                                width: '100%',
                            }}
                            onPress={(e) => e.stopPropagation()}
                        >
                            <View className="flex-row items-center justify-between mb-4">
                                <Text className="text-xl font-bold text-gray-900">About this recipe</Text>
                                <TouchableOpacity onPress={() => setShowIntroModal(false)}>
                                    <Ionicons name="close-circle" size={28} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                <Text className="text-gray-700 text-base leading-6">
                                    {recipe?.intro}
                                </Text>
                            </ScrollView>
                        </Pressable>
                    </Pressable>
                </Modal>

                {/* Wake Word Modal */}
                <Modal
                    visible={showWakeWordModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowWakeWordModal(false)}
                >
                    <Pressable
                        style={{
                            flex: 1,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: 20,
                        }}
                        onPress={() => setShowWakeWordModal(false)}
                    >
                        <Pressable
                            style={{
                                backgroundColor: 'white',
                                borderRadius: 16,
                                padding: 24,
                                width: '100%',
                                maxWidth: 350,
                            }}
                            onPress={(e) => e.stopPropagation()}
                        >
                            <View className="flex-row items-center justify-between mb-4">
                                <View className="flex-row items-center">
                                    <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                                        <Ionicons name="mic" size={24} color="#3B82F6" />
                                    </View>
                                    <Text className="text-xl font-bold text-gray-900">Voice Assistant</Text>
                                </View>
                                <TouchableOpacity onPress={() => setShowWakeWordModal(false)}>
                                    <Ionicons name="close-circle" size={28} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>

                            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                                <View className="flex-row items-center mb-2">
                                    <View className="w-3 h-3 rounded-full bg-green-500 mr-2" />
                                    <Text className="font-bold text-blue-800 text-base">
                                        Listening for Wake Word
                                    </Text>
                                </View>
                                <Text className="text-blue-700 text-sm leading-5">
                                    Say <Text className="font-bold">"Hi Chefiepie"</Text> to activate the voice cooking assistant
                                </Text>
                            </View>

                            <View className="bg-gray-50 rounded-xl p-4 mb-4">
                                <Text className="font-bold text-gray-800 mb-2">How it works:</Text>
                                <Text className="text-gray-600 text-sm leading-5">
                                    • The app is listening for the wake word{'\n'}
                                    • Once activated, you can ask questions{'\n'}
                                    • Use voice commands like "next", "repeat", or "pause"
                                </Text>
                            </View>
                        </Pressable>
                    </Pressable>
                </Modal>


                {/* Timer Countdown Modal */}
                <Modal
                    visible={showTimerModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={cancelTimer}
                >
                    <View
                        style={{
                            flex: 1,
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        <View
                            style={{
                                backgroundColor: 'white',
                                borderRadius: 24,
                                padding: 32,
                                width: '85%',
                                maxWidth: 400,
                                alignItems: 'center',
                                ...shadowStyle,
                            }}
                        >
                            {/* Timer Icon */}
                            <View
                                style={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: 40,
                                    backgroundColor: '#DBEAFE',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginBottom: 20,
                                }}
                            >
                                <Ionicons name="timer-outline" size={48} color="#3B82F6" />
                            </View>

                            {/* Title */}
                            <Text className="text-2xl font-bold text-gray-900 mb-2">
                                Cooking Timer
                            </Text>

                            <Text className="text-sm text-gray-500 mb-6 text-center">
                                Your timer is running
                            </Text>

                            {/* Countdown Display */}
                            <View
                                style={{
                                    backgroundColor: '#F3F4F6',
                                    borderRadius: 20,
                                    paddingVertical: 24,
                                    paddingHorizontal: 40,
                                    marginBottom: 20,
                                    width: '100%',
                                    alignItems: 'center',
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 56,
                                        fontWeight: 'bold',
                                        color: '#1F2937',
                                        fontVariant: ['tabular-nums'],
                                    }}
                                >
                                    {formatTime(timerSeconds)}
                                </Text>
                                <Text className="text-gray-500 text-sm mt-2">
                                    minutes : seconds
                                </Text>
                            </View>

                            {/* Progress Bar */}
                            <View
                                style={{
                                    width: '100%',
                                    height: 8,
                                    backgroundColor: '#E5E7EB',
                                    borderRadius: 4,
                                    marginBottom: 24,
                                    overflow: 'hidden',
                                }}
                            >
                                <View
                                    style={{
                                        height: '100%',
                                        backgroundColor: '#3B82F6',
                                        width: `${(timerSeconds / (timerMinutes * 60)) * 100}%`,
                                        borderRadius: 4,
                                    }}
                                />
                            </View>

                            {/* Warning when < 30 seconds */}
                            {timerSeconds <= 30 && timerSeconds > 0 && (
                                <View className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4 w-full">
                                    <View className="flex-row items-center justify-center">
                                        <Ionicons name="warning" size={20} color="#F97316" />
                                        <Text className="text-orange-700 font-semibold ml-2">
                                            Almost done!
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {/* Action Buttons Container */}
                            <View style={{ flexDirection: 'row', width: '100%', gap: 12, marginTop: 8 }}>
                                {/* Pause/Resume Button */}
                                <TouchableOpacity
                                    onPress={timerPaused ? resumeTimer : pauseTimer}
                                    style={{
                                        flex: 1,  // ✅ Now this works!
                                        backgroundColor: timerPaused ? '#10B981' : '#F59E0B',
                                        paddingVertical: 16,
                                        borderRadius: 16,
                                        alignItems: 'center',
                                        flexDirection: 'row',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Ionicons
                                        name={timerPaused ? "play" : "pause"}
                                        size={20}
                                        color="white"
                                    />
                                    <Text className="text-white font-bold text-base ml-2">
                                        {timerPaused ? 'Resume' : 'Pause'}
                                    </Text>
                                </TouchableOpacity>

                                {/* Cancel Button */}
                                <TouchableOpacity
                                    onPress={cancelTimer}
                                    style={{
                                        flex: 1,  // ✅ Now this works too!
                                        backgroundColor: '#EF4444',
                                        paddingVertical: 16,
                                        borderRadius: 16,
                                        alignItems: 'center',
                                        flexDirection: 'row',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Ionicons name="close" size={20} color="white" />
                                    <Text className="text-white font-bold text-base ml-2">
                                        Cancel
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Info Text */}
                            <Text className="text-xs text-gray-400 mt-4 text-center">
                                You can minimize this and continue cooking
                            </Text>
                        </View>
                    </View>
                </Modal>
            </View>
        </View>
    );
};

export default ViewSavedRecipeScreen;