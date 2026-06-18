package com.vaultkeeper.boarddesigner

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.FileProvider
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject
import java.io.File

/**
 * Single-Activity WebView host for the offline board-layout designer.
 *
 * The designer (board-designer/web → app/src/main/assets/web) is served from
 * the local APK assets through [WebViewAssetLoader] at a virtual https origin,
 * so it runs OFFLINE and with a secure-context origin (needed for FileReader /
 * download semantics). The only network the page makes is to Scryfall's public
 * image API. The private Vaultkeeper stack is never contacted.
 *
 * A small [DesignerBridge] is exposed to JS as `AndroidBridge`:
 *   - shareLayout(name, json, pngDataUrl)  → system share sheet (JSON [+ PNG]).
 *   - pickLayout()                         → SAF JSON picker; the file's text is
 *     handed back to `window.__designerReceiveLayout(text)`.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    private val openJsonLauncher =
        registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri: Uri? ->
            if (uri == null) return@registerForActivityResult
            val text = runCatching {
                contentResolver.openInputStream(uri)?.bufferedReader()?.use { it.readText() }
            }.getOrNull() ?: return@registerForActivityResult
            // Hand the file contents back into the page.
            val payload = JSONObject.quote(text)
            webView.post {
                webView.evaluateJavascript(
                    "window.__designerReceiveLayout && window.__designerReceiveLayout($payload);",
                    null,
                )
            }
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true // localStorage card-art cache
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.mediaPlaybackRequiresUserGesture = false
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(
                    view: WebView,
                    request: WebResourceRequest,
                ): WebResourceResponse? = assetLoader.shouldInterceptRequest(request.url)
            }
            addJavascriptInterface(DesignerBridge(), "AndroidBridge")
        }
        setContentView(webView)

        webView.loadUrl("https://appassets.androidplatform.net/assets/web/index.html")
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }

    private fun cacheDirFiles(): File =
        File(cacheDir, "exports").apply { mkdirs() }

    private fun writeFile(name: String, bytes: ByteArray): Uri {
        val file = File(cacheDirFiles(), name)
        file.writeBytes(bytes)
        return FileProvider.getUriForFile(this, "$packageName.fileprovider", file)
    }

    private fun decodeDataUrl(dataUrl: String): ByteArray? {
        val comma = dataUrl.indexOf(',')
        if (comma < 0 || !dataUrl.startsWith("data:")) return null
        return runCatching { Base64.decode(dataUrl.substring(comma + 1), Base64.DEFAULT) }.getOrNull()
    }

    inner class DesignerBridge {
        @JavascriptInterface
        fun shareLayout(name: String, json: String, pngDataUrl: String) {
            val safe = name.ifBlank { "board-layout" }.replace(Regex("[^A-Za-z0-9._-]"), "_")
            val uris = ArrayList<Uri>()
            runCatching { uris.add(writeFile("$safe.json", json.toByteArray())) }
            if (pngDataUrl.isNotBlank()) {
                decodeDataUrl(pngDataUrl)?.let { png ->
                    runCatching { uris.add(writeFile("$safe.png", png)) }
                }
            }
            if (uris.isEmpty()) return

            val share = if (uris.size == 1) {
                Intent(Intent.ACTION_SEND).apply {
                    type = if (uris[0].toString().endsWith(".png")) "image/png" else "application/json"
                    putExtra(Intent.EXTRA_STREAM, uris[0])
                }
            } else {
                Intent(Intent.ACTION_SEND_MULTIPLE).apply {
                    type = "*/*"
                    putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris)
                }
            }
            share.putExtra(Intent.EXTRA_SUBJECT, "$safe — board layout")
            share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            runOnUiThread {
                startActivity(Intent.createChooser(share, "Share board layout"))
            }
        }

        @JavascriptInterface
        fun pickLayout() {
            runOnUiThread {
                openJsonLauncher.launch(arrayOf("application/json", "text/plain", "*/*"))
            }
        }
    }
}
