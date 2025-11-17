
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '~/screen/home/HomeScreen';
import SearchScreen from '~/screen/search/SearchScreen';
import SavedScreen from '~/screen/saved/SavedScreen';
import ChecklistScreen from '~/screen/list/ChecklistScreen';
import PlannerScreen from '~/screen/planner/PlannerScreen';
import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import ProfileScreen from '~/screen/profile/ProfileScreen';
import AddRecipeScreen from '~/screen/search/recipe/AddRecipeScreen';
import ViewRecipeScreen from '~/screen/search/recipe/ViewRecipeScreen';
import colors from '~/utils/color';
import ViewSavedRecipeScreen from '~/screen/saved/recipe/ViewSavedRecipeScreen';
import MigrateImagesScreen from '~/screen/admin/MigrateImagesScreen';
import SettingScreen from '~/screen/profile/SettingScreen';
import EditProfileScreen from '~/screen/profile/EditProfileScreen';
import FoodPreferenceScreen from '~/screen/profile/FoodPreferenceScreen';

export type RootStackParamList = {
    Tabs: undefined;
    Profile: { 
        userId?: string;
        viewMode?: string;
     };
    AddRecipe: { 
        viewMode?: string;              // 'planner' or 'search'
        selectedDayIndex?: number | null;  // 0-6 for days (Monday-Sunday)
        weekOffset?: number;
    };
    ViewRecipe: { 
        recipeId?: string; 
        recipe?: any;
        viewMode?: string;
        profileUserId?: string;      
    };
    ViewApiRecipe: { recipe: string };
    Home: undefined;
    Search: undefined;
    Saved: undefined;
    Planner: undefined;
    Checklist: undefined;
    ViewSavedRecipe: { recipeId: String };
    Setting: undefined;
    MigrateImages: undefined;
    EditProfile: undefined;
    FoodPreference: undefined;
};

export type NavigationProps = NativeStackNavigationProp<RootStackParamList>;

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function MainScreen() {
    return <HomeScreen />
}

const TabStack = () => {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: { backgroundColor: colors.lightPeach },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: 'gray',
            }}
            initialRouteName="Home"
        >
            <Tab.Screen
                name="Home"
                component={MainScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Entypo name="home" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Search"
                component={SearchScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <FontAwesome name="search" size={24} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Saved"
                component={SavedScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Entypo name="save" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Planner"
                component={PlannerScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Entypo name="calendar" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Checklist"
                component={ChecklistScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Entypo name="list" size={size} color={color} />
                    ),
                }}
            />
        </Tab.Navigator>
    )
}

// Main App Stack with Profile Screen
const AppStack = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Tabs" component={TabStack} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="AddRecipe" component={AddRecipeScreen} />
            <Stack.Screen name="ViewRecipe" component={ViewRecipeScreen} />
            <Stack.Screen name="ViewSavedRecipe" component={ViewSavedRecipeScreen} />
            <Stack.Screen name="MigrateImages" component={MigrateImagesScreen} />
            <Stack.Screen name="Setting" component={SettingScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="FoodPreference" component={FoodPreferenceScreen} />
        </Stack.Navigator>
    );
}

export default AppStack;