<script setup>
// The board's control row, rendered for LAYOUT (static, non-interactive). The
// markup + CSS below are copied verbatim from VirtualBoard.vue's `.vb-controls`
// block so the design matches the real board exactly. Kept in this thin wrapper
// (rather than importing VirtualBoard) so the row is an independently
// placeable designer piece and we don't pull in the board's networked children.
</script>

<template>
  <div class="vb-controls">
    <button class="vb-btn">Draw</button>
    <button class="vb-btn">Draw 7</button>
    <button class="vb-btn">Opening hand…</button>
    <button class="vb-btn">Shuffle</button>
    <span class="vb-sep" />
    <button class="vb-btn">＋ Token</button>
    <button class="vb-btn">Die</button>
    <span class="vb-sep" />
    <button class="vb-btn ghost">Load deck</button>
  </div>
</template>

<style scoped>
/* ↓ copied from VirtualBoard.vue (.vb-controls / .vb-btn / .vb-sep) */
.vb-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--hairline);
  flex-shrink: 0;
  height: 100%;
  overflow: hidden;
  background: var(--bg-1);
}
.vb-btn {
  height: 26px;
  padding: 0 12px;
  background: var(--bg-2);
  border: 1px solid var(--hairline);
  border-radius: 999px;
  color: var(--ink-90);
  font-size: 11px;
  font-weight: 600;
  cursor: default;
  white-space: nowrap;
}
.vb-btn.ghost { background: transparent; }
.vb-sep { width: 1px; height: 16px; background: var(--hairline-strong); margin: 0 2px; }
</style>
