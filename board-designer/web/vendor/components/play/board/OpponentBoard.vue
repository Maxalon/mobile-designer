<!-- VENDORED SNAPSHOT — do not edit here.
     Copied verbatim from the private Vaultkeeper SPA (web/src/components/play/board/).
     This is a presentational leaf component (depends only on vue + ./lib/assets).
     Re-sync from upstream rather than diverging; see vendor/README.md. -->
<script setup>
import { computed } from 'vue'
import BoardCard from './BoardCard.vue'
import PileWidget from './PileWidget.vue'

// One opponent's virtual seat, compact + READ-ONLY, shown along the top of
// the table. A virtual-only table has NO camera, so instead of SeatTile's
// video stage we render:
//   - an info strip (name / turn / life / counters / commanders) — the same
//     information SeatTile's strip carries, minus the video element and the
//     self-only edit controls;
//   - the opponent's battlefield (scaled down, read-only) at each card's x/y;
//   - their hand as a row of `count` backs (contents are server-hidden);
//   - their library / graveyard / exile / command / sideboard as pile counts.
//
// PR 4a is DISPLAY ONLY: no interactions here. Counters / life are read-only
// numbers (your own seat's controls live in your VirtualBoard).
const props = defineProps({
  player: { type: Object, required: true },
  isActive: { type: Boolean, default: false },
  isHostSeat: { type: Boolean, default: false },
  images: { type: Object, required: true },
})

const board = computed(() => props.player.board ?? null)
const zone = (name) => board.value?.[name] ?? null

const battlefield = computed(() => zone('battlefield')?.cards ?? [])
const handCount = computed(() => zone('hand')?.count ?? 0)

const counters = computed(() => {
  const map = props.player.counters ?? {}
  return Object.keys(map)
    .sort()
    .map((name) => ({ name, value: map[name] }))
})
const commanders = computed(() => props.player.commanders ?? [])
// A modest cap so a goldfished hand of 30 backs can't blow out the strip.
const handBacks = computed(() => Math.min(handCount.value, 12))
</script>

<template>
  <div class="ob" :class="{ active: isActive, disconnected: !player.connected }">
    <!-- Info strip (no video — virtual table) -->
    <div class="ob-strip">
      <span v-if="isActive" class="ob-turn" title="Active turn">⮕</span>
      <span class="ob-name">
        {{ player.name }}
        <span v-if="isHostSeat" class="ob-tag host">host</span>
      </span>
      <span v-if="!player.connected" class="ob-conn">reconnecting…</span>

      <span
        v-for="c in counters"
        :key="c.name"
        class="ob-counter"
        :title="c.name"
      >{{ c.name }} <strong>{{ c.value }}</strong></span>

      <span v-if="commanders.length" class="ob-cmds">
        <span v-for="cmd in commanders" :key="cmd.scryfallId || cmd.name" class="ob-cmd">
          <img v-if="cmd.image" :src="cmd.image" :alt="''" class="ob-cmd-img" />
          <span class="ob-cmd-name">{{ cmd.name }}</span>
        </span>
      </span>

      <span class="ob-life" :class="{ low: player.life <= 10 }">{{ player.life }}</span>
    </div>

    <div v-if="board" class="ob-body">
      <!-- Scaled, read-only battlefield -->
      <div class="ob-field">
        <div
          v-for="card in battlefield"
          :key="card.instanceId"
          class="ob-field-card"
          :style="{ left: `${(card.x ?? 0.5) * 100}%`, top: `${(card.y ?? 0.5) * 100}%` }"
        >
          <BoardCard :card="card" :images="images" :scale="0.32" />
        </div>
        <div v-if="!battlefield.length" class="ob-field-empty">No permanents</div>
      </div>

      <!-- Hand backs + pile counts -->
      <div class="ob-rail">
        <div class="ob-hand" :title="`Hand: ${handCount}`">
          <span
            v-for="i in handBacks"
            :key="i"
            class="ob-hand-back"
            :style="{ marginLeft: i === 1 ? '0' : '-14px' }"
          />
          <span class="ob-hand-count">{{ handCount }}</span>
        </div>
        <PileWidget label="Lib" :zone="zone('library')" :images="images" face-down :scale="0.62" />
        <PileWidget label="GY" :zone="zone('graveyard')" :images="images" :scale="0.62" />
        <PileWidget label="Exile" :zone="zone('exile')" :images="images" :scale="0.62" />
        <PileWidget label="Cmd" :zone="zone('command')" :images="images" :scale="0.62" />
      </div>
    </div>
    <div v-else class="ob-noboard">No deck loaded</div>
  </div>
</template>

<style scoped>
.ob {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-md);
  background: var(--bg-1);
  overflow: hidden;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}
.ob.active {
  border-color: color-mix(in oklab, var(--amber) 55%, var(--hairline));
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--amber) 30%, transparent);
}
.ob.disconnected { opacity: 0.6; }

.ob-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 3px 7px;
  padding: 3px 8px;
  border-bottom: 1px solid var(--hairline);
  background: var(--bg-1);
}
.ob-turn { color: var(--amber); font-size: 12px; line-height: 1; }
.ob-name {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-100);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.ob-tag {
  font-family: var(--font-mono), monospace;
  font-size: 8px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  padding: 2px 5px;
  border-radius: 3px;
}
.ob-tag.host { color: var(--amber); border: 1px solid color-mix(in oklab, var(--amber) 40%, transparent); }
.ob-conn { font-size: 11px; color: var(--r-mythic); }
.ob-counter {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 17px;
  padding: 0 7px;
  border-radius: 999px;
  background: var(--bg-2);
  border: 1px solid var(--hairline);
  color: var(--ink-70);
  font-size: 10px;
}
.ob-counter strong { color: var(--ink-100); font-variant-numeric: tabular-nums; }
.ob-cmds { display: inline-flex; gap: 4px; min-width: 0; }
.ob-cmd {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 17px;
  padding: 0 7px 0 2px;
  border-radius: 999px;
  background: var(--bg-2);
  border: 1px solid var(--hairline-strong);
  min-width: 0;
}
.ob-cmd-img { width: 13px; height: 13px; border-radius: 50%; object-fit: cover; object-position: center 18%; }
.ob-cmd-name {
  font-size: 10px;
  color: var(--ink-90);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 90px;
}
.ob-life {
  margin-left: auto;
  font-family: var(--font-display), serif;
  font-size: 16px;
  font-weight: 500;
  color: var(--ink-100);
  font-variant-numeric: tabular-nums;
  min-width: 26px;
  text-align: right;
}
.ob-life.low { color: var(--r-mythic); }

.ob-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.ob-field {
  position: relative;
  flex: 1;
  min-height: 0;
  margin: 4px;
  border-radius: var(--radius-sm);
  background:
    radial-gradient(140% 120% at 50% 0%, rgba(224, 176, 96, 0.03), transparent 60%),
    var(--bg-0);
  overflow: hidden;
}
.ob-field-card {
  position: absolute;
  transform: translate(-50%, -50%);
}
.ob-field-empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 10px;
  color: var(--ink-30);
}
.ob-rail {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 4px 8px 6px;
  border-top: 1px solid var(--hairline);
}
.ob-hand {
  position: relative;
  display: flex;
  align-items: center;
  height: calc(var(--card-width) * 0.46 * 0.62 * 88 / 63);
  padding-right: 18px;
}
.ob-hand-back {
  width: calc(var(--card-width) * 0.3 * 0.62);
  aspect-ratio: 63 / 88;
  border-radius: 4px;
  background: linear-gradient(160deg, var(--bg-4), var(--bg-2));
  border: 1px solid var(--hairline-strong);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}
.ob-hand-count {
  position: absolute;
  right: 0;
  bottom: 0;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: rgba(13, 10, 7, 0.88);
  border: 1px solid var(--hairline-strong);
  color: var(--ink-100);
  font-family: var(--font-mono), monospace;
  font-size: 10px;
}
.ob-noboard {
  padding: 14px;
  display: grid;
  place-items: center;
  font-size: 11px;
  color: var(--ink-30);
}
</style>