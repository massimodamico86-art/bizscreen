package com.bizscreen.player

import android.content.Context
import android.os.Build
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebStorage
import android.webkit.CookieManager
import org.json.JSONObject

/**
 * JavaScript interface for communication between the web player and native Android app.
 * Methods annotated with @JavascriptInterface are callable from JavaScript.
 */
class WebAppInterface(private val activity: MainActivity) {

    companion object {
        private const val TAG = "WebAppInterface"
        private const val PREFS_NAME = "bizscreen_player_prefs"
        private const val KEY_KIOSK_PASSWORD = "kiosk_password"
        private const val KEY_AUTO_START = "auto_start"
        private const val DEFAULT_PASSWORD = "000000"
    }

    /**
     * Reload the web player content
     */
    @JavascriptInterface
    fun reboot() {
        Log.d(TAG, "Reboot requested from web")
        activity.reloadWebView()
    }

    /**
     * Enable or disable kiosk mode
     */
    @JavascriptInterface
    fun enableKiosk(enable: Boolean) {
        Log.d(TAG, "Kiosk mode set to: $enable")
        activity.setKioskMode(enable)
    }

    /**
     * Get device information as JSON string
     */
    @JavascriptInterface
    fun getDeviceInfo(): String {
        val isFireTV = Build.MANUFACTURER.equals("Amazon", ignoreCase = true) ||
                       Build.MODEL.contains("AFT", ignoreCase = true)

        val info = JSONObject().apply {
            put("platform", "androidtv")
            put("manufacturer", Build.MANUFACTURER)
            put("model", Build.MODEL)
            put("device", Build.DEVICE)
            put("osVersion", Build.VERSION.RELEASE)
            put("sdkVersion", Build.VERSION.SDK_INT)
            put("appVersion", BuildConfig.VERSION_NAME)
            put("appVersionCode", BuildConfig.VERSION_CODE)
            put("isFireTV", isFireTV)
            put("isAndroidTV", activity.packageManager.hasSystemFeature("android.software.leanback"))
        }

        Log.d(TAG, "Device info requested: $info")
        return info.toString()
    }

    /**
     * Exit the app with password validation (for kiosk mode)
     * Returns true if exit was successful, false if password was wrong
     */
    @JavascriptInterface
    fun exitApp(password: String): Boolean {
        val prefs = activity.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val storedPassword = prefs.getString(KEY_KIOSK_PASSWORD, DEFAULT_PASSWORD)

        if (password == storedPassword) {
            Log.d(TAG, "Exit password correct, exiting app")
            activity.runOnUiThread {
                try {
                    activity.stopLockTask()
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to stop lock task", e)
                }
                activity.finishAffinity()
            }
            return true
        } else {
            Log.w(TAG, "Exit password incorrect")
            return false
        }
    }

    /**
     * Clear all WebView cache and storage
     */
    @JavascriptInterface
    fun clearCache() {
        Log.d(TAG, "Clear cache requested")
        activity.runOnUiThread {
            try {
                WebStorage.getInstance().deleteAllData()
                CookieManager.getInstance().removeAllCookies(null)
                Log.d(TAG, "Cache cleared successfully")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to clear cache", e)
            }
        }
    }

    /**
     * Enable or disable auto-start on boot
     */
    @JavascriptInterface
    fun setAutoStart(enable: Boolean) {
        Log.d(TAG, "Auto-start set to: $enable")
        val prefs = activity.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putBoolean(KEY_AUTO_START, enable).apply()
    }

    /**
     * Set the kiosk exit password
     */
    @JavascriptInterface
    fun setKioskPassword(password: String) {
        Log.d(TAG, "Kiosk password updated")
        val prefs = activity.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_KIOSK_PASSWORD, password).apply()
    }

    /**
     * Get current settings as JSON
     */
    @JavascriptInterface
    fun getSettings(): String {
        val prefs = activity.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        val settings = JSONObject().apply {
            put("autoStart", prefs.getBoolean(KEY_AUTO_START, true))
            put("kioskMode", prefs.getBoolean("kiosk_mode", true))
        }

        return settings.toString()
    }

    /**
     * Log a message from JavaScript to Android logcat
     */
    @JavascriptInterface
    fun log(level: String, message: String) {
        when (level.lowercase()) {
            "error" -> Log.e("WebApp", message)
            "warn" -> Log.w("WebApp", message)
            "info" -> Log.i("WebApp", message)
            else -> Log.d("WebApp", message)
        }
    }
}
