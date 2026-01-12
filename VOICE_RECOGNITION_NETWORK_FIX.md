# Voice Recognition Network Error Fix

## Problem
Speech recognition was failing with "network" error:
```
LOG  Speech recognition error: network
LOG  Speech recognition ended unexpectedly
```

## Root Cause
Android requires explicit INTERNET permission for Google Speech Recognition API to connect to Google's servers.

## Solution Applied

### 1. Added Internet Permissions (app.config.js)
```javascript
permissions: [
  "android.permission.RECORD_AUDIO",
  "android.permission.INTERNET",              // ✅ ADDED
  "android.permission.ACCESS_NETWORK_STATE",  // ✅ ADDED
  "android.permission.CAMERA",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE"
]
```

### 2. Improved Error Handling (ViewSavedRecipeScreen.tsx)
Changed network error from showing alert to auto-retry:
```typescript
case 'network':
    console.log('⚠️ Network error - will retry speech recognition...');
    // Auto-retry after 2 seconds
    if (wakeWordListening && !voiceMode && !isSpeaking) {
        setTimeout(() => startWakeWordListening(), 2000);
    } else if (voiceMode && !isPaused && !isSpeaking) {
        setTimeout(() => startListening(), 2000);
    }
    break;
```

## Steps to Apply Fix

### For Development (Expo Go)
```bash
# Clear cache and restart
npm start -- --clear
```

### For Production Build
```bash
# Rebuild the native app with new permissions
npx expo prebuild --clean
npx expo run:android

# OR for EAS build
eas build --platform android
```

## Why This Happens
- `expo-speech-recognition` uses Google's cloud-based speech recognition
- Requires internet connection to send audio to Google servers
- Android blocks network access unless explicitly permitted
- Without INTERNET permission, the service cannot connect

## Testing
After applying fix:
1. ✅ Voice recognition should work on Android
2. ✅ Network errors should auto-retry instead of showing alerts
3. ✅ Wake word detection should remain active

## Related Permissions
- `RECORD_AUDIO` - Required for microphone access
- `INTERNET` - Required for speech recognition API
- `ACCESS_NETWORK_STATE` - Optional, helps detect network availability

## References
- expo-speech-recognition docs: https://docs.expo.dev/versions/latest/sdk/speech-recognition/
- Android permissions: https://developer.android.com/guide/topics/permissions/overview
