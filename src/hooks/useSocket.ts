'use client'

import { useEffect, useRef } from 'react'
import { getSocket, connectSocket } from '@/lib/socket-client'
import { useGameStore } from '@/store/gameStore'
import type { TypedClientSocket } from '@/lib/socket-client'

function seatName(seatPosition: number): string {
  const seats = useGameStore.getState().seats
  const seat = seats.find((s) => s.seatPosition === seatPosition)
  return seat ? (seat.isAI ? `🤖 ${seat.username}` : seat.username) : `Seat ${seatPosition + 1}`
}

export function useSocket(roomId: string, userId?: string | null) {
  const socketRef = useRef<TypedClientSocket | null>(null)
  const store = useGameStore()

  useEffect(() => {
    const socket = connectSocket()
    socketRef.current = socket

    socket.emit('room:join', { roomId, userId: userId ?? undefined, token: '' }, (res) => {
      if (!res.success) {
        console.error('Failed to join room:', res.error)
        return
      }
      if (res.room) {
        store.setDefinition(res.room.definition)
        store.setSeats(res.room.seats)
        store.setHostId(res.room.hostId)
        store.setStatus(res.room.status === 'IN_PROGRESS' ? 'playing' : 'waiting')
        const mySeat = res.room.seats.find((s) => s.userId === userId)?.seatPosition
        if (mySeat !== undefined) store.setMySeat(mySeat)
      }
    })

    socket.on('room:game-started', (data) => {
      store.setDefinition(data.definition)
      store.setSeats(data.seatAssignments)
      store.setStatus('playing')
      store.addLogEntry({ type: 'game', message: `Game started — ${data.definition.name}`, ts: Date.now() })

      const mySeat = data.seatAssignments.find((s) => s.userId === userId)?.seatPosition
      if (mySeat !== undefined) store.setMySeat(mySeat)
    })

    socket.on('game:state-update', (data) => {
      store.setGameState(data)
      if (data.trickCards.length > 0) {
        store.setLastTrick(null)
      }
    })

    socket.on('game:card-played', (data) => {
      const seats = useGameStore.getState().seats
      const seat = seats.find((s) => s.seatPosition === data.seatPosition)
      const name = seat ? (seat.isAI ? `🤖 ${seat.username}` : seat.username) : `Seat ${data.seatPosition + 1}`
      const suitSymbols: Record<string, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' }
      const suit = suitSymbols[data.card.suitId] ?? data.card.suitId
      store.addLogEntry({ type: 'trick', message: `${name} played ${data.card.rankId}${suit}`, ts: Date.now() })
    })

    socket.on('game:your-hand', (data) => {
      store.setMyHand(data.cards)
    })

    socket.on('game:your-turn', (data) => {
      store.setYourTurn(data)
    })

    socket.on('game:phase-changed', (data) => {
      store.addLogEntry({ type: 'phase', message: `— ${data.phase.label} —`, ts: Date.now() })
    })

    socket.on('game:trick-complete', (data) => {
      store.setLastTrick(data)
      store.setYourTurn(null)

      const totalPts = data.pointsScored.reduce((sum, p) => sum + p.points, 0)
      const winnerName = seatName(data.winningSeat)
      const msg = totalPts > 0
        ? `${winnerName} won the trick (+${totalPts} pts)`
        : `${winnerName} won the trick`
      store.addLogEntry({ type: 'trick', message: msg, ts: Date.now() })

      setTimeout(() => store.setLastTrick(null), 2500)
    })

    socket.on('game:hand-complete', (data) => {
      store.setLastHand(data)

      const seats = useGameStore.getState().seats
      const scoreLines = data.scores
        .sort((a, b) => a.seatPosition - b.seatPosition)
        .map((s) => {
          const name = seats.find((seat) => seat.seatPosition === s.seatPosition)?.username ?? `Seat ${s.seatPosition + 1}`
          const prefix = s.roundPoints > 0 ? `+${s.roundPoints}` : `±0`
          return `${name}: ${s.total} (${prefix})`
        })
        .join(', ')

      const moonMsg = data.shootTheMoon
        ? ` 🌙 ${seatName(data.shootTheMoon.seatPosition)} shot the moon!`
        : ''

      store.addLogEntry({
        type: 'hand',
        message: `Round over${moonMsg} · ${scoreLines}`,
        ts: Date.now(),
      })
    })

    socket.on('game:ended', (data) => {
      store.setGameResult(data)

      const seats = useGameStore.getState().seats
      const winners = data.winners
        .map((w) => seats.find((s) => s.seatPosition === w.seatPosition)?.username ?? `Seat ${w.seatPosition + 1}`)
        .join(', ')
      store.addLogEntry({ type: 'game', message: `Game over — Winner: ${winners}`, ts: Date.now() })
    })

    socket.on('room:chat-message', (data) => {
      store.addChatMessage(data)
    })

    socket.on('room:player-joined', (data) => {
      const prev = useGameStore.getState().seats
      const updated = prev.filter((s) => s.seatPosition !== data.participant.seatPosition)
      store.setSeats([...updated, data.participant])
    })

    return () => {
      socket.off('room:game-started')
      socket.off('game:state-update')
      socket.off('game:card-played')
      socket.off('game:your-hand')
      socket.off('game:your-turn')
      socket.off('game:phase-changed')
      socket.off('game:trick-complete')
      socket.off('game:hand-complete')
      socket.off('game:ended')
      socket.off('room:chat-message')
      socket.off('room:player-joined')
      socket.emit('room:leave', { roomId })
    }
  }, [roomId, userId])

  return socketRef.current ?? getSocket()
}
