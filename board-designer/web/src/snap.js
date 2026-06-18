// Geometry for the designer canvas: edge snapping (to the canvas frame AND to
// other pieces' edges) plus overlap prevention. Pure functions over plain
// rects `{ x, y, w, h }` in LOGICAL canvas coordinates, so they're trivially
// unit-testable and resolution-independent.

export const SNAP = 8 // px snap threshold (logical)
export const MIN_W = 60
export const MIN_H = 36

export function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

// Snap `value` to the nearest candidate within `threshold`; else return value.
export function snapValue(value, candidates, threshold = SNAP) {
  let best = value
  let bestDist = threshold
  for (const c of candidates) {
    const d = Math.abs(c - value)
    if (d < bestDist) { bestDist = d; best = c }
  }
  return best
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

// Candidate x positions for the moving rect's LEFT edge so that either its left
// or right edge aligns with a canvas edge or any neighbour edge.
function leftCandidates(w, others, canvas) {
  const c = [0, canvas.w - w]
  for (const o of others) {
    c.push(o.x) // left↔left
    c.push(o.x + o.w) // left↔right (sit to the right of neighbour)
    c.push(o.x - w) // right↔left (sit to the left of neighbour)
    c.push(o.x + o.w - w) // right↔right
  }
  return c
}
function topCandidates(h, others, canvas) {
  const c = [0, canvas.h - h]
  for (const o of others) {
    c.push(o.y)
    c.push(o.y + o.h)
    c.push(o.y - h)
    c.push(o.y + o.h - h)
  }
  return c
}

/**
 * Resolve a MOVE. Snaps to canvas + neighbour edges, clamps inside the canvas,
 * and BLOCKS overlap: if the snapped rect would intersect a neighbour, the move
 * is rejected (returns `last`), giving solid, non-overlapping edges.
 */
export function resolveMove(desired, others, canvas, last) {
  let x = snapValue(desired.x, leftCandidates(desired.w, others, canvas))
  let y = snapValue(desired.y, topCandidates(desired.h, others, canvas))
  x = clamp(x, 0, canvas.w - desired.w)
  y = clamp(y, 0, canvas.h - desired.h)
  const rect = { x, y, w: desired.w, h: desired.h }
  if (others.some((o) => intersects(rect, o))) return { ...last }
  return rect
}

/**
 * Resolve a RESIZE from a handle. `edges` flags which sides move
 * (l/r/t/b). Snaps the moving edges to canvas/neighbour edges, enforces the
 * minimum size, keeps the rect inside the canvas, and blocks overlap.
 */
export function resolveResize(start, dx, dy, edges, others, canvas, last) {
  let { x, y, w, h } = start
  // Vertical edge candidates (for snapping the moving x-edges).
  const xEdges = [0, canvas.w]
  const yEdges = [0, canvas.h]
  for (const o of others) {
    xEdges.push(o.x, o.x + o.w)
    yEdges.push(o.y, o.y + o.h)
  }

  if (edges.l) {
    let nx = snapValue(start.x + dx, xEdges)
    nx = clamp(nx, 0, start.x + start.w - MIN_W)
    w = start.x + start.w - nx
    x = nx
  }
  if (edges.r) {
    let nr = snapValue(start.x + start.w + dx, xEdges)
    nr = clamp(nr, start.x + MIN_W, canvas.w)
    w = nr - start.x
  }
  if (edges.t) {
    let ny = snapValue(start.y + dy, yEdges)
    ny = clamp(ny, 0, start.y + start.h - MIN_H)
    h = start.y + start.h - ny
    y = ny
  }
  if (edges.b) {
    let nb = snapValue(start.y + start.h + dy, yEdges)
    nb = clamp(nb, start.y + MIN_H, canvas.h)
    h = nb - start.y
  }

  const rect = { x, y, w, h }
  if (others.some((o) => intersects(rect, o))) return { ...last }
  return rect
}
