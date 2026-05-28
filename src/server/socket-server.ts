import { Server as SocketIOServer, Socket } from 'socket.io'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  GameMovePayload,
} from '@/types/socket-events'
import { prisma } from '@/lib/prisma'
import { GameEngine } from '@/engine/GameEngine'
import { AIOpponent } from '@/engine/AIOpponent'
import type { EngineGameState, ApplyMoveInput } from '@/engine/types'
import type { GameDefinition } from '@/types/game-definition'
import { nanoid } from './nanoid'

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
type TypedIO = SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

// Minimal shape of a participant row as read from Prisma. Annotated explicitly
// so the file type-checks regardless of whether the Prisma client has been
// generated (ts-node type-checks the whole import graph at startup).
type ParticipantRow = {
  seatPosition: number
  userId: string | null
  type: string
  aiDifficulty?: string | null
  isConnected: boolean
  user?: { username: string | null; name: string | null } | null
}

const AI_MOVE_DELAY_MS = 900

export function initSocketServer(io: TypedIO) {
  io.on('connection', (socket: TypedSocket) => {
    socket.data.currentRoomId = null

    socket.on('room:join', async (payload, cb) => {
      try {
        const room = await prisma.gameRoom.findUnique({
          where: { id: payload.roomId },
          include: { participants: { include: { user: true } }, gameDefinition: true },
        })

        if (!room) {
          cb({ success: false, error: 'Room not found' })
          return
        }

        socket.data.userId = payload.userId ?? null
        socket.data.username = 'Guest'

        if (payload.userId) {
          const user = await prisma.user.findUnique({ where: { id: payload.userId } })
          socket.data.username = user?.username ?? user?.name ?? 'Player'

          // Mark participant as connected
          await prisma.participant.updateMany({
            where: { roomId: payload.roomId, userId: payload.userId },
            data: { isConnected: true, lastSeenAt: new Date() },
          })
        }

        socket.data.currentRoomId = payload.roomId
        await socket.join(payload.roomId)

        // Notify room of new player
        socket.to(payload.roomId).emit('room:player-joined', {
          participant: {
            seatPosition: room.participants.find((p: ParticipantRow) => p.userId === payload.userId)?.seatPosition ?? -1,
            userId: payload.userId ?? null,
            username: socket.data.username,
            isAI: false,
            isConnected: true,
          },
        })

        // If game in progress, send current state
        if (room.status === 'IN_PROGRESS' && room.gameState) {
          const state = deserializeState(room.gameState as object)
          const playerSeat = room.participants.find((p: ParticipantRow) => p.userId === payload.userId)?.seatPosition ?? -1

          socket.emit('game:state-update', buildStateUpdate(room.id, state))

          if (playerSeat >= 0) {
            socket.emit('game:your-hand', {
              cards: state.players[playerSeat].hand.map((c) => ({
                id: c.id,
                suitId: c.suitId,
                rankId: c.rankId,
              })),
            })

            if (state.currentTurn === playerSeat) {
              socket.emit('game:your-turn', buildYourTurn(state, playerSeat))
            }
          }
        }

        cb({
          success: true,
          room: {
            definition: room.gameDefinition.schema as unknown as GameDefinition,
            seats: room.participants.map((p: ParticipantRow) => ({
              seatPosition: p.seatPosition,
              userId: p.userId,
              username:
                p.type === 'AI'
                  ? `AI (${p.aiDifficulty ?? 'medium'})`
                  : (p.user?.username ?? p.user?.name ?? 'Player'),
              isAI: p.type === 'AI',
              isConnected: p.isConnected,
            })),
            hostId: room.hostId,
            status: room.status,
          },
        })
      } catch (err) {
        console.error('room:join error', err)
        cb({ success: false, error: 'Server error' })
      }
    })

    socket.on('room:start', async (payload) => {
      try {
        const room = await prisma.gameRoom.findUnique({
          where: { id: payload.roomId },
          include: { participants: true, gameDefinition: true },
        })

        if (!room || room.hostId !== socket.data.userId) return
        if (room.status !== 'WAITING') return

        const definition = room.gameDefinition.schema as unknown as GameDefinition
        const participants = room.participants.map((p: ParticipantRow) => ({
          seatPosition: p.seatPosition,
          isAI: p.type === 'AI',
        }))

        const state = GameEngine.initialize(definition, participants)
        const serialized = serializeState(state)

        await prisma.gameRoom.update({
          where: { id: payload.roomId },
          data: {
            status: 'IN_PROGRESS',
            gameState: serialized,
            startedAt: new Date(),
            currentPhaseId: state.phase.id,
          },
        })

        io.to(payload.roomId).emit('room:game-started', {
          roomId: payload.roomId,
          definition,
          seatAssignments: room.participants.map((p: ParticipantRow) => ({
            seatPosition: p.seatPosition,
            userId: p.userId,
            username: p.type === 'AI' ? `AI (${p.aiDifficulty ?? 'medium'})` : 'Player',
            isAI: p.type === 'AI',
            isConnected: p.isConnected,
          })),
          dealerSeat: state.dealerSeat,
        })

        io.to(payload.roomId).emit('game:state-update', buildStateUpdate(payload.roomId, state))

        // Send private hands
        const sockets = await io.in(payload.roomId).fetchSockets()
        for (const s of sockets) {
          const uid = s.data.userId
          const participant = room.participants.find((p: ParticipantRow) => p.userId === uid)
          if (participant) {
            s.emit('game:your-hand', {
              cards: state.players[participant.seatPosition].hand.map((c) => ({
                id: c.id,
                suitId: c.suitId,
                rankId: c.rankId,
              })),
            })
          }
        }

        // Notify current player
        await notifyCurrentPlayer(io, payload.roomId, state, room.participants)

        // Schedule AI move if AI goes first
        maybeScheduleAIMove(io, payload.roomId, state, room.participants)
      } catch (err) {
        console.error('room:start error', err)
      }
    })

    socket.on('game:move', async (payload, cb) => {
      try {
        const room = await prisma.gameRoom.findUnique({
          where: { id: payload.roomId },
          include: { participants: true, gameDefinition: true },
        })

        if (!room || room.status !== 'IN_PROGRESS' || !room.gameState) {
          cb({ success: false, reason: 'Room not available' })
          return
        }

        const state = deserializeState(room.gameState as object)
        const participant = room.participants.find((p: ParticipantRow) => p.userId === socket.data.userId)
        if (!participant) {
          cb({ success: false, reason: 'Not a participant' })
          return
        }

        const move = payloadToMove(payload)
        const result = GameEngine.applyMove(state, participant.seatPosition, move)

        if (!result.success) {
          cb({ success: false, reason: result.error ?? 'Invalid move' })
          socket.emit('game:move-rejected', {
            reason: result.error ?? 'Invalid move',
            code: 'invalid-card',
          })
          return
        }

        cb({ success: true })

        const newState = result.newState
        const serialized = serializeState(newState)

        await prisma.gameRoom.update({
          where: { id: payload.roomId },
          data: {
            gameState: serialized,
            currentPhaseId: newState.phase.id,
            currentTurn: newState.currentTurn,
            status: newState.isGameOver ? 'COMPLETED' : 'IN_PROGRESS',
            completedAt: newState.isGameOver ? new Date() : undefined,
          },
        })

        await prisma.gameMove.create({
          data: {
            roomId: payload.roomId,
            seatPosition: participant.seatPosition,
            phaseId: state.phase.id,
            moveType: payload.type,
            payload: payload as object,
          },
        })

        io.to(payload.roomId).emit('game:state-update', buildStateUpdate(payload.roomId, newState))

        for (const event of result.events) {
          if (event.type === 'trick-complete') {
            io.to(payload.roomId).emit('game:trick-complete', {
              cards: event.cards,
              winningSeat: event.winner,
              pointsScored: event.points.map((p) => ({ seatPosition: p.seat, points: p.pts })),
            })
          } else if (event.type === 'hand-complete') {
            io.to(payload.roomId).emit('game:hand-complete', {
              scores: event.scores.map((s) => ({
                seatPosition: s.seat,
                total: s.total,
                roundPoints: s.roundPoints,
              })),
              shootTheMoon: event.shootTheMoon !== undefined
                ? { seatPosition: event.shootTheMoon }
                : undefined,
            })
          } else if (event.type === 'phase-changed') {
            const phase = newState.definition.phases.find((p) => p.id === event.phaseId)
            if (phase) {
              io.to(payload.roomId).emit('game:phase-changed', { phaseId: event.phaseId, phase })
            }
          } else if (event.type === 'game-over') {
            io.to(payload.roomId).emit('game:ended', {
              finalScores: event.finalScores.map((s) => ({
                seatPosition: s.seat,
                userId: room.participants.find((p: ParticipantRow) => p.seatPosition === s.seat)?.userId ?? null,
                totalScore: s.total,
              })),
              winners: event.winners.map((w) => ({
                seatPosition: w,
                userId: room.participants.find((p: ParticipantRow) => p.seatPosition === w)?.userId ?? null,
              })),
              reason: 'score-threshold',
            })
          }
        }

        if (!newState.isGameOver) {
          // Update hands for all players
          const sockets = await io.in(payload.roomId).fetchSockets()
          for (const s of sockets) {
            const uid = s.data.userId
            const p = room.participants.find((par: ParticipantRow) => par.userId === uid)
            if (p) {
              s.emit('game:your-hand', {
                cards: newState.players[p.seatPosition].hand.map((c) => ({
                  id: c.id,
                  suitId: c.suitId,
                  rankId: c.rankId,
                })),
              })
            }
          }

          await notifyCurrentPlayer(io, payload.roomId, newState, room.participants)
          maybeScheduleAIMove(io, payload.roomId, newState, room.participants)
        }
      } catch (err) {
        console.error('game:move error', err)
        cb({ success: false, reason: 'Server error' })
      }
    })

    socket.on('room:chat', (payload) => {
      io.to(payload.roomId).emit('room:chat-message', {
        userId: socket.data.userId,
        username: socket.data.username ?? 'Guest',
        message: payload.message.slice(0, 500),
        ts: Date.now(),
      })
    })

    socket.on('disconnect', async () => {
      if (socket.data.currentRoomId && socket.data.userId) {
        await prisma.participant.updateMany({
          where: { roomId: socket.data.currentRoomId, userId: socket.data.userId },
          data: { isConnected: false, lastSeenAt: new Date() },
        })

        const participant = await prisma.participant.findFirst({
          where: { roomId: socket.data.currentRoomId, userId: socket.data.userId },
        })

        if (participant) {
          socket.to(socket.data.currentRoomId).emit('room:player-disconnected', {
            seatPosition: participant.seatPosition,
          })
        }
      }
    })
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildStateUpdate(roomId: string, state: EngineGameState) {
  return {
    roomId,
    currentPhaseId: state.phase.id,
    currentTurn: state.currentTurn,
    trickCards: state.currentTrick.map((tc) => ({
      seatPosition: tc.seatPosition,
      card: { suitId: tc.card.suitId, rankId: tc.card.rankId },
    })),
    scores: state.players.map((p) => ({
      seatPosition: p.seatPosition,
      score: p.score,
      tricksWon: p.tricksTaken,
      bid: p.bid,
    })),
    playersCardCounts: state.players.map((p) => ({
      seatPosition: p.seatPosition,
      count: p.hand.length,
    })),
    roundNumber: state.roundNumber,
  }
}

function buildYourTurn(state: EngineGameState, seatPosition: number) {
  const eligible = GameEngine.getValidMoves(state, seatPosition)
  const phase = state.phase
  const moveConfig = phase.playerMoves[0]

  const validMoves = []

  if (moveConfig?.type === 'play-card') {
    validMoves.push({
      type: 'play-card' as const,
      eligibleCards: eligible
        .filter((m) => m.type === 'play-card')
        .map((m) => {
          const move = m as { type: 'play-card'; card: import('@/engine/types').Card }
          return { id: move.card.id, suitId: move.card.suitId, rankId: move.card.rankId }
        }),
    })
  } else if (moveConfig?.type === 'bid' && moveConfig.bidRange) {
    validMoves.push({
      type: 'bid' as const,
      range: moveConfig.bidRange,
    })
  }

  return { validMoves }
}

async function notifyCurrentPlayer(
  io: TypedIO,
  roomId: string,
  state: EngineGameState,
  participants: { seatPosition: number; userId: string | null; type: string }[]
) {
  const currentParticipant = participants.find(
    (p) => p.seatPosition === state.currentTurn && p.type === 'HUMAN'
  )
  if (!currentParticipant?.userId) return

  const sockets = await io.in(roomId).fetchSockets()
  const playerSocket = sockets.find((s) => s.data.userId === currentParticipant.userId)

  if (playerSocket) {
    playerSocket.emit('game:your-turn', buildYourTurn(state, state.currentTurn))
  }
}

function maybeScheduleAIMove(
  io: TypedIO,
  roomId: string,
  state: EngineGameState,
  participants: { seatPosition: number; userId: string | null; type: string; aiDifficulty?: string | null }[]
) {
  if (state.isGameOver) return

  const currentParticipant = participants.find((p) => p.seatPosition === state.currentTurn)
  if (!currentParticipant || currentParticipant.type !== 'AI') return

  const difficulty = (currentParticipant.aiDifficulty ?? 'medium') as 'easy' | 'medium' | 'hard'

  setTimeout(async () => {
    try {
      const room = await prisma.gameRoom.findUnique({ where: { id: roomId } })
      if (!room?.gameState || room.status !== 'IN_PROGRESS') return

      const freshState = deserializeState(room.gameState as object)
      if (freshState.currentTurn !== currentParticipant.seatPosition) return

      const aiMove = AIOpponent.chooseMove(freshState, currentParticipant.seatPosition, difficulty)
      if (!aiMove) return

      const result = GameEngine.applyMove(freshState, currentParticipant.seatPosition, aiMove)
      if (!result.success) return

      const serialized = serializeState(result.newState)
      await prisma.gameRoom.update({
        where: { id: roomId },
        data: {
          gameState: serialized,
          currentPhaseId: result.newState.phase.id,
          currentTurn: result.newState.currentTurn,
          status: result.newState.isGameOver ? 'COMPLETED' : 'IN_PROGRESS',
        },
      })

      io.to(roomId).emit('game:state-update', buildStateUpdate(roomId, result.newState))

      for (const event of result.events) {
        if (event.type === 'trick-complete') {
          io.to(roomId).emit('game:trick-complete', {
            cards: event.cards,
            winningSeat: event.winner,
            pointsScored: event.points.map((p) => ({ seatPosition: p.seat, points: p.pts })),
          })
        } else if (event.type === 'game-over') {
          io.to(roomId).emit('game:ended', {
            finalScores: event.finalScores.map((s) => ({
              seatPosition: s.seat,
              userId: participants.find((p) => p.seatPosition === s.seat)?.userId ?? null,
              totalScore: s.total,
            })),
            winners: event.winners.map((w) => ({
              seatPosition: w,
              userId: participants.find((p) => p.seatPosition === w)?.userId ?? null,
            })),
            reason: 'score-threshold',
          })
        }
      }

      if (!result.newState.isGameOver) {
        maybeScheduleAIMove(io, roomId, result.newState, participants)
      }
    } catch (err) {
      console.error('AI move error', err)
    }
  }, AI_MOVE_DELAY_MS)
}

function serializeState(state: EngineGameState): object {
  return JSON.parse(
    JSON.stringify(state, (_key, value) => {
      if (value instanceof Set) return { __type: 'Set', values: [...value] }
      if (value instanceof Map) return { __type: 'Map', entries: [...value.entries()] }
      return value
    })
  )
}

function deserializeState(data: object): EngineGameState {
  function restore(obj: unknown): unknown {
    if (obj && typeof obj === 'object') {
      const o = obj as Record<string, unknown>
      if (o.__type === 'Set') return new Set(o.values as unknown[])
      if (o.__type === 'Map') return new Map(o.entries as [unknown, unknown][])
      for (const key of Object.keys(o)) {
        o[key] = restore(o[key])
      }
    }
    return obj
  }
  return restore(JSON.parse(JSON.stringify(data))) as EngineGameState
}

function payloadToMove(payload: GameMovePayload): ApplyMoveInput {
  switch (payload.type) {
    case 'play-card':
      return {
        type: 'play-card',
        card: { id: `${payload.cards[0].rankId}-${payload.cards[0].suitId}-0`, ...payload.cards[0], value: 0 },
      }
    case 'bid':
      return { type: 'bid', amount: payload.amount }
    case 'pass-cards':
      return {
        type: 'pass-cards',
        cards: payload.cards.map((c) => ({ id: `${c.rankId}-${c.suitId}-0`, ...c, value: 0 })),
        direction: payload.direction,
      }
    case 'draw-card':
      return { type: 'draw-card' }
    case 'declare':
      return { type: 'declare', declaration: payload.declaration }
    case 'skip':
      return { type: 'skip' }
  }
}
