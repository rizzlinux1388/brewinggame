import type { GameDefinition, PhaseConfig } from '@/types/game-definition'

export type CardId = string // `${rankId}-${suitId}-${index}` for uniqueness

export type Card = {
  id: CardId
  suitId: string
  rankId: string
  value: number
}

export type PlayerState = {
  seatPosition: number
  hand: Card[]
  score: number
  tricksTaken: number
  bid?: number
  passedCards?: Card[]
  receivedCards?: Card[]
  isAI: boolean
}

export type TrickCard = {
  seatPosition: number
  card: Card
}

export type EngineGameState = {
  definition: GameDefinition
  players: PlayerState[]
  currentPhaseIndex: number
  currentTurn: number
  dealerSeat: number
  roundNumber: number
  handNumber: number
  trickNumber: number
  currentTrick: TrickCard[]
  trickLeadSuit: string | null
  brokenSuits: Set<string>
  stockPile: Card[]
  discardPile: Card[]
  activeTrumpSuit: string | null
  phase: PhaseConfig
  isGameOver: boolean
  winners: number[]
  lastTrickWinner: number | null
  bidsMade: Map<number, number>
  passPhaseComplete: Set<number>
}

export type MoveResult = {
  success: boolean
  error?: string
  events: GameEvent[]
  newState: EngineGameState
}

export type GameEvent =
  | { type: 'card-played'; seatPosition: number; card: Card }
  | { type: 'trick-complete'; winner: number; cards: TrickCard[]; points: { seat: number; pts: number }[] }
  | { type: 'hand-complete'; scores: { seat: number; roundPoints: number; total: number }[]; shootTheMoon?: number }
  | { type: 'phase-changed'; phaseId: string }
  | { type: 'game-over'; winners: number[]; finalScores: { seat: number; total: number }[] }
  | { type: 'cards-dealt'; seatPosition: number; count: number }
  | { type: 'cards-passed'; from: number; to: number; cards: Card[] }
  | { type: 'bid-placed'; seatPosition: number; amount: number }
  | { type: 'card-drawn'; seatPosition: number; card: Card }
  | { type: 'suit-broken'; suitId: string }

export type ApplyMoveInput =
  | { type: 'play-card'; card: Card }
  | { type: 'bid'; amount: number }
  | { type: 'pass-cards'; cards: Card[]; direction: string }
  | { type: 'draw-card' }
  | { type: 'declare'; declaration: string }
  | { type: 'skip' }
