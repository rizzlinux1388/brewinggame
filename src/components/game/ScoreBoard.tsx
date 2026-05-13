'use client'

import type { GameStateUpdate } from '@/types/socket-events'
import type { ParticipantView } from '@/types/socket-events'

type Props = {
  gameState: GameStateUpdate
  seats: ParticipantView[]
  mySeat: number | null
}

export function ScoreBoard({ gameState, seats, mySeat }: Props) {
  return (
    <div className="card-panel">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
        Scores — Round {gameState.roundNumber}
      </h3>
      <div className="space-y-1.5">
        {gameState.scores.map((s) => {
          const seat = seats.find((p) => p.seatPosition === s.seatPosition)
          const isMe = s.seatPosition === mySeat
          const isCurrent = s.seatPosition === gameState.currentTurn

          return (
            <div
              key={s.seatPosition}
              className={`flex items-center justify-between text-sm rounded px-2 py-1 ${
                isMe ? 'bg-emerald-900/30 border border-emerald-800' : ''
              } ${isCurrent ? 'ring-1 ring-yellow-400' : ''}`}
            >
              <div className="flex items-center gap-2">
                {isCurrent && <span className="text-yellow-400 text-xs">▶</span>}
                <span className={isMe ? 'text-emerald-300 font-medium' : 'text-gray-300'}>
                  {seat?.isAI ? '🤖 ' : ''}
                  {seat?.username ?? `Seat ${s.seatPosition + 1}`}
                  {isMe && ' (you)'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                {s.bid !== undefined && (
                  <span className="text-gray-500">bid: {s.bid}</span>
                )}
                <span className="text-gray-500">tricks: {s.tricksWon}</span>
                <span className="font-bold text-white">{s.score}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
