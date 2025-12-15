import { View, Text, TouchableOpacity, } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, RobotoSlab_400Regular, RobotoSlab_800ExtraBold } from '@expo-google-fonts/roboto-slab'
import colors from '../../utils/color';

interface HeaderProps {
    title: string;
    showBackButton?: boolean;
    onBack?: () => void;
    rightIcon?: React.ComponentProps<typeof Ionicons>["name"];
    onRightAction?: () => void;
    rightComponent?: React.ReactNode;
    backgroundColor?: string;
    textColor?: string;
}



const Header: React.FC<HeaderProps> = ({
    title,
    showBackButton = false,
    onBack,
    rightIcon,
    onRightAction,
    rightComponent,
    backgroundColor = "white",
    textColor = "#374151",
}) => {
    // Load Roboto Slab font (must be at top of component!)
    const [fontsLoaded] = useFonts({
        RobotoSlab_800ExtraBold,
    });

    return (


        <SafeAreaView style={{ backgroundColor }}>
            <View style={{ backgroundColor }} className="px-4 py-4">
                <View className="flex-row items-center justify-between">
                    {/* Left side - Back button or spacer */}
                    <View className="w-20">
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
                    <View
                        className="flex-1 items-center justify-center"
                    >
                        <Text
                            className="text-xl"
                            style={{
                                fontFamily: 'RobotoSlab_800ExtraBold',
                                color: textColor,
                            }} >
                            {title}
                        </Text>
                    </View>

                    {/* Right side - Action button or spacer */}
                    <View className="w-20 items-end">
                        {rightComponent ? (
                            rightComponent
                        ) : rightIcon ? (
                            <TouchableOpacity
                                onPress={onRightAction}
                                className="w-11 h-11 items-center justify-center rounded-full"
                                style={{
                                    backgroundColor: '#FFF4E0',
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 3,
                                    elevation: 2,
                                }}
                            >
                                <Ionicons name={rightIcon} size={22} color="#FF9966" />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
};

export default Header; 