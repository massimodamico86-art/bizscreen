package com.bizscreen.player

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.util.Log

/**
 * Boot receiver that auto-starts the BizScreen player when the device boots.
 * Supports Android TV, Fire TV, and standard Android devices.
 */
class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "BizScreenBootReceiver"
        private const val PREFS_NAME = "bizscreen_player_prefs"
        private const val KEY_AUTO_START = "auto_start"
        private const val BOOT_DELAY_MS = 3000L // 3 second delay for system stability
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return

        Log.d(TAG, "Received boot action: $action")

        when (action) {
            Intent.ACTION_BOOT_COMPLETED,
            "android.intent.action.QUICKBOOT_POWERON",
            Intent.ACTION_LOCKED_BOOT_COMPLETED,
            // Fire TV specific actions
            "com.amazon.device.software.ota.action.POST_INSTALL",
            "amazon.intent.action.SEND_BOOT_COMPLETED" -> {
                handleBootCompleted(context)
            }
        }
    }

    private fun handleBootCompleted(context: Context) {
        // Check if auto-start is enabled (default: true)
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val autoStart = prefs.getBoolean(KEY_AUTO_START, true)

        if (autoStart) {
            Log.d(TAG, "Auto-start enabled, launching BizScreen Player in ${BOOT_DELAY_MS}ms")

            // Small delay to ensure system is ready
            Handler(Looper.getMainLooper()).postDelayed({
                try {
                    val launchIntent = Intent(context, MainActivity::class.java).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                        addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
                    }
                    context.startActivity(launchIntent)
                    Log.d(TAG, "BizScreen Player launched successfully")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to launch BizScreen Player", e)
                }
            }, BOOT_DELAY_MS)
        } else {
            Log.d(TAG, "Auto-start disabled, not launching")
        }
    }
}
