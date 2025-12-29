const fs = require('fs');
const path = require('path');

// Handle google-services.json from environment variable
if (process.env.GOOGLE_SERVICES_JSON) {
  const targetPath = path.join(__dirname, 'google-services.json');
  fs.writeFileSync(targetPath, process.env.GOOGLE_SERVICES_JSON);
  console.log('✅ Successfully created google-services.json from environment variable');
}

module.exports = {
  expo: {
    name: "Chefie Pie",
    slug: "ChefiePie",
    version: "1.0.0",
    web: {
      favicon: "./assets/ChefiePieMascotLogo.png"
    },
    experiments: {
      tsconfigPaths: true
    },
    plugins: [
      "expo-asset",
      [
        "expo-speech-recognition",
        {
          microphonePermission: "Allow Chefie Pie to access your microphone for voice input.",
          speechRecognitionPermission: "Allow Chefie Pie to use speech recognition."
        }
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "Allow Chefie Pie to access your photos to select ingredient images.",
          cameraPermission: "Allow Chefie Pie to access your camera to take photos of ingredients for recipe suggestions."
        }
      ],
      "expo-font",
      "@react-native-google-signin/google-signin"
    ],
    orientation: "portrait",
    icon: "./assets/ChefiePieLogo.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/ChefiePieLogo.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSSpeechRecognitionUsageDescription: "Allow Chefie Pie to use speech recognition.",
        NSMicrophoneUsageDescription: "Allow Chefie Pie to access your microphone for voice input.",
        NSPhotoLibraryUsageDescription: "Allow Chefie Pie to access your photos to select ingredient images.",
        NSCameraUsageDescription: "Allow Chefie Pie to access your camera to take photos of ingredients for recipe suggestions.",
        ITSAppUsesNonExemptEncryption: false
      },
      bundleIdentifier: "com.anonymous.chefiePie"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/ChefiePieMascotLogo.png",
        backgroundColor: "#FFF4E0"
      },
      package: "com.anonymous.chefiePie",
      permissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE"
      ],
      googleServicesFile: "./google-services.json"
    },
    extra: {
      eas: {
        projectId: "19c50855-8c98-4695-b140-f768ad27baad"
      }
    },
    owner: "vambot07"
  }
};
