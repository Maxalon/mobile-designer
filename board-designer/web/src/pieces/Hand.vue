<script setup>
// The hand region. Renders the REAL BoardCard leaf in the same fanned overlap
// the live board uses. Container CSS copied verbatim from VirtualBoard.vue's
// `.vb-hand*` blocks.
import { computed } from 'vue'
import BoardCard from '@web/components/play/board/BoardCard.vue'

const props = defineProps({
  cards: { type: Array, default: () => [] },
  images: { type: Object, required: true },
})

// Same fan rule as the live board: a wide hand overlaps harder.
const handOverlap = computed(() => (props.cards.length > 7 ? -42 : -10))
const count = computed(() => props.cards.length)
</script>

<template>
  <div class="vb-hand-wrap">
    <div v-if="!cards.length" class="vb-hand-empty">Empty hand</div>
    <div v-else class="vb-hand" :style="{ '--hand-overlap': `${handOverlap}px` }">
      <div
        v-for="(c, i) in cards"
        :key="c.instanceId"
        class="vb-hand-card"
        :style="{ marginLeft: i === 0 ? '0' : 'var(--hand-overlap)' }"
      >
        <BoardCard :card="c" :images="images" :scale="0.62" />
      </div>
    </div>
    <span class="vb-hand-label">Hand · {{ count }}</span>
  </div>
</template>

<style scoped>
/* ↓ copied from VirtualBoard.vue (.vb-hand-wrap / .vb-hand / .vb-hand-card …) */
.vb-hand-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 6px 12px 8px;
  border-top: 1px solid var(--hairline);
  background: var(--bg-1);
  overflow: hidden;
  display: flex;
  align-items: flex-end;
}
.vb-hand {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  width: 100%;
}
.vb-hand-card { transition: transform 0.12s ease; }
.vb-hand-card:hover { transform: translateY(-10px); z-index: 2; }
.vb-hand-empty {
  display: grid;
  place-items: center;
  width: 100%;
  font-size: 12px;
  color: var(--ink-50);
}
.vb-hand-label {
  position: absolute;
  left: 12px;
  top: 8px;
  font-family: var(--font-mono), monospace;
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-50);
}
</style>
