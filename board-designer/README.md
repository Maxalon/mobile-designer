# Board Layout Designer

An **offline Android design tool** for composing the Vaultkeeper "virtual
engine" play-board layout. Users drag/resize/add/remove board regions on a
fixed landscape canvas, then **export a layout proposal** (JSON + PNG) via the
system share sheet — so everyone can submit a layout and we converge on the
optimal one.

It contacts no private backend. The only network call is to **Scryfall's public
image API** for card art, which is cached to `localStorage` so the tool keeps
working offline after first load.

This repo is **fully self-contained** — clone and build it with no access to any
private repo. The board's presentational components are vendored under
`web/vendor/` (see `web/vendor/README.md`).

## How it works

```
board-designer/
  web/         Vite + Vue 3 — the WebView content (the actual designer UI)
    vendor/    Vendored snapshots of the genuine board leaf components + tokens
  android/     Minimal WebView host APK (plain Activity, androidx.webkit)
```

- **Exact design, no re-skin.** The web bundle imports the GENUINE board leaf
  components (`vendor/components/play/board/{BoardCard,PileWidget,OpponentBoard}.vue`)
  and the real design tokens (`vendor/style.css`) via the `@web` alias, so
  colours/typography/card rendering are pixel-identical to the real app. Region
  containers (control row, battlefield, pile rail, hand) are thin wrappers whose
  layout CSS is copied verbatim from the app's `VirtualBoard` (attributed in each
  file) — we deliberately avoid pulling in the full board so the offline tool
  doesn't drag in an API client / auth store.
- **Sample data, not the game server.** `src/sampleSnapshot.js` provides a
  baked-in populated board. Card art resolves through `src/designerImages.js`
  (Scryfall), a drop-in for the SPA's `usePlayCardImages()`.
- **Editing.** `src/snap.js` is the pure geometry core: edge snapping (canvas +
  neighbour edges) and overlap prevention. `src/Designer.vue` wires pointer
  drag/resize, the add palette, delete, rename, and export/import.
- **Native bridge.** `src/bridge.js` calls `window.AndroidBridge` when present
  (share sheet / SAF file picker — see `MainActivity.kt`); in a plain browser it
  falls back to file downloads, so the designer is also usable on desktop.

## Layout file format

Exported `*.json` (schema `vk-board-layout`, v1):

```jsonc
{
  "schema": "vk-board-layout",
  "version": 1,
  "canvas": { "w": 1280, "h": 720 },   // logical landscape coords
  "pieces": [
    { "id": "...", "kind": "battlefield", "title": "Battlefield",
      "x": 8, "y": 44, "w": 1264, "h": 332 }
  ]
}
```

`kind` is one of the real regions (`controls`, `battlefield`, `piles`, `hand`,
`opponent`) or a proposed placeholder (`phases`, `stack`, `custom`). A `custom`
piece carries the user's free-text `title` so the intent is unambiguous.

## Develop

```bash
# Web designer (runs in any browser — full editing UX, downloads instead of share)
cd board-designer/web
npm install
npm run dev          # http://localhost:5173
npm run test         # snap-geometry unit tests
npm run build        # → dist/  (copied into the APK by Gradle)

# APK (needs Android SDK; web bundle must be built first)
cd board-designer/web && npm run build
cd ../android && ./gradlew assembleDebug
# → app/build/outputs/apk/debug/app-debug.apk
```

CI (`.github/workflows/board-designer.yml`) builds the web bundle (with tests),
then assembles the debug APK and uploads it as a workflow artifact.

## Scope / status (v1)

- **In:** real board regions pre-placed in their default arrangement; move +
  resize with edge/neighbour snapping and no overlap; add (opponent board, turn-
  phases & stack presets, custom titled box) / remove / rename; export JSON+PNG
  via share sheet; import a JSON to keep editing or review someone else's.
- **Out (by request):** the participant bar (`SeatTile`: life/counters/identity)
  is a fixed component and intentionally excluded; per-piece restyle/rotate is
  deferred (move + resize only).
