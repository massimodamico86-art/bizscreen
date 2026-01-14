plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.bizscreen.player"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.bizscreen.player"
        minSdk = 21  // Android 5.0 - minimum for Fire TV Stick
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        // Player URL configuration
        buildConfigField("String", "PLAYER_URL", "\"https://app.bizscreen.com/player\"")
    }

    buildTypes {
        debug {
            isDebuggable = true
            // Use emulator localhost for development
            buildConfigField("String", "PLAYER_URL", "\"http://10.0.2.2:5173/player\"")
        }

        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            buildConfigField("String", "PLAYER_URL", "\"https://app.bizscreen.com/player\"")
        }
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }

    kotlinOptions {
        jvmTarget = "1.8"
    }

    lint {
        // Disable leanback launcher warning for flexibility
        disable += "MissingLeanbackLauncher"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.webkit:webkit:1.9.0")
    implementation("androidx.leanback:leanback:1.0.0")
}
