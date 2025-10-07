import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Header from '../../components/Header';

export default function PlannerScreen() {
    const navigation = useNavigation();
    const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return (
        <View className="flex-1  bg-gray-50">
            <Header
                title="Meal Planner"
                showBackButton={false}
                onBack={() => navigation.goBack()}
            />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
                {/* This Week section */}
                <View style={{ backgroundColor: '#FFF7F0' }} className="m-6 mt-4 p-5 rounded-2xl">
                    <View className="flex-row justify-between items-center mb-4">
                        <TouchableOpacity>
                            <Ionicons name="chevron-back" size={24} color="black" />
                        </TouchableOpacity>
                        <Text className="font-semibold text-base text-gray-800">This Week</Text>
                        <TouchableOpacity>
                            <Ionicons name="chevron-forward" size={24} color="black" />
                        </TouchableOpacity>
                    </View>

                    <Text className="text-center text-gray-500 mb-4">Ready to plan this week?</Text>

                    <View className="flex-row justify-around w-full mb-6">
                        {weekDays.map((day, index) => (
                            <View key={index} style={{ backgroundColor: '#F9A826' }} className="w-10 h-10 rounded-full items-center justify-center">
                                <Text className="text-white font-bold">{day}</Text>
                            </View>
                        ))}
                    </View>
                    <TouchableOpacity style={{ backgroundColor: '#F9A826' }} className="w-full py-4 rounded-xl">
                        <Text className="text-white text-center font-bold text-base">START MY PLAN</Text>
                    </TouchableOpacity>
                </View>

                {/* Days List */}
                <View className="px-6 mt-2">
                    {days.map((day, index) => (
                        <View key={index} className="flex-row justify-between items-center py-4 border-b border-gray-200">
                            <Text className="text-lg font-semibold text-gray-800">{day}</Text>
                            <TouchableOpacity className="flex-row items-center bg-gray-100 px-3 py-2 rounded-lg">
                                <Feather name="plus" size={16} color="black" />
                                <Text className="ml-2 font-bold text-sm">ADD</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            </ScrollView>

        </View>
    );
}