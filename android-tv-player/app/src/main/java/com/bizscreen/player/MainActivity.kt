package com.bizscreen.player

import android.annotation.SuppressLint
import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import android.view.KeyEvent
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.webkit.*
import android.widget.FrameLayout

class MainActivity : Activity() {

    private lateinit var webView: WebView
    private lateinit var wakeLock: PowerManager.WakeLock
    private var kioskEnabled = false
    private val handler = Handler(Looper.getMainLooper())

    companion object {
        private const val TAG = "BizScreenPlayer"
        private const val PREFS_NAME = "bizscreen_player_prefs"
        private const val KEY_KIOSK_MODE = "kiosk_mode"
        private const val KEY_AUTO_START = "auto_start"
        private const val RETRY_DELAY_MS = 30000L
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.d(TAG, "MainActivity onCreate")

        // Hide system UI for immersive mode
        enterImmersiveMode()

        // Acquire wake lock to prevent sleep
        acquireWakeLock()

        // Keep screen on
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // Setup WebView
        setupWebView()

        // Check kiosk mode preference
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        kioskEnabled = prefs.getBoolean(KEY_KIOSK_MODE, true)

        // Start kiosk service if enabled
        if (kioskEnabled) {
            startKioskMode()
        }

        // Load the player URL
        val playerUrl = BuildConfig.PLAYER_URL
        Log.d(TAG, "Loading player URL: $playerUrl")
        webView.loadUrl(playerUrl)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView = WebView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }
        setContentView(webView)

        webView.settings.apply {
            // Enable JavaScript (required for React app)
            javaScriptEnabled = true

            // Enable DOM storage (localStorage, sessionStorage)
            domStorageEnabled = true

            // Enable database storage (IndexedDB)
            databaseEnabled = true

            // Allow file access for local caching
            allowFileAccess = true
            allowContentAccess = true

            // Media playback settings - autoplay without user gesture
            mediaPlaybackRequiresUserGesture = false

            // Cache settings
            cacheMode = WebSettings.LOAD_DEFAULT

            // Mixed content (allow HTTPS to load HTTP resources if needed)
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE

            // Zoom controls (disabled for TV)
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false

            // User agent (identify as BizScreen TV Player)
            userAgentString = "$userAgentString BizScreenTV/1.0"

            // Enable hardware acceleration
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                safeBrowsingEnabled = false
            }
        }

        // Enable hardware acceleration
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)

        // WebView client for handling navigation
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url.toString()
                // Keep all bizscreen URLs in the WebView
                return if (url.contains("bizscreen.com") ||
                           url.contains("localhost") ||
                           url.contains("10.0.2.2") ||
                           url.contains("supabase")) {
                    false
                } else {
                    // Block external URLs for security
                    Log.w(TAG, "Blocked external URL: $url")
                    true
                }
            }

            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)
                Log.d(TAG, "Page finished loading: $url")
                // Inject native bridge after page loads
                injectNativeBridge()
            }

            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame) {
                    Log.e(TAG, "WebView error: ${error.errorCode} - ${error.description}")
                    handleLoadError(error.errorCode)
                }
            }
        }

        // Chrome client for console logging and full screen video
        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(message: ConsoleMessage): Boolean {
                Log.d("WebView", "${message.message()} -- ${message.sourceId()}:${message.lineNumber()}")
                return true
            }

            private var customView: View? = null
            private var customViewCallback: CustomViewCallback? = null

            override fun onShowCustomView(view: View, callback: CustomViewCallback) {
                // Handle full-screen video
                customView = view
                customViewCallback = callback
                webView.visibility = View.GONE
                addContentView(view, FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                ))
            }

            override fun onHideCustomView() {
                customView?.let { view ->
                    view.visibility = View.GONE
                    (view.parent as? android.view.ViewGroup)?.removeView(view)
                }
                customViewCallback?.onCustomViewHidden()
                customView = null
                customViewCallback = null
                webView.visibility = View.VISIBLE
            }
        }

        // JavaScript interface for native commands
        webView.addJavascriptInterface(WebAppInterface(this), "AndroidBridge")
    }

    private fun injectNativeBridge() {
        // Inject JavaScript to connect web player with native commands
        val script = """
            (function() {
                if (window.BizScreenNative) return; // Already injected

                window.BizScreenNative = {
                    isNativeApp: true,
                    platform: 'androidtv',
                    version: '1.0.0',

                    reboot: function() {
                        AndroidBridge.reboot();
                    },

                    enableKiosk: function(enable) {
                        AndroidBridge.enableKiosk(enable);
                    },

                    getDeviceInfo: function() {
                        return JSON.parse(AndroidBridge.getDeviceInfo());
                    },

                    exitApp: function(password) {
                        return AndroidBridge.exitApp(password);
                    },

                    clearCache: function() {
                        AndroidBridge.clearCache();
                    },

                    setAutoStart: function(enable) {
                        AndroidBridge.setAutoStart(enable);
                    }
                };

                // Notify web app that native bridge is ready
                window.dispatchEvent(new CustomEvent('bizscreen-native-ready'));
                console.log('BizScreen native bridge injected');
            })();
        """.trimIndent()

        webView.evaluateJavascript(script, null)
    }

    private fun handleLoadError(errorCode: Int) {
        Log.d(TAG, "Handling load error, will retry in ${RETRY_DELAY_MS}ms")

        // Show a basic offline message
        val offlineHtml = """
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        background: #0f172a;
                        color: white;
                        font-family: system-ui, -apple-system, sans-serif;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                        text-align: center;
                    }
                    .container { max-width: 500px; padding: 2rem; }
                    .icon {
                        width: 80px;
                        height: 80px;
                        background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                        border-radius: 20px;
                        margin: 0 auto 2rem;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    h1 { font-size: 2rem; margin-bottom: 1rem; font-weight: 600; }
                    p { color: #94a3b8; margin-bottom: 2rem; font-size: 1.1rem; line-height: 1.6; }
                    .status {
                        color: #64748b;
                        font-size: 0.9rem;
                        padding: 1rem;
                        background: rgba(255,255,255,0.05);
                        border-radius: 8px;
                    }
                    .spinner {
                        width: 24px;
                        height: 24px;
                        border: 3px solid #334155;
                        border-top-color: #3b82f6;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        display: inline-block;
                        vertical-align: middle;
                        margin-right: 8px;
                    }
                    @keyframes spin { to { transform: rotate(360deg); } }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <rect x="2" y="3" width="20" height="14" rx="2" />
                            <path d="M8 21h8" />
                            <path d="M12 17v4" />
                        </svg>
                    </div>
                    <h1>Connection Lost</h1>
                    <p>Unable to connect to BizScreen. Please check your network connection.</p>
                    <div class="status">
                        <span class="spinner"></span>
                        Reconnecting automatically...
                    </div>
                </div>
            </body>
            </html>
        """.trimIndent()

        webView.loadDataWithBaseURL(null, offlineHtml, "text/html", "UTF-8", null)

        // Auto-retry after delay
        handler.postDelayed({
            Log.d(TAG, "Retrying connection...")
            webView.loadUrl(BuildConfig.PLAYER_URL)
        }, RETRY_DELAY_MS)
    }

    private fun enterImmersiveMode() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false)
            window.insetsController?.let {
                it.hide(WindowInsets.Type.systemBars())
                it.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            )
        }
    }

    @SuppressLint("WakelockTimeout")
    private fun acquireWakeLock() {
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.FULL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
            "BizScreen::PlayerWakeLock"
        )
        wakeLock.acquire()
        Log.d(TAG, "Wake lock acquired")
    }

    private fun startKioskMode() {
        Log.d(TAG, "Starting kiosk mode")

        // Start foreground service to maintain kiosk mode
        val serviceIntent = Intent(this, KioskService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent)
        } else {
            startService(serviceIntent)
        }

        // Pin app to screen (requires device owner)
        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val componentName = ComponentName(this, DeviceAdminReceiver::class.java)

        if (dpm.isDeviceOwnerApp(packageName)) {
            Log.d(TAG, "Device owner - enabling lock task mode")
            dpm.setLockTaskPackages(componentName, arrayOf(packageName))
            startLockTask()
        } else {
            Log.d(TAG, "Not device owner - kiosk mode limited")
        }
    }

    // Handle D-pad navigation - pass to WebView
    override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
        return when (keyCode) {
            KeyEvent.KEYCODE_DPAD_CENTER,
            KeyEvent.KEYCODE_ENTER -> {
                // Pass enter/select to WebView
                webView.dispatchKeyEvent(event)
                true
            }
            KeyEvent.KEYCODE_BACK -> {
                if (kioskEnabled) {
                    // In kiosk mode, notify web app
                    webView.evaluateJavascript("window.BizScreenNative?.onBackPressed?.();", null)
                    true
                } else if (webView.canGoBack()) {
                    webView.goBack()
                    true
                } else {
                    super.onKeyDown(keyCode, event)
                }
            }
            else -> super.onKeyDown(keyCode, event)
        }
    }

    override fun onResume() {
        super.onResume()
        Log.d(TAG, "onResume")
        enterImmersiveMode()
        webView.onResume()
    }

    override fun onPause() {
        super.onPause()
        Log.d(TAG, "onPause")
        webView.onPause()
    }

    override fun onDestroy() {
        Log.d(TAG, "onDestroy")
        handler.removeCallbacksAndMessages(null)
        if (::wakeLock.isInitialized && wakeLock.isHeld) {
            wakeLock.release()
            Log.d(TAG, "Wake lock released")
        }
        webView.destroy()
        super.onDestroy()
    }

    // Public method for native bridge to reload content
    fun reloadWebView() {
        runOnUiThread {
            Log.d(TAG, "Reloading WebView")
            webView.reload()
        }
    }

    // Public method for native bridge to execute JavaScript
    fun executeJavaScript(script: String) {
        runOnUiThread {
            webView.evaluateJavascript(script, null)
        }
    }

    // Public method for native bridge to enable/disable kiosk
    fun setKioskMode(enabled: Boolean) {
        kioskEnabled = enabled
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putBoolean(KEY_KIOSK_MODE, enabled).apply()

        if (enabled) {
            startLockTask()
        } else {
            stopLockTask()
        }
    }
}
