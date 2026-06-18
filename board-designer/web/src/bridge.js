import { toPng } from 'html-to-image'
import { CANVAS } from './layout.js'

// Export / import / share. When running inside the Android shell, a JS bridge
// named `AndroidBridge` is injected (see MainActivity.kt) and we hand it the
// JSON + PNG to route through the system share sheet. In a plain browser we
// fall back to file downloads so the tool is fully usable on desktop too.

const SCHEMA = 'vk-board-layout'
const VERSION = 1

export function buildLayoutJson(pieces) {
  return {
    schema: SCHEMA,
    version: VERSION,
    canvas: { ...CANVAS },
    exportedAt: new Date().toISOString(),
    pieces: pieces.map((p) => ({
      id: p.id,
      kind: p.kind,
      title: p.title,
      x: Math.round(p.x),
      y: Math.round(p.y),
      w: Math.round(p.w),
      h: Math.round(p.h),
    })),
  }
}

export function parseLayoutJson(text) {
  const data = JSON.parse(text)
  if (data?.schema !== SCHEMA || !Array.isArray(data.pieces)) {
    throw new Error('Not a board-layout file')
  }
  return data.pieces.map((p) => ({
    id: String(p.id ?? `${p.kind}-${Math.random().toString(36).slice(2)}`),
    kind: String(p.kind),
    title: String(p.title ?? ''),
    x: Number(p.x) || 0,
    y: Number(p.y) || 0,
    w: Number(p.w) || 120,
    h: Number(p.h) || 80,
  }))
}

async function renderPng(canvasEl) {
  if (!canvasEl) return null
  try {
    // The on-screen canvas carries a `scale()` transform to fit the viewport;
    // capture it UNSCALED at full logical resolution for a crisp snapshot.
    const w = canvasEl.offsetWidth
    const h = canvasEl.offsetHeight
    return await toPng(canvasEl, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: '#0b0806',
      width: w,
      height: h,
      style: { transform: 'none', transformOrigin: 'top left', margin: '0' },
    })
  } catch (e) {
    // Card art from Scryfall may taint the canvas (CORS) — degrade to JSON-only
    // rather than fail the whole export.
    console.warn('PNG snapshot failed, exporting JSON only:', e)
    return null
  }
}

function download(filename, href) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

const hasNative = () =>
  typeof window !== 'undefined' &&
  window.AndroidBridge &&
  typeof window.AndroidBridge.shareLayout === 'function'

/** Export the current layout as JSON + PNG and share/save it. */
export async function exportLayout(pieces, canvasEl, name = 'board-layout') {
  const json = JSON.stringify(buildLayoutJson(pieces), null, 2)
  const pngDataUrl = await renderPng(canvasEl)

  if (hasNative()) {
    window.AndroidBridge.shareLayout(name, json, pngDataUrl || '')
    return { shared: 'native', png: !!pngDataUrl }
  }

  // Browser fallback.
  download(`${name}.json`, `data:application/json;charset=utf-8,${encodeURIComponent(json)}`)
  if (pngDataUrl) download(`${name}.png`, pngDataUrl)
  return { shared: 'download', png: !!pngDataUrl }
}

/** Ask the user for a JSON file (native picker if available, else <input>). */
export function importLayout() {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.AndroidBridge?.pickLayout) {
      // The shell calls window.__designerReceiveLayout(text) with the contents.
      window.__designerReceiveLayout = (text) => {
        try {
          resolve(parseLayoutJson(text))
        } catch (e) {
          reject(e)
        }
      }
      window.AndroidBridge.pickLayout()
      return
    }
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return reject(new Error('No file'))
      const reader = new FileReader()
      reader.onload = () => {
        try {
          resolve(parseLayoutJson(String(reader.result)))
        } catch (e) {
          reject(e)
        }
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file)
    }
    input.click()
  })
}
