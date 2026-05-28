'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import { useSocket } from '@/hooks/useSocket'
import { useGameStore } from '@/store/gameStore'
import { WaitingRoom } from '@/components/game/WaitingRoom'
import { PlayerHand } from '@/components/game/PlayerHand'
import { TrickPile } from '@/components/game/TrickPile'
import { ScoreBoard } from '@/components/game/ScoreBoard'
import { BidPanel } from '@/components/game/BidPanel'
import { GameEndModal } from '@/components/game/GameEndModal'
import { getSocket } from '@/lib/socket-client'
import { useEffect as _useEffect } from 'react'

export default function GameRoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const { data: session } = useSession()
  const userId = session?.user?.id

  const socket = useSocket(roomId, userId)
  const store = useGameStore()

  useEffect(() => {
    store.setRoom(roomId)
    store.setStatus('waiting')
  }, [roomId])

  if (store.gameResult) {
    return (
      <GameEndModal
        result={store.gameResult}
        seats={store.seats}
        mySeat={store.mySeat}
      />
    )
  }

  if (store.status === 'waiting' || !store.gameState) {
    return (
      <WaitingRoom
        roomId={roomId}
        definition={store.definition}
        seats={store.seats}
        isHost={store.hostId === userId}
        socket={socket}
        maxPlayers={store.definition?.maxPlayers ?? 4}
        roomCode={roomId.slice(-6).toUpperCase()}
      />
    )
  }

  const isMyTurn = store.gameState.currentTurn === store.mySeat
  const currentPhaseId = store.gameState.currentPhaseId
  const phase = store.definition?.phases.find((p) => p.id === currentPhaseId)
  const isBiddingPhase = phase?.type === 'bidding'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: store.definition?.uiHints?.tableColor ?? '#1a6b3c' }}>
      {/* Table area */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 p-4">
        {/* Sidebar: scores */}
        <aside className="md:w-56 shrink-0">
          <ScoreBoard
            gameState={store.gameState}
            seats={store.seats}
            mySeat={store.mySeat}
          />
        </aside>

        {/* Main table */}
        <main className="flex-1 flex flex-col items-center justify-between gap-4 min-h-0">
          {/* Opponents (top) */}
          <div className="flex gap-4 flex-wrap justify-center">
            {store.seats
              .filter((s) => s.seatPosition !== store.mySeat)
              .map((seat) => {
                const cardCount = store.gameState?.playersCardCounts.find(
                  (c) => c.seatPosition === seat.seatPosition
                )?.count ?? 0
                const isTurn = store.gameState?.currentTurn === seat.seatPosition

                return (
                  <div key={seat.seatPosition} className="flex flex-col items-center gap-1">
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        isTurn ? 'bg-yellow-400 text-black' : 'bg-gray-800 text-gray-300'
                      }`}
                    >
                      {seat.isAI ? '🤖 ' : ''}{seat.username}
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: Math.min(cardCount, 13) }).map((_, i) => (
                        <div
                          key={i}
                          className="w-5 h-8 rounded bg-blue-900 border border-blue-700"
                        />
                      ))}
                      {cardCount === 0 && (
                        <span className="text-gray-500 text-xs">no cards</span>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>

          {/* Center: trick pile */}
          <div className="flex-1 flex items-center justify-center">
            {isBiddingPhase && isMyTurn && store.yourTurn ? (
              <BidPanel
                validMoves={store.yourTurn.validMoves}
                roomId={roomId}
                socket={socket}
              />
            ) : (
              <TrickPile gameState={store.gameState} seats={store.seats} />
            )}
          </div>

          {/* Your turn indicator */}
          {isMyTurn && !isBiddingPhase && (
            <div className="text-yellow-300 text-sm font-semibold animate-pulse">
              Your turn — select a card
            </div>
          )}

          {/* Player hand */}
          <div className="w-full max-w-2xl">
            <PlayerHand
              hand={store.myHand}
              validMoves={isMyTurn ? (store.yourTurn?.validMoves ?? []) : []}
              isMyTurn={isMyTurn}
              roomId={roomId}
              socket={socket}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
