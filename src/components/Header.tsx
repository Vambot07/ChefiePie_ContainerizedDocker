import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../utils/color';

interface HeaderProps {
    title: string;
    showBackButton?: boolean;
    onBack?: () => void;
    rightIcon?: React.ComponentProps<typeof Ionicons>["name"];
    onRightAction?: () => void;
    backgroundColor?: string;
    textColor?: string;
}

const Header: React.FC<HeaderProps> = ({
    title,
    showBackButton = false,
    onBack,
    rightIcon,
    onRightAction,
    backgroundColor = "white",
    textColor = "#374151",
}) => {
    return (
        <SafeAreaView style={{ backgroundColor }}>
            <View style={{ backgroundColor }} className="px-4 pt-2">
                <View className="flex-row items-center justify-between">
                    {/* Left side - Back button or spacer */}
                    <View className="w-8">
                        {showBackButton && (
                            <TouchableOpacity
                                onPress={onBack}
                                className="w-8 h-8 items-center justify-center rounded-full bg-gray-50"
                            >
                                <Ionicons name="arrow-back" size={18} color={textColor} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Center - Title */}
                    <View className="flex-1 items-center">
                        <Text style={{ color: textColor }} className="text-xl font-bold">{title}</Text>
                    </View>

                    {/* Right side - Action button or spacer */}
                    <View className="w-8">
                        {rightIcon && (
                            <TouchableOpacity
                                onPress={onRightAction}
                                className="w-8 h-8 items-center justify-center rounded-full"
                            >
                                <Ionicons name={rightIcon} size={24} color="#FF9966" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
};

export default Header; 