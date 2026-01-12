# Timer Alarm Feature

## Changes Made

Added alarm ringing and support for seconds in the timer functionality for the Voice Assistant in `ViewSavedRecipeScreen.tsx`.

### New Features:

1. **Alarm Sound**: Timer now plays an alarm sound when it finishes
2. **Seconds Support**: Users can now set timers in seconds, not just minutes
3. **Combined Time**: Users can set timers with both minutes and seconds (e.g., "2 minutes 30 seconds")

## Voice Commands

Users can now use these voice commands for timers:

- `"wait 5 minutes"` - Sets a 5-minute timer
- `"wait 30 seconds"` - Sets a 30-second timer
- `"wait 2 minutes 45 seconds"` - Sets a 2 minute 45 second timer
- `"timer 1 minute 30 seconds"` - Alternative syntax
- `"cancel timer"` - Stops and cancels the timer
- `"pause"` - Pauses the timer
- `"resume"` - Resumes a paused timer

## Technical Changes

### 1. Added Audio Import
```typescript
import { Audio } from 'expo-av';
```

### 2. New State & Refs
```typescript
const alarmSound = useRef<Audio.Sound | null>(null);
```

### 3. Updated Functions

#### `extractTime()` - Replaced `extractMinutes()`
Now extracts both minutes and seconds from voice commands:
```typescript
const extractTime = (command: string): { minutes: number; seconds: number; totalSeconds: number }
```

#### `startTimer()` - Updated Signature
```typescript
const startTimer = (totalSeconds: number, minutes: number, seconds: number)
```
- Accepts total seconds, minutes, and seconds separately
- Announces time in natural language (e.g., "2 minutes and 30 seconds")

#### `playAlarm()` - New Function
- Plays the alarm sound when timer finishes
- Loops for 10 seconds then auto-stops
- Uses vibration + audio for better notification

#### `stopAlarm()` - New Function
- Stops the alarm sound manually
- Called when timer is cancelled

### 4. Updated Speech Recognition
Added "seconds" to contextual strings for better recognition:
```typescript
contextualStrings: ['next', 'previous', 'repeat', 'pause', 'stop', 'wait', 'timer', 'minutes', 'seconds']
```

## Custom Alarm Sound

Currently, the app uses an online alarm sound from mixkit.co. To use a custom alarm sound:

### Option 1: Local MP3 File

1. Add your `alarm.mp3` file to `assets/` folder
2. Update the code in `ViewSavedRecipeScreen.tsx`:

```typescript
// Replace this line:
{ uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },

// With this:
require('../../../assets/alarm.mp3'),
```

### Option 2: Different Online Sound

Replace the URL in the code:
```typescript
{ uri: 'YOUR_ALARM_SOUND_URL_HERE' }
```

## Testing

1. Start voice assistant by saying "Hi Chefiepie"
2. Say "ready" when prompted
3. Say "first step" or ask a question
4. During cooking, say "wait 30 seconds"
5. Timer will start counting down
6. When timer reaches 0:
   - Vibration pattern triggers
   - Alarm sound plays (loops for 10 seconds)
   - Voice says "Timer finished! Ready to continue cooking?"

## Alarm Duration

The alarm automatically stops after 10 seconds. To change this:

In `playAlarm()` function, modify the timeout:
```typescript
setTimeout(async () => {
    if (alarmSound.current) {
        await alarmSound.current.stopAsync();
    }
}, 10000); // Change 10000 to desired milliseconds
```

## Dependencies

Make sure `expo-av` is installed:
```bash
npm install expo-av
```

Or with Expo:
```bash
npx expo install expo-av
```

## Notes

- Alarm plays even if device is in silent mode (iOS)
- Alarm will stop automatically after 10 seconds
- Canceling timer also stops the alarm
- Multiple time units supported: "minute", "min", "second", "sec"
