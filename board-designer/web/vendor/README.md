# Vendored board components

These files are **verbatim snapshots** from the (private) Vaultkeeper SPA,
copied here so this designer repo is **fully self-contained** — anyone can clone
and build it without access to the private repo.

| Vendored file | Upstream source (Vaultkeeper SPA) |
| --- | --- |
| `components/play/board/BoardCard.vue` | `web/src/components/play/board/BoardCard.vue` |
| `components/play/board/PileWidget.vue` | `web/src/components/play/board/PileWidget.vue` |
| `components/play/board/OpponentBoard.vue` | `web/src/components/play/board/OpponentBoard.vue` |
| `lib/assets.js` | `web/src/lib/assets.js` |
| `style.css` | `web/src/style.css` (design tokens + base resets) |

The layout under `vendor/` mirrors the upstream tree so the files' original
relative imports keep working unchanged: `../../../lib/assets` from a board
component resolves to `vendor/lib/assets.js`. The Vite `@web` alias points at
`vendor/`, so app code imports them as `@web/components/play/board/BoardCard.vue`
and `@web/style.css`.

These are **presentational leaf components** — they depend only on `vue` and
`./lib/assets` (no API client, no auth store, no game-server coupling). That's
why only these few files are needed to render the board exactly.

## Keeping in sync

Only the **header comment** is added on copy; everything else is upstream
byte-for-byte. To refresh, re-copy from the SPA and re-add the one-line
provenance header. Do not hand-edit logic here — change it upstream and re-sync,
so the designer keeps matching the real board.
