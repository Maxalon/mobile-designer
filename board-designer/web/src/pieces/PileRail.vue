<script setup>
// The pile rail. Renders the REAL PileWidget leaf for each zone, so pile art /
// counts / labels are pixel-identical to the live board. Container CSS copied
// verbatim from VirtualBoard.vue's `.vb-piles` block.
import PileWidget from '@web/components/play/board/PileWidget.vue'

defineProps({
  board: { type: Object, required: true },
  images: { type: Object, required: true },
})

const PILES = [
  { name: 'library', label: 'Library', faceDown: true },
  { name: 'graveyard', label: 'Graveyard', faceDown: false },
  { name: 'exile', label: 'Exile', faceDown: false },
  { name: 'command', label: 'Command', faceDown: false },
  { name: 'sideboard', label: 'Sideboard', faceDown: false },
]
</script>

<template>
  <div class="vb-piles">
    <PileWidget
      v-for="p in PILES"
      :key="p.name"
      :label="p.label"
      :zone-name="p.name"
      :zone="board[p.name]"
      :images="images"
      :face-down="p.faceDown"
    />
  </div>
</template>

<style scoped>
/* ↓ copied from VirtualBoard.vue (.vb-piles) */
.vb-piles {
  display: flex;
  align-items: flex-end;
  gap: 14px;
  padding: 4px 12px 6px;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
  background: var(--bg-1);
  border-radius: var(--radius-md);
}
</style>
