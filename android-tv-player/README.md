# BizScreen Android TV / Fire TV Player

Native Android app that wraps the BizScreen web player for Android TV and Fire TV devices.

## Features

- **WebView Player** - Loads the BizScreen web player (`/player` route)
- **Auto-Start on Boot** - Automatically launches when device powers on
- **Kiosk Mode** - Lock task mode prevents users from exiting
- **Wake Lock** - Keeps screen on and prevents sleep
- **Immersive Mode** - Full screen with no system UI
- **D-pad Navigation** - Works with TV remotes
- **Offline Support** - Leverages web player's IndexedDB caching

## Build Options

### Option 1: GitHub Actions (Recommended)

The easiest way to build - push to GitHub and it builds automatically:

1. Push this code to a GitHub repository
2. Go to **Actions** tab
3. Run the **Build Android TV APK** workflow
4. Download APK from **Artifacts**

### Option 2: Android Studio

1. Open `android-tv-player` folder in Android Studio
2. Wait for Gradle sync
3. Build > Build Bundle(s) / APK(s) > Build APK(s)
4. APK at `app/build/outputs/apk/debug/app-debug.apk`

### Option 3: Command Line (requires Android SDK)

```bash
# Debug build (uses localhost)
./gradlew assembleDebug

# Release build (uses production URL)
./gradlew assembleRelease
```

### Build Configuration

| Build Type | Player URL |
|------------|------------|
| Debug | `http://10.0.2.2:5173/player` |
| Release | `https://app.bizscreen.com/player` |

## Installation

### Fire TV Stick via ADB

1. Enable Developer Options on Fire TV:
   - Settings > My Fire TV > Developer Options > ADB Debugging > On

2. Find Fire TV IP address:
   - Settings > My Fire TV > About > Network

3. Connect and install:
```bash
adb connect <fire-tv-ip>:5555
adb install -r app/build/outputs/apk/release/app-release.apk
```

### Enable Kiosk Mode (Device Owner)

For full kiosk mode (lock task), set the app as device owner:

```bash
# Factory reset device first, then run before any accounts are added:
adb shell dpm set-device-owner com.bizscreen.player/.DeviceAdminReceiver
```

## Project Structure

```
app/src/main/
├── AndroidManifest.xml          # App configuration
├── java/com/bizscreen/player/
│   ├── MainActivity.kt          # WebView + fullscreen
│   ├── BootReceiver.kt          # Auto-start on boot
│   ├── WebAppInterface.kt       # JS bridge
│   ├── KioskService.kt          # Foreground service
│   ├── DeviceAdminReceiver.kt   # Device admin for kiosk
│   └── BizScreenApplication.kt  # Application class
└── res/
    ├── xml/
    │   ├── device_admin.xml     # Device admin policies
    │   └── network_security_config.xml
    ├── values/
    │   ├── strings.xml
    │   └── themes.xml
    └── drawable/
        └── banner.xml           # TV banner (320x180)
```

## JavaScript Bridge

The app injects `window.BizScreenNative` into the web player:

```javascript
window.BizScreenNative = {
  isNativeApp: true,
  platform: 'androidtv',
  version: '1.0.0',

  reboot(),              // Reload WebView
  enableKiosk(enable),   // Toggle kiosk mode
  getDeviceInfo(),       // Get device info JSON
  exitApp(password),     // Exit with password
  clearCache(),          // Clear WebView storage
  setAutoStart(enable),  // Toggle auto-start
}
```

## Supported Devices

- Amazon Fire TV Stick (all generations)
- Amazon Fire TV Cube
- Android TV devices (Sony, Philips, TCL, etc.)
- Chromecast with Google TV
- Nvidia Shield TV
- Mi Box / Mi TV Stick
- Generic Android TV boxes

## Deployment

### Amazon Appstore
1. Create Amazon Developer account
2. Submit APK via Amazon Appstore Console
3. Add Fire TV device compatibility

### Google Play Store
1. Generate signed release AAB
2. Create Play Console listing in Android TV category
3. Upload AAB with TV banner assets (320x180)

## License

Proprietary - BizScreen
