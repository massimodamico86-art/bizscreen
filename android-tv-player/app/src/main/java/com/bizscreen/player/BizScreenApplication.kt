package com.bizscreen.player

import android.app.Application
import android.util.Log

/**
 * Application class for BizScreen Player.
 * Handles app-wide initialization and configuration.
 */
class BizScreenApplication : Application() {

    companion object {
        private const val TAG = "BizScreenApp"
    }

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "BizScreen Player Application started")
        Log.d(TAG, "Version: ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})")
        Log.d(TAG, "Player URL: ${BuildConfig.PLAYER_URL}")
    }
}
