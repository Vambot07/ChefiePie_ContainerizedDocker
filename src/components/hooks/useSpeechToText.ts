import { useState, useEffect } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

export const useSpeechToText = () => {
  const [recognizedText, setRecognizedText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listen for recognition results
  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript;
    if (transcript) {
      setRecognizedText(transcript);
    }
  });

  // Listen for errors
  useSpeechRecognitionEvent('error', (event) => {
    console.error('Speech recognition error:', event.error);
    setError(event.error);
    setIsListening(false);
  });

  // Listen for end of speech
  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
  });

  const startListening = async (lang: string = 'en-US') => {
    try {
      setError(null);
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();

      if (!result.granted) {
        setError('Microphone permission not granted');
        return;
      }

      await ExpoSpeechRecognitionModule.start({
        lang,
        interimResults: true,
        maxAlternatives: 1,
        continuous: false,
        requiresOnDeviceRecognition: false,
        addsPunctuation: true,
        contextualStrings: ['recipe', 'ingredient', 'cooking', 'teaspoon', 'tablespoon'],
      });

      setIsListening(true);
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setError('Failed to start speech recognition');
    }
  };

  const stopListening = async () => {
    try {
      await ExpoSpeechRecognitionModule.stop();
      setIsListening(false);
    } catch (err) {
      console.error('Error stopping speech recognition:', err);
    }
  };

  const clearText = () => {
    setRecognizedText('');
    setError(null);
  };

  return {
    recognizedText,
    isListening,
    error,
    startListening,
    stopListening,
    clearText,
  };
};
