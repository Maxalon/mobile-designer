import { describe, it, expect } from 'vitest'
import { intersects, snapValue, resolveMove, resolveResize, SNAP, MIN_W, MIN_H } from '../snap.js'

const CANVAS = { w: 1280, h: 720 }

describe('intersects', () => {
  it('detects overlap and adjacency', () => {
    const a = { x: 0, y: 0, w: 100, h: 100 }
    expect(intersects(a, { x: 50, y: 50, w: 100, h: 100 })).toBe(true)
    // Flush adjacency is NOT an overlap.
    expect(intersects(a, { x: 100, y: 0, w: 100, h: 100 })).toBe(false)
    expect(intersects(a, { x: 0, y: 100, w: 100, h: 100 })).toBe(false)
  })
})

describe('snapValue', () => {
  it('snaps within threshold to the nearest candidate', () => {
    expect(snapValue(5, [0, 100])).toBe(0)
    expect(snapValue(96, [0, 100])).toBe(100)
  })
  it('leaves value untouched beyond threshold', () => {
    expect(snapValue(50, [0, 100])).toBe(50)
  })
})

describe('resolveMove', () => {
  const last = { x: 200, y: 200, w: 100, h: 100 }

  it('snaps a near-edge move to the canvas border', () => {
    const r = resolveMove({ x: SNAP - 2, y: 300, w: 100, h: 100 }, [], CANVAS, last)
    expect(r.x).toBe(0)
  })

  it('clamps inside the canvas', () => {
    const r = resolveMove({ x: 9999, y: 9999, w: 100, h: 100 }, [], CANVAS, last)
    expect(r.x).toBe(CANVAS.w - 100)
    expect(r.y).toBe(CANVAS.h - 100)
  })

  it('snaps flush against a neighbour right edge', () => {
    const neighbour = { x: 100, y: 300, w: 100, h: 100 } // right edge at x=200
    const r = resolveMove({ x: 198, y: 300, w: 100, h: 100 }, [neighbour], CANVAS, last)
    expect(r.x).toBe(200) // sits flush to the right, no overlap
    expect(intersects(r, neighbour)).toBe(false)
  })

  it('blocks an overlapping move (keeps last valid)', () => {
    const neighbour = { x: 100, y: 300, w: 200, h: 200 }
    // Aim squarely into the neighbour, far from any snappable edge.
    const r = resolveMove({ x: 150, y: 350, w: 100, h: 100 }, [neighbour], CANVAS, last)
    expect(r).toEqual(last)
  })
})

describe('resolveResize', () => {
  const start = { x: 200, y: 200, w: 200, h: 200 }
  const last = { ...start }

  it('grows the right edge', () => {
    const r = resolveResize(start, 100, 0, { r: true }, [], CANVAS, last)
    expect(r.w).toBe(300)
    expect(r.x).toBe(200)
  })

  it('enforces the minimum width', () => {
    const r = resolveResize(start, -500, 0, { r: true }, [], CANVAS, last)
    expect(r.w).toBe(MIN_W)
  })

  it('enforces the minimum height when dragging the top up past the bottom', () => {
    const r = resolveResize(start, 0, 500, { t: true }, [], CANVAS, last)
    expect(r.h).toBe(MIN_H)
  })

  it('blocks a resize that would overlap a neighbour', () => {
    const neighbour = { x: 420, y: 200, w: 100, h: 200 }
    const r = resolveResize(start, 60, 0, { r: true }, [neighbour], CANVAS, last)
    // 200+200+60 = 460 would cross into the neighbour at x=420 → rejected.
    expect(r).toEqual(last)
  })
})
