import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../utils/color';

// 1️⃣ Nyatakan struktur props menggunakan interface (macam Header)
interface SettingItemProps {
    title: string;
    subtitle?: string;
    onPress: () => void;
    icon: React.ComponentProps<typeof Ionicons>['name']; // type-safe icon name
    showChevron?: boolean;
    danger?: boolean;
}

// 2️⃣ Gunakan React.FC<SettingItemProps>
const SettingItem: React.FC<SettingItemProps> = ({
    title,
    subtitle,
    onPress,
    icon,
    showChevron = true,
    danger = false,
}) => {
    return (
        <TouchableOpacity
            className="flex-row items-center justify-between py-4 px-1"
            onPress={onPress}
        >
            <View className="flex-row items-center flex-1">
                {/* Icon di kiri */}
                <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-4"
                    style={{ backgroundColor: danger ? '#FEE2E2' : colors.lightPeach }}
                >
                    <Ionicons
                        name={icon}
                        size={20}
                        color={danger ? '#DC2626' : colors.darkBrown}
                    />
                </View>

                {/* Teks utama dan subtitle */}
                <View className="flex-1">
                    <Text
                        className="text-base font-medium"
                        style={{ color: danger ? '#DC2626' : colors.darkBrown }}
                    >
                        {title}
                    </Text>
                    {subtitle && (
                        <Text className="text-sm mt-1" style={{ color: colors.lightBrown }}>
                            {subtitle}
                        </Text>
                    )}
                </View>
            </View>

            {/* Chevron kanan */}
            {showChevron && (
                <Ionicons name="chevron-forward" size={20} color={colors.lightBrown} />
            )}
        </TouchableOpacity>
    );
};

export default SettingItem;
