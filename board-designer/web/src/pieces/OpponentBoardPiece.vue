<script setup>
// Opponent board piece — uses the REAL OpponentBoard.vue component (it only
// depends on vue + the two leaf components, so it's exact and offline-safe).
import OpponentBoard from '@web/components/play/board/OpponentBoard.vue'

defineProps({
  player: { type: Object, required: true },
  images: { type: Object, required: true },
})
</script>

<template>
  <div class="ob-wrap">
    <OpponentBoard :player="player" :images="images" />
  </div>
</template>

<style scoped>
.ob-wrap {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: var(--radius-md);
}
</style>
