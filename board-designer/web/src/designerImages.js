import { ref, shallowReactive } from 'vue'

// Drop-in replacement for the SPA's usePlayCardImages() that resolves art from
// SCRYFALL's PUBLIC API (api.scryfall.com) instead of the Tailscale-walled
// Vaultkeeper server — so the designer never touches the private stack.
//
// Same reactive surface the real BoardCard / PileWidget expect:
//   resolved, revision, ensure(id), get(id), imageForCard(card)
// A resolved entry is { name, front, back }.
//
// Two id forms are accepted:
//   - a Scryfall printing UUID            → GET /cards/{uuid}
//   - a `name:<Card Name>` sentinel        → GET /cards/named?fuzzy=<name>
// Results are memoised in-module AND mirrored to localStorage, so once art has
// loaded online it keeps rendering OFFLINE on later launches.

const SCRYFALL = 'https://api.scryfall.com'
const LS_KEY = 'vk-designer-card-cache-v1'
const LOOKUP_TIMEOUT_MS = 8000

// id → Promise<{ name, front, back }>
const cardCache = new Map()

function loadPersisted() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}
let persisted = loadPersisted()

function persist(id, entry) {
  try {
    persisted[id] = entry
    localStorage.setItem(LS_KEY, JSON.stringify(persisted))
  } catch {
    /* quota / private mode — in-memory cache still serves the session */
  }
}

function endpointFor(id) {
  if (id.startsWith('name:')) {
    return `${SCRYFALL}/cards/named?fuzzy=${encodeURIComponent(id.slice(5))}`
  }
  return `${SCRYFALL}/cards/${encodeURIComponent(id)}`
}

function pickImages(row) {
  // Single-faced: top-level image_uris. DFC: card_faces[].image_uris.
  const top = row.image_uris || {}
  const faces = Array.isArray(row.card_faces) ? row.card_faces : []
  const front = top.normal || top.large || top.small || faces[0]?.image_uris?.normal || ''
  const back = faces[1]?.image_uris?.normal || ''
  return { name: row.name || '', front, back }
}

function resolveCard(id) {
  if (!id) return Promise.resolve(null)
  if (cardCache.has(id)) return cardCache.get(id)
  if (persisted[id]) {
    const p = Promise.resolve(persisted[id])
    cardCache.set(id, p)
    return p
  }
  const lookup = (async () => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), LOOKUP_TIMEOUT_MS)
    try {
      const res = await fetch(endpointFor(id), {
        signal: ctrl.signal,
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) throw new Error(`scryfall ${res.status}`)
      const row = await res.json()
      const entry = pickImages(row)
      persist(id, entry)
      return entry
    } finally {
      clearTimeout(timer)
    }
  })()
  lookup.catch(() => cardCache.delete(id))
  cardCache.set(id, lookup)
  return lookup
}

export function useDesignerImages() {
  const resolved = shallowReactive({})
  const revision = ref(0)

  function ensure(id) {
    if (!id || resolved[id]) return
    resolveCard(id)
      .then((entry) => {
        if (entry) {
          resolved[id] = entry
          revision.value++
        }
      })
      .catch(() => { /* evicted; a later ensure retries */ })
  }

  function get(id) {
    void revision.value
    return id ? resolved[id] ?? null : null
  }

  function imageForCard(card) {
    void revision.value
    if (!card) return { src: '', isBack: true, name: '' }
    if (!card.scryfallId || card.faceDown) return { src: '', isBack: true, name: '' }
    ensure(card.scryfallId)
    const entry = resolved[card.scryfallId]
    if (!entry) return { src: '', isBack: false, name: '' }
    const wantBack = card.face === 1 && !!entry.back
    return { src: wantBack ? entry.back : entry.front, isBack: false, name: entry.name }
  }

  return { resolved, revision, ensure, get, imageForCard }
}
