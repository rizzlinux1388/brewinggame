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
import { GameLog } from '@/components/game/GameLog'
import { getSocket } from '@/lib/socket-client'
import type { ParticipantView, GameStateUpdate } from '@/types/socket-events'

function OpponentSlot({ seat, gameState }: { seat: ParticipantView; gameState: GameStateUpdate }) {
  const cardCount = gameState.playersCardCounts.find(
    (c) => c.seatPosition === seat.seatPosition
  )?.count ?? 0
  const isTurn = gameState.currentTurn === seat.seatPosition

  return (
    <div className="flex flex-col items-center gap-1">
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
}

export default function GameRoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const { data: session } = useSession()
  const userId = session?.user?.id

  const socket = useSocket(roomId, userId)
  const store = useGameStore()

  useEffect(() => {
    store.reset()
    store.setRoom(roomId)
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

  const opponents = store.seats.filter((s) => s.seatPosition !== store.mySeat)
  const totalSeats = store.seats.length

  // Map opponents to positions: left, top, right based on relative seat
  function getOpponentPosition(opponentSeat: number): 'left' | 'top' | 'right' {
    const mySeat = store.mySeat ?? 0
    const rel = (opponentSeat - mySeat + totalSeats) % totalSeats
    if (totalSeats <= 3) return 'top'
    if (rel === 1) return 'left'
    if (rel === totalSeats - 1) return 'right'
    return 'top'
  }

  const leftOpponents = opponents.filter((s) => getOpponentPosition(s.seatPosition) === 'left')
  const topOpponents = opponents.filter((s) => getOpponentPosition(s.seatPosition) === 'top')
  const rightOpponents = opponents.filter((s) => getOpponentPosition(s.seatPosition) === 'right')

  return (
    <div className="min-h-screen flex flex-col" style={{ background: store.definition?.uiHints?.tableColor ?? '#1a6b3c' }}>
      <div className="flex-1 flex flex-col md:flex-row gap-4 p-4">
        {/* Sidebar: scores + log */}
        <aside className="md:w-56 shrink-0 flex flex-col gap-3">
          <ScoreBoard
            gameState={store.gameState}
            seats={store.seats}
            mySeat={store.mySeat}
          />
          <GameLog entries={store.gameLog} />
        </aside>

        {/* Main table — circular layout */}
        <main className="flex-1 grid min-h-0"
          style={{
            gridTemplateAreas: `". top ." "left center right" ". bottom ."`,
            gridTemplateColumns: '10rem 1fr 10rem',
            gridTemplateRows: 'auto 1fr auto',
          }}
        >
          {/* Top opponents */}
          <div style={{ gridArea: 'top' }} className="flex gap-4 flex-wrap justify-center items-end pb-4">
            {topOpponents.map((seat) => (
              <OpponentSlot key={seat.seatPosition} seat={seat} gameState={store.gameState!} />
            ))}
          </div>

          {/* Left opponent */}
          <div style={{ gridArea: 'left' }} className="flex flex-col items-center justify-center gap-2 pr-2">
            {leftOpponents.map((seat) => (
              <OpponentSlot key={seat.seatPosition} seat={seat} gameState={store.gameState!} />
            ))}
          </div>

          {/* Center: trick pile or bid panel */}
          <div style={{ gridArea: 'center' }} className="flex flex-col items-center justify-center gap-3">
            {isBiddingPhase && isMyTurn && store.yourTurn ? (
              <BidPanel
                validMoves={store.yourTurn.validMoves}
                roomId={roomId}
                socket={socket}
              />
            ) : (
              <TrickPile
                gameState={store.gameState}
                seats={store.seats}
                lastTrick={store.lastTrick}
                onDismiss={() => store.setLastTrick(null)}
              />
            )}
            {isMyTurn && !isBiddingPhase && (
              <div className="text-yellow-300 text-sm font-semibold animate-pulse">
                Your turn — select a card
              </div>
            )}
          </div>

          {/* Right opponent */}
          <div style={{ gridArea: 'right' }} className="flex flex-col items-center justify-center gap-2 pl-2">
            {rightOpponents.map((seat) => (
              <OpponentSlot key={seat.seatPosition} seat={seat} gameState={store.gameState!} />
            ))}
          </div>

          {/* Bottom: player hand */}
          <div style={{ gridArea: 'bottom' }} className="flex flex-col items-center pt-4">
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
