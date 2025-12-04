# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chefie Pie is a React Native mobile application built with Expo that helps users discover recipes, plan meals, and detect ingredients from images. The app integrates with Firebase for authentication and data storage, Spoonacular API for recipe data, and AI services (Roboflow & Google Gemini) for ingredient detection from images.

## Development Commands

### Starting Development
```bash
npm start              # Start Expo development server
npm run android        # Run on Android device/emulator
npm run ios            # Run on iOS device/simulator
npm run web            # Run in web browser
```

### Build & Quality
```bash
npm run prebuild       # Generate native code (iOS/Android)
npm run lint           # Run ESLint and Prettier checks
npm run format         # Auto-fix linting issues and format code
```

## Environment Configuration

The application requires a `.env` file with the following keys:
- `EXPO_PUBLIC_FIREBASE_*` - Firebase configuration for authentication and Firestore
- `EXPO_PUBLIC_SPOONACULAR_API_KEY` - Recipe data from Spoonacular API
- `EXPO_PUBLIC_ROBOFLOW_API_KEY` - Ingredient detection (alternative to Gemini)
- `EXPO_PUBLIC_GEMINI_API_KEY` - AI-powered ingredient detection from images

See `.env.example` for the complete template.

## Architecture Overview

### Navigation Structure

The app uses React Navigation with a two-tier structure:

1. **RootNavigator** (`src/navigation/RootNavigator.tsx`) - Determines auth state and routes to:
   - `AuthStack` - Sign in, sign up, forgot password screens
   - `AppStack` - Main authenticated experience

2. **AppStack** (`src/navigation/AppStack.tsx`) - Contains:
   - **TabStack** - Bottom tab navigator with 5 main screens:
     - Home - Recipe discovery and recommendations
     - Search - Search recipes by keyword or ingredients (with camera/image picker)
     - Saved - User's saved recipes
     - Planner - Weekly meal planning calendar
     - Checklist - Shopping list generation
   - **Modal/Stack Screens** - Profile, Recipe views, Settings, etc.

### Authentication Flow

Authentication is managed through `AuthContext` (`src/context/AuthContext.tsx`):
- Uses Firebase Auth for user authentication
- Stores additional user data in Firestore (`users` collection)
- Passwords are hashed with SHA256 before storage
- Context provides: `user`, `isAuthenticated`, `signin`, `signup`, `logout`, `resetPassword`
- User data includes: username, email, profileImage, bio, social links, dietary restrictions, cooking goals

### Data Layer

#### Firebase Collections
- `users` - User profiles and preferences
- `recipes` - User-created recipes
- Additional collections managed through Firestore

#### API Integrations
Located in `src/api/`:
- **spoonacular.ts** - Recipe search, random recipes, ingredient-based search
- **roboflow.ts** - Image-based ingredient detection using Roboflow model
- **gemini/geminiService.ts** - Alternative AI ingredient detection using Google Gemini (with model fallback strategy)

#### Controllers
Business logic in `src/controller/`:
- **recipe.ts** - Recipe CRUD operations, search, saved recipes
- **planner.ts** - Meal planning, weekly schedule management
- **checklist.js** - Shopping list management

### Key Features

#### Image-Based Ingredient Detection
Two AI providers are integrated for ingredient detection:
1. **Roboflow** - Custom-trained model for ingredient detection
2. **Gemini AI** - Fallback with multiple model versions (`gemini-2.5-flash`, `gemini-2.5-pro`, etc.)

Both services convert images to base64 and return detected ingredients that can be used to search recipes.

#### Recipe System
- **User-created recipes** - Stored in Firestore with custom fields
- **API recipes** - Fetched from Spoonacular with standardized format
- Recipes have `source` field: `'created'` or `'api'` to differentiate
- Recipe matching calculates percentage match based on available ingredients

#### Meal Planning
- Weekly calendar view (Monday-Sunday)
- Multi-day selection support
- Add recipes from saved collection or API
- Stores meal plans per user in Firestore

### Styling

The app uses **NativeWind** (TailwindCSS for React Native):
- Global styles in `global.css`
- Custom color palette in `tailwind.config.js`:
  - `primary`: #FF914D (orange)
  - `secondary`: #FFF4E0 (cream)
  - `darkBrown`: #4E342E
  - `lightBrown`: #A1887F
  - `blush`: #FFA07A
  - `accent`: #FFB86B
- Use Tailwind class names in components (e.g., `className="bg-primary text-white"`)

### TypeScript Configuration

- Path alias `~/*` maps to `src/*` (configured in `tsconfig.json`)
- Import example: `import { useAuth } from '~/context/AuthContext'`
- Strict mode enabled
- Firebase auth types customized in paths

## Common Development Patterns

### Navigation
```typescript
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '~/navigation/AppStack';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
const navigation = useNavigation<NavigationProp>();

navigation.navigate('ViewRecipe', { recipe, viewMode: 'discover' });
```

### Authentication
```typescript
import { useAuth } from '~/context/AuthContext';

const { user, isAuthenticated, signin, logout } = useAuth();
```

### Firebase Operations
```typescript
import { db } from '../firebaseConfig';
import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const userRef = doc(db, 'users', userId);
const docSnap = await getDoc(userRef);
```

### Image Handling
The app uses `expo-image-picker` for camera/gallery access:
- Permissions are configured in `app.json`
- Images are converted to base64 for AI processing
- Firebase Storage is available for image uploads

## Important Notes

- The app requires camera and photo library permissions on both iOS and Android
- Speech recognition is integrated but may need additional configuration
- Recipe IDs from Spoonacular are stored as strings even though they're numeric
- When working with recipes, always check the `source` field to handle API vs created recipes differently
- The planner uses week offsets to navigate between weeks (current week = 0, next week = 1, etc.)
- Gemini service includes automatic model fallback if the primary model fails
