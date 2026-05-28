'use client'

import { useEffect, useRef } from 'react'
import { getSocket, connectSocket } from '@/lib/socket-client'
import { useGameStore } from '@/store/gameStore'
import type { TypedClientSocket } from '@/lib/socket-client'

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

      const mySeat = data.seatAssignments.find((s) => s.userId === userId)?.seatPosition
      if (mySeat !== undefined) store.setMySeat(mySeat)
    })

    socket.on('game:state-update', (data) => {
      store.setGameState(data)
    })

    socket.on('game:your-hand', (data) => {
      store.setMyHand(data.cards)
    })

    socket.on('game:your-turn', (data) => {
      store.setYourTurn(data)
    })

    socket.on('game:trick-complete', (data) => {
      store.setLastTrick(data)
      store.setYourTurn(null)
      setTimeout(() => store.setLastTrick(null), 2500)
    })

    socket.on('game:hand-complete', (data) => {
      store.setLastHand(data)
    })

    socket.on('game:ended', (data) => {
      store.setGameResult(data)
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
      socket.off('game:your-hand')
      socket.off('game:your-turn')
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
