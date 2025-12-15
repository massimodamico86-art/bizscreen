package com.bizscreen.player

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log

/**
 * Foreground service that keeps the BizScreen player running in kiosk mode.
 * This service ensures the app stays active and prevents the system from killing it.
 */
class KioskService : Service() {

    companion object {
        private const val TAG = "KioskService"
        private const val CHANNEL_ID = "bizscreen_kiosk_channel"
        private const val NOTIFICATION_ID = 1001
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "KioskService created")
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, createNotification())
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "KioskService started")
        return START_STICKY // Restart service if killed by system
    }

    override fun onDestroy() {
        Log.d(TAG, "KioskService destroyed")
        super.onDestroy()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "BizScreen Player",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Digital signage player is running"
                setShowBadge(false)
                enableLights(false)
                enableVibration(false)
                setSound(null, null)
            }

            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
            Log.d(TAG, "Notification channel created")
        }
    }

    private fun createNotification(): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("BizScreen Player")
                .setContentText("Digital signage is running")
                .setSmallIcon(android.R.drawable.ic_menu_slideshow)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .build()
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
                .setContentTitle("BizScreen Player")
                .setContentText("Digital signage is running")
                .setSmallIcon(android.R.drawable.ic_menu_slideshow)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .build()
        }
    }
}
