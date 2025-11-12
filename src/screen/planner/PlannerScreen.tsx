import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image, Alert, Pressable } from 'react-native';
import type { NativeStackNavigationProp} from '@react-navigation/native-stack';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Header from '../../components/Header';

// ✅ FIXED: Add all screens you want to navigate to
type RootStackParamList = {
    ViewRecipe: { recipe: Recipe };
    AddRecipe: undefined; // No params needed
    SearchRecipe: undefined; // For search screen
    SavedRecipes: undefined; // For saved recipes screen
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Recipe {
    id: string;
    title: string;
    image: string;
    totalTime?: string;
    difficulty?: string;
    source?: 'created' | 'api';
}

interface RecipeCardProps {
    recipe: Recipe;
    navigation: NavigationProp;
}

const RecipeCard = ({recipe, navigation}: RecipeCardProps) => {
    const [loading, setLoading] = useState<boolean>(false);
    
    return (
        <TouchableOpacity 
            className='bg-white rounded-xl shadow-sm mb-4'
            onPress={() => navigation.navigate('ViewRecipe', { recipe })}
        >
            <View className='w-full rounded-t-xl bg-gray-200 justify-center items-center'>
                {loading && (
                    <View style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0, 
                        bottom: 0,
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}>
                        <ActivityIndicator size="small" color="#FF9966"/>
                    </View>
                )}
                <Image
                    source={{ uri: recipe.image }}
                    className="w-full h-32 rounded-t-xl"
                    onLoadStart={() => setLoading(true)}
                    onLoadEnd={() => setLoading(false)}
                    onError={() => setLoading(false)}
                />
            </View>

            <View className="p-3">
                <Text className="font-semibold text-gray-800 mb-1" numberOfLines={2}>
                    {recipe.title}
                </Text>
                <View className="flex-row justify-between">
                    <Text className="text-gray-500 text-sm">{recipe.totalTime || ''} mins</Text>
                    <Text className="text-gray-500 text-sm">{recipe.difficulty || ''}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

export default function PlannerScreen() {
    const navigation = useNavigation<NavigationProp>(); 
    const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    const [selectedDays, setSelectedDays] = useState<number[]>([]);
    const [weekOffset, setWeekOffset] = useState(0);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const [modalPosition, setModalPosition] = useState({ top: 0 });
    
    const buttonRefs = useRef<{ [key: string]: View | null }>({});

    const handleAddPress = (day: string, buttonRef: View | null) => {
        if (!buttonRef) return;
        
        setTimeout(() => {
            buttonRef.measure((x, y, width, height, pageX, pageY) => {
                console.log(`Button position for ${day}:`, { pageX, pageY });
                setModalPosition({ top: pageY });
                setSelectedDay(day);
                setModalVisible(true);
            });
        }, 0);
    };

    const closeModal = () => {
        setModalVisible(false);
        setSelectedDay(null);
    };

    const getWeekStart = (offset: number) => {
        const today = new Date();
        const currentDay = today.getDay();
        const diff = currentDay === 0 ? -6 : 1 - currentDay;
        
        const monday = new Date(today);
        monday.setDate(today.getDate() + diff + (offset * 7));
        monday.setHours(0, 0, 0, 0);
        
        return monday;
    };

    const getWeekDates = (offset: number) => {
        const weekStart = getWeekStart(offset);
        const dates = [];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            dates.push(date);
        }
        
        return dates;
    };

    const check =() =>{
        console.log("dksnsdndssn")
    }

    const getWeekRangeText = (offset: number) => {
        const weekStart = getWeekStart(offset);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        if (weekStart.getMonth() === weekEnd.getMonth()) {
            return `${monthNames[weekStart.getMonth()]} ${weekStart.getDate()} - ${weekEnd.getDate()}`;
        } else {
            return `${monthNames[weekStart.getMonth()]} ${weekStart.getDate()} - ${monthNames[weekEnd.getMonth()]} ${weekEnd.getDate()}`;
        }
    };

    const getWeekLabel = (offset: number) => {
        if (offset === 0) return 'This Week';
        if (offset === 1) return 'Next Week';
        return getWeekRangeText(offset);
    };

    const goToPreviousWeek = () => {
        if (weekOffset > 0) {
            setWeekOffset(weekOffset - 1);
            setSelectedDays([]);
        }
    };

    const goToNextWeek = () => {
        setWeekOffset(weekOffset + 1);
        setSelectedDays([]);
    };

    const toggleDay = (index: number) => {
        if (selectedDays.includes(index)) {
            setSelectedDays(selectedDays.filter(day => day !== index));
        } else {
            setSelectedDays([...selectedDays, index]);
        }
    };

    const handleStartPlan = () => {
        if (selectedDays.length === 0) {
            Alert.alert(
                'No Days Selected',
                'Please select at least one day'
            );
            return;
        }

        const weekDates = getWeekDates(weekOffset);
        const selectedDaysData = selectedDays
            .sort((a, b) => a - b)
            .map(index => ({
                dayName: days[index],
                date: weekDates[index],
                dateString: weekDates[index].toLocaleDateString()
            }));
        
        console.log('Week:', getWeekLabel(weekOffset));
        console.log('Selected days:', selectedDaysData);
    };

    const currentWeekDates = getWeekDates(weekOffset);

    return (
        <View className="flex-1 bg-gray-50">
            <Header
                title="Meal Planner"
                showBackButton={false}
                onBack={() => navigation.goBack()}
            />

            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={{ paddingBottom: 150 }}
                scrollEnabled={true}
            >
                <View style={{ backgroundColor: '#FFF7F0' }} className="m-6 mt-4 p-5 rounded-2xl">
                    {/* Week Navigation */}
                    <View className="flex-row justify-between items-center mb-2">
                        <TouchableOpacity 
                            onPress={goToPreviousWeek}
                            disabled={weekOffset === 0}
                            style={{ opacity: weekOffset === 0 ? 0.3 : 1 }}
                        >
                            <Ionicons name="chevron-back" size={24} color="black" />
                        </TouchableOpacity>
                        
                        <View className="items-center">
                            <Text className="font-semibold text-base text-gray-800">
                                {getWeekLabel(weekOffset)}
                            </Text>
                        </View>
                        
                        <TouchableOpacity onPress={goToNextWeek}>
                            <Ionicons name="chevron-forward" size={24} color="black" />
                        </TouchableOpacity>
                    </View>

                    <Text className="text-center text-gray-500 mb-4 mt-2">
                        {selectedDays.length === 0 
                            ? 'Select days to plan your meals' 
                            : `${selectedDays.length} day${selectedDays.length > 1 ? 's' : ''} selected`
                        }
                    </Text>

                    {/* Days with dates */}
                    <View className="flex-row justify-around w-full mb-6">
                        {weekDays.map((day, index) => {
                            const isSelected = selectedDays.includes(index);
                            const date = currentWeekDates[index];
                            return (
                                <View key={index} className="items-center">
                                    <TouchableOpacity
                                        onPress={() => toggleDay(index)}
                                        style={{ 
                                            backgroundColor: isSelected ? '#F9A826' : '#E5E7EB',
                                            borderWidth: isSelected ? 2 : 0,
                                            borderColor: isSelected ? '#D97706' : 'transparent'
                                        }}
                                        className="w-10 h-10 rounded-full items-center justify-center mb-1"
                                    >
                                        <Text 
                                            className="font-bold"
                                            style={{ color: isSelected ? 'white' : '#9CA3AF' }}
                                        >
                                            {day}
                                        </Text>
                                    </TouchableOpacity>
                                    <Text 
                                        className="text-xs"
                                        style={{ color: isSelected ? '#F9A826' : '#9CA3AF' }}
                                    >
                                        {date.getDate()}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>

                    <TouchableOpacity 
                        style={{ 
                            backgroundColor: selectedDays.length > 0 ? '#F9A826' : '#D1D5DB',
                            opacity: selectedDays.length > 0 ? 1 : 0.6
                        }} 
                        className="w-full py-4 rounded-xl"
                        onPress={handleStartPlan}
                        disabled={selectedDays.length === 0}
                    >
                        <Text className="text-white text-center font-bold text-base">
                            START MY PLAN
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Days List */}
                <View className="px-6 mt-2">
                    {days.map((day, index) => {
                        const isSelected = selectedDays.includes(index);
                        const date = currentWeekDates[index];
                        const dateString = date.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                        });
                        
                        return (
                            <View 
                                key={index} 
                                className="flex-row justify-between items-center py-4 border-b border-gray-200"
                                style={{ 
                                    opacity: selectedDays.length === 0 || isSelected ? 1 : 0.4 
                                }}
                            >
                                <View className="flex-row items-center">
                                    <View>
                                        <Text className="text-lg font-semibold text-gray-800">{day}</Text>
                                        <Text className="text-xs text-gray-500">{dateString}</Text>
                                    </View>
                                    {isSelected && (
                                        <View className="ml-2 bg-orange-500 rounded-full w-2 h-2" />
                                    )}
                                </View>
                                
                                <View
                                    ref={(ref) => {
                                        if (ref) {
                                            buttonRefs.current[day] = ref;
                                        }
                                    }}
                                    collapsable={false}
                                >
                                    <TouchableOpacity 
                                        className="flex-row items-center bg-gray-100 px-3 py-2 rounded-lg"
                                        disabled={!isSelected && selectedDays.length > 0}
                                        onPress={() => handleAddPress(day, buttonRefs.current[day])}
                                    >
                                        <Feather name="plus" size={16} color="black" />
                                        <Text className="ml-2 font-bold text-sm">ADD</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>

            {/* ✅ Overlay that allows scrolling */}
            {modalVisible && (
  <View
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.3)', // add backdrop
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    {/* Backdrop (untuk close bila tekan luar) */}
    <Pressable
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
      onPress={closeModal}
    />

    {/* Modal box (detect touch di dalam modal) */}
    <View
      style={{
        width: 260,
        backgroundColor: 'white',
        borderRadius: 16,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 6,
        elevation: 8,
      }}
    >
      <TouchableOpacity
        className="flex-row items-center px-4 py-3 border-b border-gray-100 active:bg-gray-50"
        onPress={() => {
          closeModal();
          console.log('Add Saved Recipe');
        }}
      >
        <View className="w-8 h-8 bg-orange-100 rounded-full items-center justify-center mr-3">
          <Ionicons name="bookmark" size={16} color="#F97316" />
        </View>
        <Text className="text-gray-800 font-medium flex-1">Add Saved Recipe</Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="flex-row items-center px-4 py-3 border-b border-gray-100 active:bg-gray-50"
        onPress={() => {
          closeModal();
          console.log('Search New Recipe');
        }}
      >
        <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
          <Ionicons name="search" size={16} color="#3B82F6" />
        </View>
        <Text className="text-gray-800 font-medium flex-1">Search New Recipe</Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="flex-row items-center px-4 py-3 active:bg-gray-50"
        onPress={() => {
          closeModal();
          navigation.navigate('AddRecipe');
        }}
      >
        <View className="w-8 h-8 bg-green-100 rounded-full items-center justify-center mr-3">
          <Ionicons name="create" size={16} color="#10B981" />
        </View>
        <Text className="text-gray-800 font-medium flex-1">Create New Recipe</Text>
      </TouchableOpacity>
    </View>
  </View>
)}

            <TouchableOpacity className='bg-red-100 p-4' onPress={() => navigation.navigate('AddRecipe')}>
                <Text className=''>kdssdskdnsndskdskn</Text>
            </TouchableOpacity>
        </View>
    );
}