'use client'

import { useState } from 'react'
import { PlayingCard } from './PlayingCard'
import type { CardInHand, ValidMove } from '@/types/socket-events'
import type { TypedClientSocket } from '@/lib/socket-client'

type Props = {
  hand: CardInHand[]
  validMoves: ValidMove[]
  isMyTurn: boolean
  roomId: string
  socket: TypedClientSocket
}

export function PlayerHand({ hand, validMoves, isMyTurn, roomId, socket }: Props) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null)

  const playCardMove = validMoves.find((m) => m.type === 'play-card')
  const eligibleIds = new Set(
    playCardMove?.type === 'play-card'
      ? playCardMove.eligibleCards.map((c) => c.id)
      : []
  )

  const passCardMove = validMoves.find((m) => m.type === 'pass-cards')
  const passCount = passCardMove?.type === 'pass-cards' ? passCardMove.count : 0
  const [selectedForPass, setSelectedForPass] = useState<Set<string>>(new Set())

  function handleCardClick(card: CardInHand) {
    if (!isMyTurn) return

    if (playCardMove) {
      if (!eligibleIds.has(card.id)) return
      socket.emit(
        'game:move',
        { roomId, type: 'play-card', cards: [{ id: card.id, suitId: card.suitId, rankId: card.rankId }] },
        () => {}
      )
      setSelectedCard(null)
    } else if (passCardMove) {
      const next = new Set(selectedForPass)
      if (next.has(card.id)) {
        next.delete(card.id)
      } else if (next.size < passCount) {
        next.add(card.id)
      }
      setSelectedForPass(next)
    }
  }

  function handlePassSubmit() {
    if (selectedForPass.size !== passCount) return
    const cards = hand
      .filter((c) => selectedForPass.has(c.id))
      .map((c) => ({ id: c.id, suitId: c.suitId, rankId: c.rankId }))

    socket.emit(
      'game:move',
      {
        roomId,
        type: 'pass-cards',
        cards,
        direction: passCardMove?.type === 'pass-cards' ? passCardMove.direction : 'left',
      },
      () => {}
    )
    setSelectedForPass(new Set())
  }

  const overlap = hand.length > 7 ? `-ml-${Math.min(8, Math.floor((hand.length - 7) * 1.5))}` : 'ml-0'

  return (
    <div className="flex flex-col items-center gap-3">
      {passCardMove && isMyTurn && (
        <div className="text-sm text-yellow-300 bg-yellow-900/30 rounded-lg px-3 py-1.5">
          Select {passCount} cards to pass left
          {selectedForPass.size === passCount && (
            <button onClick={handlePassSubmit} className="ml-3 btn-primary text-xs px-2 py-1">
              Pass Cards
            </button>
          )}
        </div>
      )}

      <div className="flex items-end justify-center" style={{ gap: hand.length > 8 ? '-8px' : '4px' }}>
        {hand.map((card, i) => {
          const isInPlayMode = !!playCardMove || !!passCardMove
          const isEligible = eligibleIds.has(card.id) || !!passCardMove
          const isDisabled = isInPlayMode && !isEligible
          const isSelected = selectedForPass.has(card.id) || selectedCard === card.id

          return (
            <div
              key={card.id}
              style={{
                marginLeft: i > 0 && hand.length > 8 ? `-${Math.min(24, Math.floor((hand.length - 8) * 4))}px` : undefined,
                zIndex: isSelected ? 50 : i,
                position: 'relative',
              }}
            >
              <PlayingCard
                suitId={card.suitId}
                rankId={card.rankId}
                faceUp
                selected={isSelected}
                disabled={isDisabled}
                onClick={() => handleCardClick(card)}
                size="md"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
