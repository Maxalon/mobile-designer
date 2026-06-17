<script setup>
// A titled placeholder box for pieces the real board doesn't have yet — the
// custom "add a region" box plus the turn-phase / stack presets. The user's
// title is what communicates intent in the exported proposal. Styled in the
// real design language (tokens) so it sits naturally on the board.
defineProps({
  title: { type: String, default: 'New region' },
  hint: { type: String, default: '' },
})
</script>

<template>
  <div class="ph">
    <div class="ph-title">{{ title }}</div>
    <div v-if="hint" class="ph-hint">{{ hint }}</div>
  </div>
</template>

<style scoped>
.ph {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  text-align: center;
  border: 1px dashed color-mix(in oklab, var(--amber) 45%, var(--hairline-strong));
  border-radius: var(--radius-md);
  background:
    repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 9px,
      rgba(224, 176, 96, 0.035) 9px,
      rgba(224, 176, 96, 0.035) 18px
    ),
    var(--bg-1);
}
.ph-title {
  font-family: var(--font-display), serif;
  font-size: 15px;
  color: var(--ink-100);
  letter-spacing: -0.01em;
}
.ph-hint {
  font-family: var(--font-mono), monospace;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-50);
}
</style>
