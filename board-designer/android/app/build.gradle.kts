import java.io.ByteArrayOutputStream

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.vaultkeeper.boarddesigner"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.vaultkeeper.boarddesigner"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.webkit:webkit:1.12.1")
}

// ── Bundle the web designer into android assets ─────────────────────────────
// The WebView content (board-designer/web) builds to `web/dist`. We copy that
// into `app/src/main/assets/web` so it ships inside the APK and loads offline
// via WebViewAssetLoader. CI runs `npm ci && npm run build` in web/ before the
// Gradle build (see .github/workflows/board-designer.yml); this task wires the
// copy so a local `./gradlew assembleDebug` after a web build also works.
val webDist = file("$rootDir/../web/dist")
val assetsWeb = file("src/main/assets/web")

val syncWebAssets by tasks.registering(Copy::class) {
    from(webDist)
    into(assetsWeb)
    // Only meaningful once the web bundle exists; otherwise a no-op so the
    // module still configures (e.g. for IDE sync before the first web build).
    onlyIf { webDist.exists() }
}

tasks.named("preBuild") {
    dependsOn(syncWebAssets)
}
