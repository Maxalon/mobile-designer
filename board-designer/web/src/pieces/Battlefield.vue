<script setup>
// The battlefield region. Renders the REAL BoardCard leaf at the same scale the
// live board uses (0.5) with free x/y placement. Container CSS copied verbatim
// from VirtualBoard.vue's `.vb-field` block for an exact match.
import BoardCard from '@web/components/play/board/BoardCard.vue'

defineProps({
  cards: { type: Array, default: () => [] },
  images: { type: Object, required: true },
})
</script>

<template>
  <div class="vb-field">
    <div
      v-for="c in cards"
      :key="c.instanceId"
      class="vb-field-card"
      :style="{ left: `${(c.x ?? 0.5) * 100}%`, top: `${(c.y ?? 0.5) * 100}%` }"
    >
      <BoardCard :card="c" :images="images" :scale="0.5" />
    </div>
    <div v-if="!cards.length" class="vb-field-empty" aria-hidden="true">Battlefield</div>
  </div>
</template>

<style scoped>
/* ↓ copied from VirtualBoard.vue (.vb-field / .vb-field-card / .vb-field-empty) */
.vb-field {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: var(--radius-md);
  background:
    radial-gradient(160% 130% at 50% 0%, rgba(224, 176, 96, 0.04), transparent 60%),
    var(--bg-0);
  border: 1px solid var(--hairline);
  overflow: hidden;
}
.vb-field-card {
  position: absolute;
  transform: translate(-50%, -50%);
}
.vb-field-empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: var(--font-mono), monospace;
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-30);
  pointer-events: none;
}
</style>
