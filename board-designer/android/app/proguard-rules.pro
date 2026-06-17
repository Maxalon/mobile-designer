# The JS bridge is referenced by name from the WebView page, so keep it.
-keepclassmembers class com.vaultkeeper.boarddesigner.MainActivity$DesignerBridge {
    @android.webkit.JavascriptInterface <methods>;
}
