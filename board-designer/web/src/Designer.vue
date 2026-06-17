<script setup>
import { computed, onMounted, onBeforeUnmount, reactive, ref } from 'vue'
import PieceContent from './PieceContent.vue'
import { CANVAS, PIECE_TYPES, defaultLayout, nextId, spawnRect } from './layout.js'
import { resolveMove, resolveResize } from './snap.js'
import { exportLayout, importLayout } from './bridge.js'
import { makeSampleSnapshot, makeSampleOpponent } from './sampleSnapshot.js'
import { useDesignerImages } from './designerImages.js'

const snapshot = makeSampleSnapshot()
const opponent = makeSampleOpponent()
const images = useDesignerImages()

// ── Layout state ────────────────────────────────────────────────────────────
const pieces = reactive(defaultLayout())
const selectedId = ref(null)
const addedCount = ref(0)

const selected = computed(() => pieces.find((p) => p.id === selectedId.value) || null)
function othersOf(id) {
  return pieces.filter((p) => p.id !== id)
}

// ── Canvas scaling (logical 1280×720 → device) ──────────────────────────────
const stageEl = ref(null)
const canvasEl = ref(null)
const scale = ref(1)
function fit() {
  const el = stageEl.value
  if (!el) return
  const pad = 0
  scale.value = Math.min(
    (el.clientWidth - pad) / CANVAS.w,
    (el.clientHeight - pad) / CANVAS.h,
  )
}
let ro
onMounted(() => {
  fit()
  ro = new ResizeObserver(fit)
  if (stageEl.value) ro.observe(stageEl.value)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  ro?.disconnect()
  window.removeEventListener('keydown', onKey)
})

// ── Drag / resize ───────────────────────────────────────────────────────────
const drag = reactive({ active: false, mode: null, id: null, edges: null, startRect: null, px: 0, py: 0, last: null })

function startMove(piece, ev) {
  selectedId.value = piece.id
  drag.active = true
  drag.mode = 'move'
  drag.id = piece.id
  drag.startRect = { x: piece.x, y: piece.y, w: piece.w, h: piece.h }
  drag.last = { ...drag.startRect }
  drag.px = ev.clientX
  drag.py = ev.clientY
  ev.target.setPointerCapture?.(ev.pointerId)
  ev.preventDefault()
}

function startResize(piece, edges, ev) {
  selectedId.value = piece.id
  drag.active = true
  drag.mode = 'resize'
  drag.id = piece.id
  drag.edges = edges
  drag.startRect = { x: piece.x, y: piece.y, w: piece.w, h: piece.h }
  drag.last = { ...drag.startRect }
  drag.px = ev.clientX
  drag.py = ev.clientY
  ev.target.setPointerCapture?.(ev.pointerId)
  ev.stopPropagation()
  ev.preventDefault()
}

function onPointerMove(ev) {
  if (!drag.active) return
  const dx = (ev.clientX - drag.px) / scale.value
  const dy = (ev.clientY - drag.py) / scale.value
  const piece = pieces.find((p) => p.id === drag.id)
  if (!piece) return
  const others = othersOf(drag.id)
  let rect
  if (drag.mode === 'move') {
    rect = resolveMove(
      { x: drag.startRect.x + dx, y: drag.startRect.y + dy, w: drag.startRect.w, h: drag.startRect.h },
      others, CANVAS, drag.last,
    )
  } else {
    rect = resolveResize(drag.startRect, dx, dy, drag.edges, others, CANVAS, drag.last)
  }
  drag.last = rect
  piece.x = rect.x
  piece.y = rect.y
  piece.w = rect.w
  piece.h = rect.h
}

function endDrag() {
  drag.active = false
  drag.mode = null
  drag.id = null
  drag.edges = null
}

// ── Palette: add / remove ───────────────────────────────────────────────────
const paletteOpen = ref(false)
function addPiece(kind) {
  let title = PIECE_TYPES[kind]?.label ?? 'New region'
  if (kind === 'custom') {
    const name = window.prompt('Name this region (what should it be?)', 'New region')
    if (name === null) return
    title = name.trim() || 'New region'
  }
  const r = spawnRect(kind, addedCount.value++)
  pieces.push({ id: nextId(kind), kind, title, ...r })
  selectedId.value = pieces[pieces.length - 1].id
  paletteOpen.value = false
}

function removeSelected() {
  if (!selected.value) return
  const i = pieces.findIndex((p) => p.id === selectedId.value)
  if (i >= 0) pieces.splice(i, 1)
  selectedId.value = null
}

function renameSelected() {
  if (!selected.value) return
  const name = window.prompt('Rename region', selected.value.title)
  if (name === null) return
  selected.value.title = name.trim() || selected.value.title
}

function onKey(ev) {
  if (ev.key === 'Delete' || ev.key === 'Backspace') {
    if (selectedId.value && !isEditingField(ev)) {
      ev.preventDefault()
      removeSelected()
    }
  } else if (ev.key === 'Escape') {
    selectedId.value = null
    paletteOpen.value = false
  }
}
function isEditingField(ev) {
  const t = ev.target
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')
}

// ── Toolbar actions ─────────────────────────────────────────────────────────
const busy = ref(false)
const toast = ref('')
function flash(msg) {
  toast.value = msg
  setTimeout(() => { if (toast.value === msg) toast.value = '' }, 2600)
}

async function onExport() {
  busy.value = true
  const prev = selectedId.value
  selectedId.value = null // hide selection chrome from the snapshot
  try {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const res = await exportLayout(pieces, canvasEl.value, 'board-layout')
    flash(res.shared === 'native'
      ? `Shared${res.png ? ' (JSON + PNG)' : ' (JSON)'}`
      : `Downloaded${res.png ? ' JSON + PNG' : ' JSON'}`)
  } catch (e) {
    flash(`Export failed: ${e.message}`)
  } finally {
    selectedId.value = prev
    busy.value = false
  }
}

async function onImport() {
  try {
    const incoming = await importLayout()
    pieces.splice(0, pieces.length, ...incoming)
    selectedId.value = null
    flash(`Loaded ${incoming.length} pieces`)
  } catch (e) {
    flash(`Import failed: ${e.message}`)
  }
}

function onReset() {
  if (!window.confirm('Reset to the real board layout? Your changes will be lost.')) return
  pieces.splice(0, pieces.length, ...defaultLayout())
  selectedId.value = null
  addedCount.value = 0
}

const HANDLES = [
  { k: 'nw', edges: { t: true, l: true } },
  { k: 'n', edges: { t: true } },
  { k: 'ne', edges: { t: true, r: true } },
  { k: 'e', edges: { r: true } },
  { k: 'se', edges: { b: true, r: true } },
  { k: 's', edges: { b: true } },
  { k: 'sw', edges: { b: true, l: true } },
  { k: 'w', edges: { l: true } },
]

const ADDABLE = ['opponent', 'phases', 'stack', 'custom']
</script>

<template>
  <div class="dz" @pointermove="onPointerMove" @pointerup="endDrag" @pointercancel="endDrag">
    <!-- Toolbar -->
    <header class="dz-bar">
      <span class="dz-title">Board Layout Designer</span>
      <span class="dz-spacer" />
      <button class="dz-tool" @click="paletteOpen = !paletteOpen">＋ Add piece</button>
      <button class="dz-tool" :disabled="!selected" @click="renameSelected">Rename</button>
      <button class="dz-tool danger" :disabled="!selected" @click="removeSelected">Remove</button>
      <span class="dz-sep" />
      <button class="dz-tool" @click="onImport">Import…</button>
      <button class="dz-tool" @click="onReset">Reset</button>
      <button class="dz-tool primary" :disabled="busy" @click="onExport">
        {{ busy ? 'Exporting…' : 'Export / Share' }}
      </button>
    </header>

    <!-- Palette dropdown -->
    <div v-if="paletteOpen" class="dz-palette" @pointerdown.stop>
      <button v-for="k in ADDABLE" :key="k" class="dz-palette-item" @click="addPiece(k)">
        <span class="dz-palette-label">{{ PIECE_TYPES[k].label }}</span>
        <span class="dz-palette-kind">{{ PIECE_TYPES[k].real ? 'real' : (PIECE_TYPES[k].hint || 'placeholder') }}</span>
      </button>
    </div>

    <!-- Stage holds the scaled, fixed-size logical canvas -->
    <div ref="stageEl" class="dz-stage" @pointerdown="selectedId = null">
      <div
        ref="canvasEl"
        class="dz-canvas"
        :style="{ width: CANVAS.w + 'px', height: CANVAS.h + 'px', transform: `scale(${scale})` }"
        @pointerdown.stop
      >
        <div
          v-for="p in pieces"
          :key="p.id"
          class="dz-piece"
          :class="{ selected: p.id === selectedId }"
          :style="{ left: p.x + 'px', top: p.y + 'px', width: p.w + 'px', height: p.h + 'px' }"
          @pointerdown="startMove(p, $event)"
        >
          <div class="dz-piece-body">
            <PieceContent :piece="p" :snapshot="snapshot" :opponent="opponent" :images="images" />
          </div>

          <!-- Selection chrome (hidden in exports because selection is cleared) -->
          <template v-if="p.id === selectedId">
            <span class="dz-piece-tag">{{ p.title }}</span>
            <span
              v-for="h in HANDLES"
              :key="h.k"
              class="dz-handle"
              :class="'h-' + h.k"
              @pointerdown="startResize(p, h.edges, $event)"
            />
          </template>
        </div>
      </div>
    </div>

    <div v-if="toast" class="dz-toast">{{ toast }}</div>
  </div>
</template>
