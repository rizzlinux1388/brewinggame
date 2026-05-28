import type { GameDefinition, PhaseConfig } from './game-definition'

// ─── Shared ───────────────────────────────────────────────────────────────────

export type CardView = { suitId: string; rankId: string }
export type CardInHand = CardView & { id: string }
export type ParticipantView = {
  seatPosition: number
  userId: string | null
  username: string
  isAI: boolean
  isConnected: boolean
}
export type MoveRejectionCode =
  | 'not-your-turn'
  | 'invalid-card'
  | 'invalid-bid'
  | 'phase-mismatch'
  | 'room-not-found'

export type AckCallback<T = void> = (result: T) => void

// ─── Move Payloads ────────────────────────────────────────────────────────────

export type GameMovePayload =
  | { roomId: string; type: 'play-card'; cards: CardInHand[] }
  | { roomId: string; type: 'bid'; amount: number }
  | { roomId: string; type: 'pass-cards'; cards: CardInHand[]; direction: string }
  | { roomId: string; type: 'draw-card' }
  | { roomId: string; type: 'declare'; declaration: string }
  | { roomId: string; type: 'skip' }

export type GameMoveResult = { success: true } | { success: false; reason: string }

// ─── Server Data Shapes ───────────────────────────────────────────────────────

export type GameStartedData = {
  roomId: string
  definition: GameDefinition
  seatAssignments: ParticipantView[]
  dealerSeat: number
}

export type GameStateUpdate = {
  roomId: string
  currentPhaseId: string
  currentTurn: number
  trickCards: { seatPosition: number; card: CardView }[]
  scores: { seatPosition: number; score: number; tricksWon: number; bid?: number }[]
  playersCardCounts: { seatPosition: number; count: number }[]
  lastMove?: { seatPosition: number; move: GameMovePayload }
  roundNumber: number
}

export type ValidMove =
  | { type: 'play-card'; eligibleCards: CardInHand[] }
  | { type: 'bid'; range: { min: number; max: number } }
  | { type: 'pass-cards'; count: number; direction: string; eligibleCards: CardInHand[] }
  | { type: 'draw-card' }
  | { type: 'declare'; options: string[] }
  | { type: 'skip' }

export type YourTurnData = {
  validMoves: ValidMove[]
  timeoutSeconds?: number
}

export type TrickCompleteData = {
  cards: { seatPosition: number; card: CardView }[]
  winningSeat: number
  pointsScored: { seatPosition: number; points: number }[]
}

export type HandCompleteData = {
  scores: { seatPosition: number; total: number; roundPoints: number }[]
  shootTheMoon?: { seatPosition: number }
}

export type RoundCompleteData = HandCompleteData & { roundNumber: number }

export type GameEndedData = {
  finalScores: { seatPosition: number; userId: string | null; totalScore: number }[]
  winners: { seatPosition: number; userId: string | null }[]
  reason: 'score-threshold' | 'rounds-exhausted' | 'forfeit'
}

// ─── Client → Server ─────────────────────────────────────────────────────────

export interface ClientToServerEvents {
  'room:join': (
    payload: { roomId: string; userId?: string; token: string },
    cb: AckCallback<{
      success: boolean
      error?: string
      room?: {
        definition: GameDefinition
        seats: ParticipantView[]
        hostId: string | null
        status: string
      }
    }>
  ) => void
  'room:leave': (payload: { roomId: string }) => void
  'room:ready': (payload: { roomId: string }) => void
  'room:start': (payload: { roomId: string }) => void
  'game:move': (payload: GameMovePayload, cb: AckCallback<GameMoveResult>) => void
  'game:sync': (payload: { roomId: string }) => void
  'room:chat': (payload: { roomId: string; message: string }) => void
  'game:ping-turn': (payload: { roomId: string }) => void
}

// ─── Server → Client ─────────────────────────────────────────────────────────

export interface ServerToClientEvents {
  'room:player-joined': (data: { participant: ParticipantView }) => void
  'room:player-left': (data: { seatPosition: number }) => void
  'room:player-connected': (data: { seatPosition: number }) => void
  'room:player-disconnected': (data: { seatPosition: number }) => void
  'room:all-ready': (data: { startsIn: number }) => void
  'room:game-started': (data: GameStartedData) => void
  'game:state-update': (data: GameStateUpdate) => void
  'game:phase-changed': (data: { phaseId: string; phase: PhaseConfig }) => void
  'game:trick-complete': (data: TrickCompleteData) => void
  'game:hand-complete': (data: HandCompleteData) => void
  'game:round-complete': (data: RoundCompleteData) => void
  'game:ended': (data: GameEndedData) => void
  'game:your-hand': (data: { cards: CardInHand[] }) => void
  'game:your-turn': (data: YourTurnData) => void
  'game:move-rejected': (data: { reason: string; code: MoveRejectionCode }) => void
  'room:chat-message': (data: {
    userId: string | null
    username: string
    message: string
    ts: number
  }) => void
  error: (data: { message: string; code: string }) => void
}

export interface InterServerEvents {
  ping: () => void
}

export interface SocketData {
  userId: string | null
  username: string
  currentRoomId: string | null
}
