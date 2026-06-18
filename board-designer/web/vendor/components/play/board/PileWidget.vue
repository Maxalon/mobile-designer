<!-- VENDORED SNAPSHOT — do not edit here.
     Copied verbatim from the private Vaultkeeper SPA (web/src/components/play/board/).
     This is a presentational leaf component (depends only on vue + ./lib/assets).
     Re-sync from upstream rather than diverging; see vendor/README.md. -->
<script setup>
import { computed } from 'vue'
import { assetUrl } from '../../../lib/assets'

// The saved card back (a server asset), shown for the library and any
// face-down pile instead of a placeholder.
const cardBackUrl = assetUrl('/card-back.jpg')

// A non-battlefield zone shown as a single stacked "pile" tile: a label, the
// card count, and — for a PUBLIC pile (graveyard / exile / command) — the top
// card's art. The library is hidden from everyone (its contents never arrive),
// so it always shows a generic back + count. A private pile the viewer owns
// (their sideboard) can show its top art; for an opponent it shows a back.
//
// Clicking a pile (PR 4b) is enabled by `interactive` (your own piles): the
// tile emits `pile-click` with the pointer event + zone name and the board
// decides what to do (library → action menu; other zones → peek the top card).
// A full zone browser/search is the PR-4c modal. Opponent piles stay inert.
const props = defineProps({
  label: { type: String, required: true },
  zone: { type: Object, default: null }, // snapshot zone { kind, visibility, count, cards }
  images: { type: Object, required: true },
  /** Force a back even for a public top card (opponent's private pile). */
  faceDown: { type: Boolean, default: false },
  scale: { type: Number, default: 1 },
  /** Enable click → emit `pile-click` (your own piles only). */
  interactive: { type: Boolean, default: false },
  /** The zone key this pile represents (library/graveyard/exile/…). */
  zoneName: { type: String, default: '' },
})
const emit = defineEmits(['pile-click'])

function onClick(event) {
  if (!props.interactive) return
  emit('pile-click', { zoneName: props.zoneName || props.zone?.kind || '', event })
}

const count = computed(() => props.zone?.count ?? props.zone?.cards?.length ?? 0)

// The "top" of a pile is the END of the cards array (draw/look from the back),
// matching the server's convention.
const topCard = computed(() => {
  const cards = props.zone?.cards
  if (!cards || !cards.length) return null
  return cards[cards.length - 1]
})

const topImage = computed(() => {
  if (props.faceDown || !topCard.value) return { src: '', isBack: true, name: '' }
  return props.images.imageForCard(topCard.value)
})

const showArt = computed(() => count.value > 0 && !!topImage.value.src && !topImage.value.isBack)
const showBack = computed(() => count.value > 0 && !showArt.value)
</script>

<template>
  <div
    class="pile"
    :class="{ interactive }"
    :style="{ '--pile-scale': scale }"
    :title="`${label}: ${count}`"
    @click="onClick"
  >
    <div class="pile-art">
      <img
        v-if="showArt"
        class="pile-img"
        :src="topImage.src"
        :alt="topImage.name || label"
        draggable="false"
      />
      <div
        v-else-if="showBack"
        class="pile-back"
        :style="{ backgroundImage: `url(${cardBackUrl})` }"
        aria-hidden="true"
      />
      <div v-else class="pile-empty" aria-hidden="true" />
      <span class="pile-count" :class="{ zero: count === 0 }">{{ count }}</span>
    </div>
    <span class="pile-label">{{ label }}</span>
  </div>
</template>

<style scoped>
.pile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}
.pile.interactive { cursor: pointer; }
.pile.interactive:hover .pile-art {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5), 0 0 0 1px color-mix(in oklab, var(--amber) 50%, transparent);
}
.pile-art {
  position: relative;
  width: calc(var(--card-width) * 0.46 * var(--pile-scale, 1));
  aspect-ratio: 63 / 88;
  border-radius: calc(7px * var(--pile-scale, 1));
  overflow: hidden;
  background: var(--bg-2);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--hairline);
}
.pile-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.pile-back {
  width: 100%;
  height: 100%;
  background-color: var(--bg-3);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
.pile-empty {
  width: 100%;
  height: 100%;
  border: 1px dashed var(--hairline-strong);
  border-radius: inherit;
  background: transparent;
}
.pile-count {
  position: absolute;
  right: 3px;
  bottom: 3px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: rgba(13, 10, 7, 0.88);
  border: 1px solid var(--hairline-strong);
  color: var(--ink-100);
  font-family: var(--font-mono), monospace;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.pile-count.zero { color: var(--ink-50); }
.pile-label {
  font-family: var(--font-mono), monospace;
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-50);
  white-space: nowrap;
}
</style>