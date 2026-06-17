import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// The designer is shipped INSIDE the Android APK as static assets loaded over
// the `https://appassets.androidplatform.net/` virtual host (WebViewAssetLoader)
// or `file://` — so every URL must be RELATIVE. `base: './'` guarantees that.
//
// `@web` points at `./vendor` — VENDORED snapshots of the genuine Vaultkeeper
// SPA leaf components (BoardCard, PileWidget, OpponentBoard) and the real design
// tokens (style.css), so this repo is fully self-contained and buildable by
// anyone with no access to the private Vaultkeeper repo. See vendor/README.md.
// The vendored files keep their original relative imports (`../../../lib/assets`
// resolves to `vendor/lib/assets.js`), so they're dropped in unmodified except
// for a provenance header. The region wrappers (src/pieces/*) compose those real
// leaves with region-container CSS copied verbatim from VirtualBoard.vue.
//
// `VITE_ASSETS_URL='.'` makes `vendor/lib/assets.js` resolve `/card-back.jpg` to
// the bundled `public/card-back.jpg` — keeping the leaves offline-safe.
export default defineConfig({
  base: './',
  plugins: [vue()],
  define: {
    'import.meta.env.VITE_ASSETS_URL': JSON.stringify('.'),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@web': fileURLToPath(new URL('./vendor', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // A single self-contained bundle is simplest to ship into android assets.
    chunkSizeWarningLimit: 1500,
  },
})
