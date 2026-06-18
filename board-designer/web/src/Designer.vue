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

// ── View transform: pan + zoom (logical 1280×720 → device) ──────────────────
// The board is a fixed logical canvas rendered through a single view transform
// `translate(tx,ty) scale(s)` (origin top-left). `fit()` sets the baseline; the
// user can pinch-zoom, two-finger pan (or wheel-zoom on desktop) from there.
const stageEl = ref(null)
const canvasEl = ref(null)
const view = reactive({ scale: 1, tx: 0, ty: 0 })
const fitScale = ref(1)
const ZOOM_MIN = 0.4 // × fit
const ZOOM_MAX = 8 // × fit
const userTouched = ref(false) // once zoomed/panned, stop auto-fitting on resize

function stageRect() {
  return stageEl.value?.getBoundingClientRect() ?? { left: 0, top: 0, width: 0, height: 0 }
}
function clampScale(s) {
  return Math.max(fitScale.value * ZOOM_MIN, Math.min(fitScale.value * ZOOM_MAX, s))
}

function fit() {
  const el = stageEl.value
  if (!el) return
  const margin = 16
  const s = Math.min((el.clientWidth - margin) / CANVAS.w, (el.clientHeight - margin) / CANVAS.h)
  fitScale.value = s
  view.scale = s
  view.tx = (el.clientWidth - CANVAS.w * s) / 2
  view.ty = (el.clientHeight - CANVAS.h * s) / 2
}
function onResize() {
  if (userTouched.value) view.scale = clampScale(view.scale)
  else fit()
}
function resetView() {
  userTouched.value = false
  fit()
}

const canvasStyle = computed(() => ({
  width: CANVAS.w + 'px',
  height: CANVAS.h + 'px',
  transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
}))
const zoomPct = computed(() => Math.round((view.scale / (fitScale.value || 1)) * 100))

// Zoom keeping the stage-local point (fx,fy) anchored under the cursor/focus.
function zoomAt(fx, fy, newScale) {
  const s = clampScale(newScale)
  const wx = (fx - view.tx) / view.scale
  const wy = (fy - view.ty) / view.scale
  view.scale = s
  view.tx = fx - wx * s
  view.ty = fy - wy * s
  userTouched.value = true
}
function zoomBy(factor) {
  const r = stageRect()
  zoomAt(r.width / 2, r.height / 2, view.scale * factor)
}
function onWheel(ev) {
  ev.preventDefault()
  const r = stageRect()
  zoomAt(ev.clientX - r.left, ev.clientY - r.top, view.scale * Math.exp(-ev.deltaY * 0.0015))
}

let ro
onMounted(() => {
  fit()
  ro = new ResizeObserver(onResize)
  if (stageEl.value) ro.observe(stageEl.value)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  ro?.disconnect()
  window.removeEventListener('keydown', onKey)
})

// ── Unified pointer handling: pieces, view-pan, and 2-finger pinch ──────────
// All pointers are tracked on the root so a second finger can promote a drag/pan
// into a pinch. One finger on a piece moves it; one finger on the background
// pans the view; two fingers pinch-zoom + pan together.
const pointers = new Map() // pointerId → { x, y }
const drag = reactive({ active: false, mode: null, id: null, edges: null, startRect: null, px: 0, py: 0, last: null })
const pan = reactive({ active: false, px: 0, py: 0, moved: 0 })
const pinch = reactive({ active: false, startDist: 1, wx: 0, wy: 0 })

const distOf = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const midOf = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

function startMove(piece, ev) {
  selectedId.value = piece.id
  drag.active = true
  drag.mode = 'move'
  drag.id = piece.id
  drag.startRect = { x: piece.x, y: piece.y, w: piece.w, h: piece.h }
  drag.last = { ...drag.startRect }
  drag.px = ev.clientX
  drag.py = ev.clientY
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
}

function beginPinch() {
  const [a, b] = [...pointers.values()]
  const r = stageRect()
  const mid = midOf(a, b)
  pinch.active = true
  pinch.startDist = distOf(a, b) || 1
  pinch.scale0 = view.scale
  pinch.wx = (mid.x - r.left - view.tx) / view.scale
  pinch.wy = (mid.y - r.top - view.ty) / view.scale
}

function onPointerDown(ev) {
  pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })
  if (pointers.size === 2) {
    drag.active = false // a 2nd finger promotes any move/pan into a pinch
    pan.active = false
    beginPinch()
    return
  }
  if (pointers.size > 2) return

  const t = ev.target
  const handleEl = t.closest?.('.dz-handle')
  const pieceEl = t.closest?.('.dz-piece')
  if (handleEl && pieceEl) {
    const piece = pieces.find((p) => p.id === pieceEl.dataset.id)
    if (piece) startResize(piece, JSON.parse(handleEl.dataset.edges), ev)
  } else if (pieceEl) {
    const piece = pieces.find((p) => p.id === pieceEl.dataset.id)
    if (piece) startMove(piece, ev)
  } else {
    // Background: pan the view; a tap (no movement) deselects.
    pan.active = true
    pan.px = ev.clientX
    pan.py = ev.clientY
    pan.moved = 0
  }
}

function onPointerMove(ev) {
  if (pointers.has(ev.pointerId)) pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })

  if (pinch.active && pointers.size >= 2) {
    const [a, b] = [...pointers.values()]
    const r = stageRect()
    const mid = midOf(a, b)
    const s = clampScale(pinch.scale0 * (distOf(a, b) / pinch.startDist))
    view.scale = s
    view.tx = mid.x - r.left - pinch.wx * s
    view.ty = mid.y - r.top - pinch.wy * s
    userTouched.value = true
    return
  }

  if (drag.active) {
    const dx = (ev.clientX - drag.px) / view.scale
    const dy = (ev.clientY - drag.py) / view.scale
    const piece = pieces.find((p) => p.id === drag.id)
    if (!piece) return
    const others = othersOf(drag.id)
    const rect = drag.mode === 'move'
      ? resolveMove({ x: drag.startRect.x + dx, y: drag.startRect.y + dy, w: drag.startRect.w, h: drag.startRect.h }, others, CANVAS, drag.last)
      : resolveResize(drag.startRect, dx, dy, drag.edges, others, CANVAS, drag.last)
    drag.last = rect
    piece.x = rect.x
    piece.y = rect.y
    piece.w = rect.w
    piece.h = rect.h
    return
  }

  if (pan.active) {
    const dx = ev.clientX - pan.px
    const dy = ev.clientY - pan.py
    pan.px = ev.clientX
    pan.py = ev.clientY
    pan.moved += Math.abs(dx) + Math.abs(dy)
    view.tx += dx
    view.ty += dy
    userTouched.value = true
  }
}

function onPointerUp(ev) {
  const backgroundTap = pan.active && pan.moved < 6
  pointers.delete(ev.pointerId)
  if (pointers.size < 2) pinch.active = false
  if (pointers.size === 0) {
    if (drag.active) endDrag()
    if (pan.active) {
      if (backgroundTap) selectedId.value = null
      pan.active = false
    }
  }
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
  <div
    class="dz"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <!-- Toolbar -->
    <header class="dz-bar">
      <span class="dz-title">Board Layout Designer</span>
      <span class="dz-spacer" />
      <button class="dz-tool" @click="paletteOpen = !paletteOpen">＋ Add piece</button>
      <button class="dz-tool" :disabled="!selected" @click="renameSelected">Rename</button>
      <button class="dz-tool danger" :disabled="!selected" @click="removeSelected">Remove</button>
      <span class="dz-sep" />
      <span class="dz-sep" />
      <!-- Zoom (also: pinch / two-finger pan on touch, wheel on desktop) -->
      <div class="dz-zoom">
        <button class="dz-tool zoom" title="Zoom out" @click="zoomBy(1 / 1.25)">−</button>
        <button class="dz-tool zoom pct" title="Reset to fit" @click="resetView">{{ zoomPct }}%</button>
        <button class="dz-tool zoom" title="Zoom in" @click="zoomBy(1.25)">＋</button>
        <button class="dz-tool" title="Fit board to screen" @click="resetView">Fit</button>
      </div>
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

    <!-- Stage: the pan/zoom surface. The canvas is positioned entirely by the
         view transform (translate + scale). Wheel zooms on desktop; pinch /
         two-finger pan on touch (handled on the root). -->
    <div ref="stageEl" class="dz-stage" @wheel="onWheel">
      <div ref="canvasEl" class="dz-canvas" :style="canvasStyle">
        <div
          v-for="p in pieces"
          :key="p.id"
          class="dz-piece"
          :class="{ selected: p.id === selectedId }"
          :data-id="p.id"
          :style="{ left: p.x + 'px', top: p.y + 'px', width: p.w + 'px', height: p.h + 'px' }"
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
              :data-edges="JSON.stringify(h.edges)"
            />
          </template>
        </div>
      </div>
    </div>

    <div v-if="toast" class="dz-toast">{{ toast }}</div>
  </div>
</template>
