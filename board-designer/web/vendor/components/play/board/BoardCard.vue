<!-- VENDORED SNAPSHOT — do not edit here.
     Copied verbatim from the private Vaultkeeper SPA (web/src/components/play/board/).
     This is a presentational leaf component (depends only on vue + ./lib/assets).
     Re-sync from upstream rather than diverging; see vendor/README.md. -->
<script setup>
import { computed } from 'vue'
import { assetUrl } from '../../../lib/assets'

// The saved card back (a server asset), shown for hidden / face-down / not-
// yet-resolved cards instead of a placeholder.
const cardBackUrl = assetUrl('/card-back.jpg')

// One card on the virtual board. Renders a CardInstance from the room snapshot:
//   - resolves its scryfallId → image via the shared resolver (passed in so
//     the whole board shares one cache + one in-flight lookup);
//   - a HIDDEN card (empty/undefined scryfallId — the server sends '' for
//     cards the viewer may not see) or a face-down card renders a generic
//     card BACK, never a resolved image;
//   - `face === 1` shows the DFC back face;
//   - `tapped` rotates the card 90°;
//   - `counters` and `ptOverride` paint small overlays;
//   - `isToken` gets a subtle corner mark.
//
// Interactions (PR 4b) only when `interactive` (YOUR OWN board). The card is
// store-agnostic: it raises pointerdown/contextmenu/menu + hover events and the
// parent board maps them to verbs. Opponent boards leave `interactive` false →
// inert, display-only.
const props = defineProps({
  card: { type: Object, required: true },
  /** usePlayCardImages() instance — shared across the board. */
  images: { type: Object, required: true },
  /** Visual scale (1 = full --card-width). Opponent boards pass < 1. */
  scale: { type: Number, default: 1 },
  /** Enable drag + context menu + hover preview (your own cards only). */
  interactive: { type: Boolean, default: false },
})
const emit = defineEmits(['card-pointerdown', 'card-menu', 'card-hover', 'card-hover-move', 'card-hover-end'])

function onPointerdown(event) {
  if (!props.interactive) return
  emit('card-pointerdown', { card: props.card, event })
}
function onContextmenu(event) {
  if (!props.interactive) return
  event.preventDefault()
  emit('card-menu', { card: props.card, event })
}
function onMenuButton(event) {
  event.stopPropagation()
  emit('card-menu', { card: props.card, event })
}
function onEnter(event) {
  if (!props.interactive) return
  emit('card-hover', { card: props.card, event })
}
function onMove(event) {
  if (!props.interactive) return
  emit('card-hover-move', { card: props.card, event })
}
function onLeave() {
  if (!props.interactive) return
  emit('card-hover-end')
}

const resolved = computed(() => props.images.imageForCard(props.card))
const showBack = computed(() => resolved.value.isBack || !resolved.value.src)
const altName = computed(() => resolved.value.name || 'Card')

const counters = computed(() => {
  const map = props.card.counters || {}
  return Object.keys(map)
    .filter((k) => map[k])
    .sort()
    .map((name) => ({ name, value: map[name] }))
})
</script>

<template>
  <div
    class="bc"
    :class="{ tapped: card.tapped, token: card.isToken, interactive }"
    :style="{ '--bc-scale': scale }"
    :title="showBack ? '' : altName"
    @pointerdown="onPointerdown"
    @contextmenu="onContextmenu"
    @mouseenter="onEnter"
    @mousemove="onMove"
    @mouseleave="onLeave"
  >
    <img
      v-if="!showBack"
      class="bc-img"
      :src="resolved.src"
      :alt="altName"
      draggable="false"
    />
    <div
      v-else
      class="bc-back"
      :style="{ backgroundImage: `url(${cardBackUrl})` }"
      aria-hidden="true"
    />

    <!-- Context-menu affordance (your own cards) -->
    <button
      v-if="interactive"
      class="bc-menu-btn"
      title="Card actions"
      aria-label="Card actions"
      @pointerdown.stop
      @click="onMenuButton"
    >⋮</button>

    <!-- Token marker (subtle corner pip) -->
    <span v-if="card.isToken" class="bc-token" title="Token">T</span>

    <!-- P/T override -->
    <span v-if="card.ptOverride" class="bc-pt">{{ card.ptOverride }}</span>

    <!-- Counters -->
    <div v-if="counters.length" class="bc-counters">
      <span v-for="c in counters" :key="c.name" class="bc-counter" :title="c.name">
        {{ c.value }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.bc {
  position: relative;
  width: calc(var(--card-width) * var(--bc-scale, 1));
  aspect-ratio: 63 / 88;
  border-radius: calc(8px * var(--bc-scale, 1));
  overflow: hidden;
  background: var(--bg-2);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--hairline);
  user-select: none;
  transition: transform 0.15s ease;
}
/* Tapped = rotate 90°. The card keeps its centre, so a battlefield card
   pivots in place. */
.bc.tapped {
  transform: rotate(90deg);
}
.bc.token {
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5), 0 0 0 1px color-mix(in oklab, var(--amber) 45%, transparent);
}
.bc.interactive { cursor: grab; touch-action: none; }
.bc.interactive:active { cursor: grabbing; }
/* The ⋮ affordance fades in on hover so resting cards stay clean. */
.bc-menu-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  z-index: 2;
  width: calc(16px * var(--bc-scale, 1));
  height: calc(16px * var(--bc-scale, 1));
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: rgba(13, 10, 7, 0.7);
  color: var(--ink-90);
  font-size: calc(12px * var(--bc-scale, 1));
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.12s ease, background 0.12s ease;
}
.bc:hover .bc-menu-btn { opacity: 1; }
.bc-menu-btn:hover { background: rgba(13, 10, 7, 0.92); color: var(--amber); }
.bc-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
/* The saved card-back image — hidden, face-down, and not-yet-resolved cards.
   The bg-color only shows through if the asset fails to load. */
.bc-back {
  width: 100%;
  height: 100%;
  background-color: var(--bg-3);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border-radius: inherit;
}
.bc-token {
  position: absolute;
  top: 2px;
  left: 2px;
  display: grid;
  place-items: center;
  width: calc(14px * var(--bc-scale, 1));
  height: calc(14px * var(--bc-scale, 1));
  border-radius: 3px;
  background: color-mix(in oklab, var(--amber) 80%, #1a1408);
  color: #1a1408;
  font-family: var(--font-mono), monospace;
  font-size: calc(9px * var(--bc-scale, 1));
  font-weight: 700;
}
.bc-pt {
  position: absolute;
  right: 3px;
  bottom: 3px;
  padding: 1px 5px;
  border-radius: 999px;
  background: rgba(13, 10, 7, 0.85);
  border: 1px solid var(--hairline-strong);
  color: var(--ink-100);
  font-family: var(--font-mono), monospace;
  font-size: calc(10px * var(--bc-scale, 1));
  font-variant-numeric: tabular-nums;
}
.bc-counters {
  position: absolute;
  left: 3px;
  bottom: 3px;
  display: flex;
  gap: 2px;
}
.bc-counter {
  display: grid;
  place-items: center;
  min-width: calc(15px * var(--bc-scale, 1));
  height: calc(15px * var(--bc-scale, 1));
  padding: 0 3px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--amber) 22%, rgba(13, 10, 7, 0.9));
  border: 1px solid color-mix(in oklab, var(--amber) 40%, transparent);
  color: var(--ink-100);
  font-family: var(--font-mono), monospace;
  font-size: calc(9px * var(--bc-scale, 1));
  font-variant-numeric: tabular-nums;
}
</style>