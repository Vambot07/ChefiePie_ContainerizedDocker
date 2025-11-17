import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useSpeechToText } from './hooks/useSpeechToText';

export default function CreateRecipeScreen() {
  const [recipeName, setRecipeName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [activeField, setActiveField] = useState<'name' | 'instructions' | null>(null);
  
  const { recognizedText, isListening, error, startListening, stopListening, clearText } = useSpeechToText();

  // Update the active field with recognized text
  React.useEffect(() => {
    if (recognizedText && activeField) {
      if (activeField === 'name') {
        setRecipeName(recognizedText);
      } else if (activeField === 'instructions') {
        setInstructions(prev => prev ? `${prev} ${recognizedText}` : recognizedText);
      }
    }
  }, [recognizedText]);

  const handleMicPress = (field: 'name' | 'instructions') => {
    if (isListening) {
      stopListening();
      setActiveField(null);
    } else {
      setActiveField(field);
      clearText();
      startListening('en-US'); // Change to user's preferred language
    }
  };

  return (
    <View className="flex-1 p-4 bg-white">
      <Text className="text-2xl font-bold mb-4">Create Recipe</Text>

      {error && (
        <View className="bg-red-100 p-3 rounded-lg mb-4">
          <Text className="text-red-800">{error}</Text>
        </View>
      )}

      {/* Recipe Name Input */}
      <View className="mb-4">
        <Text className="text-lg font-semibold mb-2">Recipe Name</Text>
        <View className="flex-row items-center">
          <TextInput
            className="flex-1 border border-gray-300 rounded-lg p-3 mr-2"
            value={recipeName}
            onChangeText={setRecipeName}
            placeholder="Enter recipe name"
          />
          <TouchableOpacity
            onPress={() => handleMicPress('name')}
            className={`p-3 rounded-lg ${isListening && activeField === 'name' ? 'bg-red-500' : 'bg-blue-500'}`}
          >
            <Text className="text-white text-xl">
              {isListening && activeField === 'name' ? '⏹' : '🎤'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Instructions Input */}
      <View className="mb-4">
        <Text className="text-lg font-semibold mb-2">Instructions</Text>
        <View className="flex-row items-center">
          <TextInput
            className="flex-1 border border-gray-300 rounded-lg p-3 mr-2"
            value={instructions}
            onChangeText={setInstructions}
            placeholder="Enter cooking instructions"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <TouchableOpacity
            onPress={() => handleMicPress('instructions')}
            className={`p-3 rounded-lg ${isListening && activeField === 'instructions' ? 'bg-red-500' : 'bg-blue-500'}`}
          >
            <Text className="text-white text-xl">
              {isListening && activeField === 'instructions' ? '⏹' : '🎤'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {isListening && (
        <View className="bg-blue-100 p-3 rounded-lg mb-4">
          <Text className="text-blue-800">Listening... Speak now!</Text>
          {recognizedText && (
            <Text className="text-gray-700 mt-2">Recognized: {recognizedText}</Text>
          )}
        </View>
      )}
    </View>
  );
}