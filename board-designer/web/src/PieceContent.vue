<script setup>
// Maps a layout piece's `kind` to the component that renders it. Real regions
// use the genuine board leaves; presets/custom use the titled placeholder.
import ControlRow from './pieces/ControlRow.vue'
import Battlefield from './pieces/Battlefield.vue'
import PileRail from './pieces/PileRail.vue'
import Hand from './pieces/Hand.vue'
import OpponentBoardPiece from './pieces/OpponentBoardPiece.vue'
import PlaceholderPiece from './pieces/PlaceholderPiece.vue'

defineProps({
  piece: { type: Object, required: true },
  snapshot: { type: Object, required: true },
  opponent: { type: Object, required: true },
  images: { type: Object, required: true },
})
</script>

<template>
  <ControlRow v-if="piece.kind === 'controls'" />
  <Battlefield
    v-else-if="piece.kind === 'battlefield'"
    :cards="snapshot.board.battlefield.cards"
    :images="images"
  />
  <PileRail
    v-else-if="piece.kind === 'piles'"
    :board="snapshot.board"
    :images="images"
  />
  <Hand
    v-else-if="piece.kind === 'hand'"
    :cards="snapshot.board.hand.cards"
    :images="images"
  />
  <OpponentBoardPiece
    v-else-if="piece.kind === 'opponent'"
    :player="opponent"
    :images="images"
  />
  <PlaceholderPiece
    v-else
    :title="piece.title"
    :hint="piece.kind === 'custom' ? 'custom region' : 'proposed'"
  />
</template>
