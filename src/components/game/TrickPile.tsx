'use client'

import { PlayingCard } from './PlayingCard'
import type { GameStateUpdate, ParticipantView } from '@/types/socket-events'

type Props = {
  gameState: GameStateUpdate
  seats: ParticipantView[]
}

export function TrickPile({ gameState, seats }: Props) {
  if (gameState.trickCards.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 opacity-30 text-gray-400 text-sm">
        Waiting for first card…
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-xs text-gray-400">Current Trick</div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {gameState.trickCards.map((tc) => {
          const seat = seats.find((s) => s.seatPosition === tc.seatPosition)
          return (
            <div key={tc.seatPosition} className="flex flex-col items-center gap-1">
              <PlayingCard
                suitId={tc.card.suitId}
                rankId={tc.card.rankId}
                faceUp
                size="sm"
              />
              <span className="text-xs text-gray-400 max-w-[48px] truncate">
                {seat?.username ?? `P${tc.seatPosition + 1}`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
