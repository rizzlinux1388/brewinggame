'use client'

import { PlayingCard } from './PlayingCard'
import type { GameStateUpdate, ParticipantView, TrickCompleteData } from '@/types/socket-events'

type Props = {
  gameState: GameStateUpdate
  seats: ParticipantView[]
  lastTrick: TrickCompleteData | null
  onDismiss?: () => void
}

export function TrickPile({ gameState, seats, lastTrick, onDismiss }: Props) {
  const cards = gameState.trickCards.length > 0
    ? gameState.trickCards
    : lastTrick?.cards ?? []

  const isCompleted = gameState.trickCards.length === 0 && lastTrick !== null

  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 opacity-30 text-gray-400 text-sm">
        Waiting for first card…
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <div className="text-xs text-gray-400">
          {isCompleted ? 'Last Trick' : 'Current Trick'}
        </div>
        {isCompleted && onDismiss && (
          <button
            onClick={onDismiss}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            ✕
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {cards.map((tc) => {
          const seat = seats.find((s) => s.seatPosition === tc.seatPosition)
          const isWinner = isCompleted && lastTrick?.winningSeat === tc.seatPosition
          return (
            <div key={tc.seatPosition} className="flex flex-col items-center gap-1">
              <PlayingCard
                suitId={tc.card.suitId}
                rankId={tc.card.rankId}
                faceUp
                size="sm"
                selected={isWinner}
              />
              <span className={`text-xs max-w-[48px] truncate ${isWinner ? 'text-yellow-400 font-medium' : 'text-gray-400'}`}>
                {seat?.username ?? `P${tc.seatPosition + 1}`}
              </span>
            </div>
          )
        })}
      </div>
      {isCompleted && lastTrick && lastTrick.pointsScored.some((p) => p.points > 0) && (
        <div className="text-xs text-yellow-300">
          +{lastTrick.pointsScored.reduce((s, p) => s + p.points, 0)} pts
        </div>
      )}
    </div>
  )
}
