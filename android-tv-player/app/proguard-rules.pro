# Add project specific ProGuard rules here.

# Keep WebAppInterface methods for JavaScript bridge
-keepclassmembers class com.bizscreen.player.WebAppInterface {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Kotlin metadata
-keepattributes *Annotation*
-keep class kotlin.Metadata { *; }
