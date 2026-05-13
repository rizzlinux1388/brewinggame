'use client'

import Link from 'next/link'
import type { GameEndedData, ParticipantView } from '@/types/socket-events'

type Props = {
  result: GameEndedData
  seats: ParticipantView[]
  mySeat: number | null
}

export function GameEndModal({ result, seats, mySeat }: Props) {
  const myResult = result.finalScores.find((s) => s.seatPosition === mySeat)
  const isWinner = result.winners.some((w) => w.seatPosition === mySeat)
  const sorted = [...result.finalScores].sort((a, b) => b.totalScore - a.totalScore)

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="card-panel max-w-sm w-full text-center">
        <div className="text-5xl mb-3">{isWinner ? '🏆' : '🎮'}</div>
        <h2 className="text-2xl font-bold text-white mb-1">
          {isWinner ? 'You Won!' : 'Game Over'}
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          {isWinner ? 'Congratulations!' : 'Better luck next time!'}
        </p>

        <div className="space-y-2 mb-6">
          {sorted.map((s, i) => {
            const seat = seats.find((p) => p.seatPosition === s.seatPosition)
            const isWin = result.winners.some((w) => w.seatPosition === s.seatPosition)
            const isMe = s.seatPosition === mySeat

            return (
              <div
                key={s.seatPosition}
                className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                  isWin ? 'bg-emerald-900/40 border border-emerald-700' : 'bg-gray-800'
                } ${isMe ? 'ring-1 ring-emerald-500' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">#{i + 1}</span>
                  {isWin && <span>🏆</span>}
                  <span className={isMe ? 'text-emerald-300 font-medium' : 'text-gray-300'}>
                    {seat?.username ?? `Seat ${s.seatPosition + 1}`}
                    {isMe && ' (you)'}
                  </span>
                </div>
                <span className="font-bold text-white">{s.totalScore}</span>
              </div>
            )
          })}
        </div>

        <div className="flex gap-3">
          <Link href="/lobby" className="btn-secondary flex-1">
            Back to Lobby
          </Link>
          <Link href="/games" className="btn-primary flex-1">
            Play Again
          </Link>
        </div>
      </div>
    </div>
  )
}
