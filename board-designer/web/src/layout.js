// Piece-type registry + the default layout. Coordinates are LOGICAL px in a
// fixed 1280×720 (16:9) landscape canvas — the "page" users design against. The
// canvas scales to fit the device, but these logical coords stay constant, so
// an exported layout is resolution-independent and re-importable anywhere.

export const CANVAS = { w: 1280, h: 720 }

// Piece kinds. `real: true` → renders a genuine board region; the rest are
// titled placeholders for proposing pieces the board doesn't have yet.
export const PIECE_TYPES = {
  controls: { label: 'Control row', real: true, defaultSize: { w: 1280, h: 40 } },
  battlefield: { label: 'Battlefield', real: true, defaultSize: { w: 600, h: 320 } },
  piles: { label: 'Pile rail', real: true, defaultSize: { w: 760, h: 180 } },
  hand: { label: 'Hand', real: true, defaultSize: { w: 760, h: 150 } },
  opponent: { label: 'Opponent board', real: true, defaultSize: { w: 520, h: 150 } },
  phases: { label: 'Turn phases', real: false, defaultSize: { w: 360, h: 64 }, hint: 'preset' },
  stack: { label: 'Stack', real: false, defaultSize: { w: 220, h: 280 }, hint: 'preset' },
  custom: { label: 'New region', real: false, defaultSize: { w: 260, h: 140 }, hint: 'custom' },
}

let idSeq = 0
export function nextId(kind) {
  return `${kind}-${++idSeq}-${Date.now().toString(36)}`
}

// The real board's actual default arrangement (controls → battlefield → piles
// → hand), pre-placed so users tweak from the genuine starting point.
export function defaultLayout() {
  idSeq = 0
  return [
    { id: nextId('controls'), kind: 'controls', title: 'Control row', x: 0, y: 0, w: 1280, h: 40 },
    { id: nextId('battlefield'), kind: 'battlefield', title: 'Battlefield', x: 8, y: 44, w: 1264, h: 332 },
    { id: nextId('piles'), kind: 'piles', title: 'Pile rail', x: 8, y: 380, w: 1264, h: 180 },
    { id: nextId('hand'), kind: 'hand', title: 'Hand', x: 8, y: 564, w: 1264, h: 150 },
  ]
}

// A spot to drop a freshly-added piece: top-left-ish, nudged so repeats don't
// perfectly stack.
export function spawnRect(kind, n = 0) {
  const t = PIECE_TYPES[kind] ?? PIECE_TYPES.custom
  const w = Math.min(t.defaultSize.w, CANVAS.w)
  const h = Math.min(t.defaultSize.h, CANVAS.h)
  const off = (n % 5) * 24
  return {
    x: Math.min(40 + off, CANVAS.w - w),
    y: Math.min(40 + off, CANVAS.h - h),
    w,
    h,
  }
}
