'use client'

import type { ParticipantView } from '@/types/socket-events'
import type { GameDefinition } from '@/types/game-definition'
import type { TypedClientSocket } from '@/lib/socket-client'

type Props = {
  roomId: string
  definition: GameDefinition | null
  seats: ParticipantView[]
  isHost: boolean
  socket: TypedClientSocket
  maxPlayers: number
  roomCode: string
}

export function WaitingRoom({ roomId, definition, seats, isHost, socket, maxPlayers, roomCode }: Props) {
  const connected = seats.filter((s) => s.isConnected || !s.isAI).length
  const canStart = connected >= (definition?.minPlayers ?? 2)

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-1">
          {definition?.name ?? 'Loading…'}
        </h2>
        <p className="text-gray-400 text-sm">
          Room Code: <span className="font-mono text-emerald-400 text-lg">{roomCode}</span>
        </p>
        <p className="text-gray-500 text-xs mt-1">Share this code with friends to join</p>
      </div>

      <div className="card-panel w-full max-w-sm">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Players ({seats.length}/{maxPlayers})
        </h3>
        <div className="space-y-2">
          {Array.from({ length: maxPlayers }).map((_, i) => {
            const seat = seats.find((s) => s.seatPosition === i)
            return (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                  seat ? 'bg-gray-800' : 'bg-gray-900 border border-dashed border-gray-700'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    seat?.isConnected ? 'bg-emerald-400' : seat ? 'bg-yellow-400' : 'bg-gray-600'
                  }`}
                />
                <span className="text-sm">
                  {seat ? (
                    <span className="text-gray-200">
                      {seat.isAI ? '🤖 ' : ''}
                      {seat.username}
                    </span>
                  ) : (
                    <span className="text-gray-600">Waiting for player…</span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {isHost && (
        <button
          onClick={() => socket.emit('room:start', { roomId })}
          disabled={!canStart}
          className="btn-primary px-10 py-3 text-lg disabled:opacity-50"
        >
          Start Game
        </button>
      )}

      {!isHost && (
        <p className="text-gray-500 text-sm">Waiting for the host to start…</p>
      )}
    </div>
  )
}
