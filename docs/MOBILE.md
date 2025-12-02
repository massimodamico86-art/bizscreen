# BizScreen Mobile Player Documentation

This guide covers building and deploying the BizScreen mobile player apps for Android and iOS (TV/tablet devices).

## Table of Contents

- [Architecture](#architecture)
- [Shared Core Library](#shared-core-library)
- [Android Player](#android-player)
- [iOS/tvOS Player](#iostvos-player)
- [QR Code Pairing Flow](#qr-code-pairing-flow)
- [Offline Mode](#offline-mode)
- [Remote Commands](#remote-commands)
- [Telemetry & Analytics](#telemetry--analytics)
- [Distribution](#distribution)
- [Troubleshooting](#troubleshooting)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Mobile Player Architecture                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Platform Layer                         │  │
│  │  ┌─────────────────┐    ┌─────────────────┐              │  │
│  │  │  Android App    │    │   iOS/tvOS App  │              │  │
│  │  │  (Kotlin/Java)  │    │    (Swift)      │              │  │
│  │  └────────┬────────┘    └────────┬────────┘              │  │
│  └───────────┼──────────────────────┼───────────────────────┘  │
│              │                      │                           │
│  ┌───────────▼──────────────────────▼───────────────────────┐  │
│  │                  Shared Core (JavaScript)                 │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│  │  │  ApiClient   │  │   Pairing    │  │  Heartbeat   │   │  │
│  │  │              │  │   Service    │  │   Service    │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│  │  │   Command    │  │    Cache     │  │  Telemetry   │   │  │
│  │  │   Handler    │  │   Manager    │  │   Service    │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Shared Core Library

The shared core (`mobile/shared-core/`) provides platform-agnostic functionality:

### Core Modules

| Module | Description |
|--------|-------------|
| `ApiClient.js` | HTTP client for BizScreen API |
| `PairingService.js` | QR code pairing flow |
| `HeartbeatService.js` | Device online status |
| `CommandHandler.js` | Remote command processing |
| `CacheManager.js` | Offline content caching |
| `TelemetryService.js` | Analytics and error tracking |
| `BizScreenCore.js` | Main orchestrator |

### Configuration

```javascript
// mobile/shared-core/config.js
export const config = {
  API_BASE_URL: 'https://your-domain.com/api',
  HEARTBEAT_INTERVAL: 30000,      // 30 seconds
  COMMAND_POLL_INTERVAL: 10000,   // 10 seconds
  CONTENT_CHECK_INTERVAL: 60000,  // 1 minute
  CACHE_MAX_SIZE: 500 * 1024 * 1024,  // 500MB
  TELEMETRY_BATCH_SIZE: 50,
  TELEMETRY_UPLOAD_INTERVAL: 60000
};
```

### Usage Example

```javascript
import BizScreenCore from './BizScreenCore';

const core = new BizScreenCore({
  apiBaseUrl: 'https://your-domain.com/api',
  deviceInfo: {
    model: 'Android TV',
    osVersion: '12.0',
    appVersion: '1.0.0'
  }
});

// Initialize with stored credentials or start pairing
await core.initialize();

// If not paired, start QR code pairing
if (!core.isPaired()) {
  const pairingCode = await core.startPairing();
  // Display QR code with: https://your-domain.com/pair?code=XXXXXX
}

// Handle content updates
core.onContentUpdate((content) => {
  renderContent(content);
});

// Handle commands
core.onCommand((command) => {
  switch (command.type) {
    case 'reboot':
      // Handle reboot
      break;
    case 'reload':
      // Refresh content
      break;
  }
});
```

---

## Android Player

### Project Structure

```
mobile/
├── android/
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── java/com/bizscreen/player/
│   │   │   │   ├── MainActivity.kt
│   │   │   │   ├── PlayerActivity.kt
│   │   │   │   ├── PairingActivity.kt
│   │   │   │   └── services/
│   │   │   ├── res/
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle
│   └── build.gradle
└── shared-core/
```

### Build Configuration

```gradle
// android/app/build.gradle
android {
    namespace 'com.bizscreen.player'
    compileSdk 34

    defaultConfig {
        applicationId "com.bizscreen.player"
        minSdk 21  // Android 5.0 for TV
        targetSdk 34
        versionCode 1
        versionName "1.0.0"
    }

    buildTypes {
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt')
        }
    }

    // For Android TV
    leanback {
        enabled true
    }
}
```

### Signing Configuration

```gradle
// Create keystore for release builds
// keytool -genkey -v -keystore bizscreen-release.keystore \
//   -alias bizscreen -keyalg RSA -keysize 2048 -validity 10000

android {
    signingConfigs {
        release {
            storeFile file("bizscreen-release.keystore")
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias "bizscreen"
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

### Build Commands

```bash
# Debug build
cd mobile/android
./gradlew assembleDebug

# Release build
./gradlew assembleRelease

# Install on device
adb install app/build/outputs/apk/release/app-release.apk
```

---

## iOS/tvOS Player

### Project Structure

```
mobile/
├── ios/
│   ├── BizScreenPlayer/
│   │   ├── AppDelegate.swift
│   │   ├── SceneDelegate.swift
│   │   ├── PlayerViewController.swift
│   │   ├── PairingViewController.swift
│   │   └── Services/
│   ├── BizScreenPlayer.xcodeproj
│   └── Podfile
└── shared-core/
```

### Requirements

- Xcode 15+
- iOS 14+ / tvOS 14+
- Apple Developer account

### Build Configuration

```swift
// Info.plist key settings
// App Transport Security: Allow HTTPS only
// Background Modes: Audio, Background fetch, Remote notifications
```

### Signing

1. Configure in Xcode:
   - Team: Your Apple Developer Team
   - Bundle ID: `com.bizscreen.player`
   - Signing Certificate: Distribution

2. Create provisioning profiles in Apple Developer Portal

### Build Commands

```bash
# Build for device
xcodebuild -scheme BizScreenPlayer -configuration Release -archivePath build/BizScreenPlayer.xcarchive archive

# Export IPA
xcodebuild -exportArchive -archivePath build/BizScreenPlayer.xcarchive -exportPath build/ -exportOptionsPlist ExportOptions.plist
```

---

## QR Code Pairing Flow

### Flow Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   TV/Device  │     │   BizScreen  │     │  Admin User  │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │ 1. Generate Code   │                    │
       │───────────────────>│                    │
       │                    │                    │
       │ 2. Display QR      │                    │
       │<───────────────────│                    │
       │                    │                    │
       │                    │  3. Scan QR Code   │
       │                    │<───────────────────│
       │                    │                    │
       │                    │  4. Assign Screen  │
       │                    │<───────────────────│
       │                    │                    │
       │ 5. Poll for Status │                    │
       │───────────────────>│                    │
       │                    │                    │
       │ 6. Return API Key  │                    │
       │<───────────────────│                    │
       │                    │                    │
       │ 7. Start Playing   │                    │
       │                    │                    │
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/screens/generate-code` | POST | Generate pairing code |
| `/api/screens/pair` | POST | Claim pairing code |
| `/api/screens/heartbeat` | POST | Update device status |

### QR Code Format

The QR code contains a URL that the admin scans:

```
https://your-domain.com/pair?code=ABC123
```

---

## Offline Mode

### Caching Strategy

1. **Content Caching**
   - Playlist metadata cached in localStorage
   - Media files cached in IndexedDB
   - Maximum cache size: 500MB (configurable)

2. **Cache Invalidation**
   - On content update from server
   - On manual refresh command
   - LRU eviction when cache is full

### Implementation

```javascript
// CacheManager.js handles offline content
class CacheManager {
  async cacheContent(playlistId, content) {
    // Store playlist metadata
    await this.db.put('playlists', { id: playlistId, ...content });

    // Cache media files
    for (const item of content.items) {
      await this.cacheMediaFile(item.url, item.id);
    }
  }

  async getCachedContent(playlistId) {
    return this.db.get('playlists', playlistId);
  }

  async getContentWithFallback(screenId) {
    try {
      // Try server first
      const content = await this.api.getPlayerContent(screenId);
      await this.cacheContent(content.playlist.id, content);
      return { content, offline: false };
    } catch (error) {
      // Fall back to cache
      const cached = await this.getCachedPlaylist(screenId);
      if (cached) {
        return { content: cached, offline: true };
      }
      throw new Error('No content available');
    }
  }
}
```

---

## Remote Commands

### Available Commands

| Command | Description | Payload |
|---------|-------------|---------|
| `reboot` | Restart the device | - |
| `reload` | Refresh content | - |
| `clear_cache` | Clear local cache | - |
| `reset` | Factory reset | - |
| `screenshot` | Take screenshot | - |
| `set_volume` | Adjust volume | `{ volume: 0-100 }` |
| `show_message` | Display overlay | `{ message, duration }` |

### Command Processing

```javascript
// CommandHandler.js
class CommandHandler {
  async processCommand(command) {
    const { commandId, commandType, payload } = command;

    try {
      switch (commandType) {
        case 'reboot':
          await this.reportSuccess(commandId);
          this.platform.reboot();
          break;

        case 'reload':
          await this.core.refreshContent();
          await this.reportSuccess(commandId);
          break;

        case 'clear_cache':
          await this.cache.clear();
          await this.reportSuccess(commandId);
          break;

        default:
          await this.reportError(commandId, 'Unknown command');
      }
    } catch (error) {
      await this.reportError(commandId, error.message);
    }
  }
}
```

---

## Telemetry & Analytics

### Tracked Events

| Event | Description |
|-------|-------------|
| `app_start` | App launched |
| `content_loaded` | Playlist loaded |
| `content_play_start` | Media playback started |
| `content_play_end` | Media playback ended |
| `error` | Error occurred |
| `offline_mode_enter` | Switched to offline |
| `offline_mode_exit` | Reconnected |
| `command_received` | Remote command received |
| `command_executed` | Command completed |

### Batching

Events are batched and uploaded periodically:

```javascript
// TelemetryService.js
class TelemetryService {
  trackEvent(eventType, data) {
    this.eventQueue.push({
      type: eventType,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      data
    });

    if (this.eventQueue.length >= BATCH_SIZE) {
      this.uploadEvents();
    }
  }

  async uploadEvents() {
    if (this.eventQueue.length === 0) return;

    const batch = this.eventQueue.splice(0, BATCH_SIZE);
    try {
      await this.api.post('/screens/telemetry', { events: batch });
    } catch (error) {
      // Re-queue on failure
      this.eventQueue.unshift(...batch);
    }
  }
}
```

---

## Distribution

### Android Distribution

1. **Google Play Store**
   ```bash
   # Build release APK/AAB
   ./gradlew bundleRelease

   # Upload to Play Console
   # - Create app listing
   # - Upload AAB file
   # - Submit for review
   ```

2. **Direct APK Distribution**
   - Host APK on your server
   - Enable "Unknown sources" on device
   - Use MDM for enterprise deployment

3. **Enterprise MDM**
   - Compatible with: Scalefusion, ManageEngine, etc.
   - Push silent installs
   - Configure kiosk mode

### iOS Distribution

1. **App Store**
   ```bash
   # Archive in Xcode
   # Upload to App Store Connect
   # Submit for review
   ```

2. **Enterprise Distribution**
   - Requires Apple Enterprise Program
   - In-house app distribution
   - MDM push

3. **TestFlight**
   - For beta testing
   - Up to 10,000 testers

---

## Troubleshooting

### Common Issues

**Device Not Pairing**
- Verify network connectivity
- Check if pairing code is still valid (5 min expiry)
- Ensure API URL is correct

**Content Not Displaying**
- Check device has valid API key stored
- Verify playlist is assigned to screen
- Check network/offline mode status

**Offline Mode Not Working**
- Verify IndexedDB is supported
- Check cache size limits
- Ensure content was cached before going offline

**High Battery/CPU Usage**
- Reduce polling intervals
- Optimize video playback settings
- Check for memory leaks

### Debug Mode

Enable debug logging:

```javascript
// In config.js
export const config = {
  DEBUG_MODE: true,
  LOG_LEVEL: 'debug'
};
```

### Logs

```javascript
// View telemetry in console
localStorage.setItem('bizscreen_debug', 'true');

// Export logs
const logs = JSON.parse(localStorage.getItem('bizscreen_logs') || '[]');
console.log(logs);
```

### Support

For issues:
1. Check device logs
2. Review telemetry in admin dashboard
3. Contact support with device ID and timestamp
