import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Header from '../../components/Header';

export default function PlannerScreen() {
    const navigation = useNavigation();
    const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    const [selectedDays, setSelectedDays] = useState<number[]>([]);
    const [weekOffset, setWeekOffset] = useState(0);

    // Get start of week (Monday)
    const getWeekStart = (offset: number) => {
        const today = new Date();
        const currentDay = today.getDay();
        const diff = currentDay === 0 ? -6 : 1 - currentDay;
        
        const monday = new Date(today);
        console.log('Initial Monday date:', monday);
        monday.setDate(today.getDate() + diff + (offset * 7));
        monday.setHours(0, 0, 0, 0);
        console.log(`Monday for offset ${offset}:`, monday);
        
        return monday;
    };

    // Get dates of the week
    const getWeekDates = (offset: number) => {
        const weekStart = getWeekStart(offset);
        console.log('Week start date:', weekStart);
        const dates = [];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            console.log(`Date for day index ${i}:`, date);
            date.setDate(weekStart.getDate() + i);
            dates.push(date);
        }
        
        return dates;
    };

    // ✨ NEW: Function untuk format week range
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

    // ✨ UPDATED: Improved week label logic
    const getWeekLabel = (offset: number) => {
        if (offset === 0) return 'This Week';
        if (offset === 1) return 'Next Week';
        // After "Next Week", show date range instead
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
            alert('Please select at least one day');
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

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
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
                        
                        {/* ✨ UPDATED: Display logic */}
                        <View className="items-center">
                            <Text className="font-semibold text-base text-gray-800">
                                {getWeekLabel(weekOffset)}
                            </Text>
                            {/* Show date range below for all weeks */}
                            {/* {weekOffset <= 1 && (
                                <Text className="text-xs text-gray-500 mt-1">
                                    {getWeekRangeText(weekOffset)}
                                </Text>
                            )} */}
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
                                <TouchableOpacity 
                                    className="flex-row items-center bg-gray-100 px-3 py-2 rounded-lg"
                                    disabled={!isSelected && selectedDays.length > 0}
                                >
                                    <Feather name="plus" size={16} color="black" />
                                    <Text className="ml-2 font-bold text-sm">ADD</Text>
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}