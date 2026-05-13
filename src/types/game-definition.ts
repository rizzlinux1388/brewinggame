export type Suit = {
  id: string
  label: string
  symbol: string
  color: 'red' | 'black' | string
}

export type Rank = {
  id: string
  label: string
  value: number
  displayOrder: number
}

export type CardSpec = {
  suitId?: string
  rankId?: string
}

export type CustomCard = {
  id: string
  label: string
  value: number
  abilities?: CardAbility[]
}

export type DeckConfig = {
  suits: Suit[]
  ranks: Rank[]
  includeJokers: boolean
  jokerCount?: number
  customCards?: CustomCard[]
  copies: number
}

export type DealingConfig = {
  cardsPerPlayer: number | 'all' | 'even'
  dealDirection: 'clockwise' | 'counterclockwise'
  dealTo: 'all' | string[]
  remainderTo: 'stock' | 'discard' | 'none'
  faceUp: boolean
  oneAtATime: boolean
}

export type PhaseType =
  | 'trick-taking'
  | 'bidding'
  | 'card-exchange'
  | 'draw'
  | 'discard'
  | 'declare'
  | 'reveal'
  | 'free-play'

export type TurnOrderConfig = {
  direction: 'clockwise' | 'counterclockwise'
  startsWith:
    | 'dealer'
    | 'left-of-dealer'
    | 'highest-bidder'
    | 'winner-of-last-trick'
    | 'player-position'
  startPosition?: number
  skipCondition?: GameCondition
}

export type ConstraintRule =
  | { type: 'must-follow-suit' }
  | { type: 'must-follow-if-able' }
  | { type: 'cannot-lead'; suitId: string; unless: GameCondition }
  | { type: 'must-be-rank'; rankId: string }
  | { type: 'must-beat-current-trick' }
  | { type: 'any' }

export type CardConstraint = {
  rule: ConstraintRule
  condition?: GameCondition
}

export type MoveType =
  | 'play-card'
  | 'draw-card'
  | 'bid'
  | 'pass-cards'
  | 'declare'
  | 'skip'
  | 'knock'

export type MoveConfig = {
  type: MoveType
  required: boolean
  minCards?: number
  maxCards?: number
  cardConstraints?: CardConstraint[]
  bidRange?: { min: number; max: number }
  passCount?: number
  passDirection?: 'left' | 'right' | 'across' | 'none'
}

export type GameCondition =
  | { type: 'hand-empty' }
  | { type: 'tricks-remaining'; operator: '<' | '<=' | '>' | '>=' | '=='; count: number }
  | { type: 'score-threshold'; player: 'any' | 'all'; operator: '<' | '>' | '>='; value: number }
  | { type: 'suit-broken'; suitId: string }
  | { type: 'round-count'; operator: '=='; count: number }
  | { type: 'player-has-card'; cardSpec: CardSpec }
  | { type: 'bid-made' }
  | { type: 'always' }
  | { type: 'never' }
  | { type: 'and'; conditions: GameCondition[] }
  | { type: 'or'; conditions: GameCondition[] }
  | { type: 'not'; condition: GameCondition }

export type PhaseConfig = {
  id: string
  label: string
  type: PhaseType
  order: number
  repeats: 'once' | 'until-hand-empty' | 'n-times' | 'until-condition'
  repeatCount?: number
  repeatCondition?: GameCondition
  turnOrder: TurnOrderConfig
  playerMoves: MoveConfig[]
  autoAdvance?: boolean
  phaseEndCondition: GameCondition
}

export type ScoringTrigger =
  | { type: 'trick-won' }
  | { type: 'card-in-trick'; cardSpec: CardSpec }
  | { type: 'hand-complete' }
  | { type: 'bid-result'; outcome: 'made' | 'set' | 'overtrick' }
  | { type: 'player-declares'; declaration: string }

export type ScoringFormula =
  | { type: 'fixed'; value: number }
  | { type: 'per-card'; cardSpec: CardSpec; pointsEach: number }
  | { type: 'bid-based'; madeMultiplier: number; setMultiplier: number; overtrickValue: number }
  | { type: 'shoot-the-moon'; threshold: number; bonus: number; penalty: number }

export type ScoringEvent = {
  id: string
  trigger: ScoringTrigger
  formula: ScoringFormula
  appliesTo: 'trick-winner' | 'hand-winner' | 'all-players' | 'specific-player'
}

export type AbilityEffect =
  | { type: 'change-trump'; suitId: string }
  | { type: 'reverse-turn-order' }
  | { type: 'skip-next-player' }
  | { type: 'draw-cards'; count: number; target: 'self' | 'next' | 'all' }
  | { type: 'wild-card' }
  | { type: 'score-modifier'; points: number; target: 'self' | 'trick-winner' }

export type CardAbility = {
  id: string
  label: string
  trigger: 'when-played' | 'when-held' | 'when-won-in-trick'
  effect: AbilityEffect
}

export type TrumpSuit =
  | { suitId: string }
  | { determined: 'by-bid' }
  | { determined: 'fixed'; suitId: string }

export type WinCondition = {
  type: 'highest-score' | 'lowest-score' | 'first-to-score' | 'last-standing'
  scoreThreshold?: number
  maxRounds?: number
  endTrigger: 'score-threshold' | 'rounds-exhausted' | 'hand-count'
  handCount?: number
}

export type GameDefinition = {
  version: '1.0'
  id: string
  name: string
  description: string
  minPlayers: number
  maxPlayers: number
  estimatedMinutes: number
  tags: string[]
  isBuiltIn: boolean
  authorId?: string
  createdAt?: string

  deck: DeckConfig
  dealing: DealingConfig
  trumpSuit?: TrumpSuit | null

  phases: PhaseConfig[]
  scoring: {
    events: ScoringEvent[]
    shootTheMoon?: { threshold: number; reversePoints: boolean }
    runningTotal: boolean
  }

  winCondition: WinCondition
  specialAbilities?: CardAbility[]
  uiHints?: {
    tableColor?: string
    cardBackImage?: string
    sortHand?: 'by-suit' | 'by-rank' | 'none'
  }
}
