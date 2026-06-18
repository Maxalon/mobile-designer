// A baked-in sample board snapshot so the designer renders a fully-populated
// table with ZERO dependency on the Vaultkeeper game server. The shape matches
// the real Colyseus room snapshot the live board consumes: a `player` with a
// `board` of named zones, each `{ kind, visibility, count, cards[] }`, and each
// card a CardInstance `{ instanceId, scryfallId, tapped, face, x, y, ... }`.
//
// `scryfallId` here uses a `name:<Card Name>` sentinel resolved by
// designerImages.js via Scryfall's public fuzzy-name endpoint — so we don't
// have to hard-code printing UUIDs and the art still loads (and caches) online.

let seq = 0
const card = (name, extra = {}) => ({
  instanceId: `inst-${++seq}`,
  scryfallId: `name:${name}`,
  tapped: false,
  isToken: false,
  faceDown: false,
  face: 0,
  counters: {},
  ptOverride: '',
  ...extra,
})

// Battlefield cards carry fractional x/y (0..1) for free placement, mirroring
// the live board's geometry.
const battlefield = [
  card('Sol Ring', { x: 0.16, y: 0.30, tapped: true }),
  card('Arcane Signet', { x: 0.30, y: 0.30 }),
  card('Command Tower', { x: 0.44, y: 0.30 }),
  card('Llanowar Elves', { x: 0.62, y: 0.34 }),
  card('Cultivate', { x: 0.78, y: 0.32 }),
  card('Birds of Paradise', { x: 0.22, y: 0.66, counters: { '+1/+1': 1 } }),
  card('Beast Within', { x: 0.40, y: 0.66 }),
  card('Avenger of Zendikar', { x: 0.60, y: 0.68, ptOverride: '7/7' }),
  card('Eternal Witness', { x: 0.80, y: 0.66 }),
]

const hand = [
  card('Cyclonic Rift'),
  card('Rhystic Study'),
  card('Smothering Tithe'),
  card('Swords to Plowshares'),
  card('Counterspell'),
  card('Demonic Tutor'),
  card('Kodama of the East Tree'),
]

const zone = (kind, visibility, count, cards = []) => ({ kind, visibility, count, cards })

export function makeSampleSnapshot() {
  return {
    sessionId: 'you',
    name: 'You',
    life: 40,
    counters: {},
    board: {
      battlefield: zone('battlefield', 'public', battlefield.length, battlefield),
      hand: zone('hand', 'owner', hand.length, hand),
      library: zone('library', 'hidden', 92, []),
      graveyard: zone('graveyard', 'public', 3, [card('Cultivate'), card('Beast Within'), card('Eternal Witness')]),
      exile: zone('exile', 'public', 1, [card('Swords to Plowshares')]),
      command: zone('command', 'public', 1, [card('Kinnan, Bonder Prodigy')]),
      sideboard: zone('sideboard', 'owner', 0, []),
    },
  }
}

// A trimmed opponent snapshot for the "Opponent board" piece.
export function makeSampleOpponent() {
  return {
    sessionId: 'opp',
    name: 'Opponent',
    life: 36,
    board: {
      battlefield: zone('battlefield', 'public', 4, [
        card('Island'), card('Forest'), card('Brainstorm'), card('Tarmogoyf', { ptOverride: '4/5' }),
      ]),
      hand: zone('hand', 'owner', 5, []),
      library: zone('library', 'hidden', 88, []),
      graveyard: zone('graveyard', 'public', 2, [card('Ponder'), card('Preordain')]),
      exile: zone('exile', 'public', 0, []),
      command: zone('command', 'public', 1, [card('Urza, Lord High Artificer')]),
      sideboard: zone('sideboard', 'owner', 0, []),
    },
  }
}
