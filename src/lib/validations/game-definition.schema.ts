import { z } from 'zod'

const SuitSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  symbol: z.string().min(1),
  color: z.string(),
})

const RankSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  value: z.number(),
  displayOrder: z.number().int(),
})

const CardSpecSchema = z.object({
  suitId: z.string().optional(),
  rankId: z.string().optional(),
})

const CardAbilityEffectSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('change-trump'), suitId: z.string() }),
  z.object({ type: z.literal('reverse-turn-order') }),
  z.object({ type: z.literal('skip-next-player') }),
  z.object({
    type: z.literal('draw-cards'),
    count: z.number().int().positive(),
    target: z.enum(['self', 'next', 'all']),
  }),
  z.object({ type: z.literal('wild-card') }),
  z.object({
    type: z.literal('score-modifier'),
    points: z.number(),
    target: z.enum(['self', 'trick-winner']),
  }),
])

const CardAbilitySchema = z.object({
  id: z.string(),
  label: z.string(),
  trigger: z.enum(['when-played', 'when-held', 'when-won-in-trick']),
  effect: CardAbilityEffectSchema,
})

const CustomCardSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.number(),
  abilities: z.array(CardAbilitySchema).optional(),
})

const DeckConfigSchema = z.object({
  suits: z.array(SuitSchema).min(1),
  ranks: z.array(RankSchema).min(1),
  includeJokers: z.boolean(),
  jokerCount: z.number().int().min(0).max(4).optional(),
  customCards: z.array(CustomCardSchema).optional(),
  copies: z.number().int().positive().default(1),
})

const DealingConfigSchema = z.object({
  cardsPerPlayer: z.union([z.number().int().positive(), z.literal('all'), z.literal('even')]),
  dealDirection: z.enum(['clockwise', 'counterclockwise']),
  dealTo: z.union([z.literal('all'), z.array(z.string())]),
  remainderTo: z.enum(['stock', 'discard', 'none']),
  faceUp: z.boolean(),
  oneAtATime: z.boolean(),
})

// GameCondition is recursive — use z.lazy with an explicit type annotation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GameConditionSchema: z.ZodType<any> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({ type: z.literal('hand-empty') }),
    z.object({
      type: z.literal('tricks-remaining'),
      operator: z.enum(['<', '<=', '>', '>=', '==']),
      count: z.number().int(),
    }),
    z.object({
      type: z.literal('score-threshold'),
      player: z.enum(['any', 'all']),
      operator: z.enum(['<', '>', '>=']),
      value: z.number(),
    }),
    z.object({ type: z.literal('suit-broken'), suitId: z.string() }),
    z.object({ type: z.literal('round-count'), operator: z.literal('=='), count: z.number().int() }),
    z.object({ type: z.literal('player-has-card'), cardSpec: CardSpecSchema }),
    z.object({ type: z.literal('bid-made') }),
    z.object({ type: z.literal('always') }),
    z.object({ type: z.literal('never') }),
    z.object({ type: z.literal('and'), conditions: z.array(z.lazy(() => GameConditionSchema)) }),
    z.object({ type: z.literal('or'), conditions: z.array(z.lazy(() => GameConditionSchema)) }),
    z.object({ type: z.literal('not'), condition: z.lazy(() => GameConditionSchema) }),
  ])
)

const ConstraintRuleSchema = z.union([
  z.object({ type: z.literal('must-follow-suit') }),
  z.object({ type: z.literal('must-follow-if-able') }),
  z.object({
    type: z.literal('cannot-lead'),
    suitId: z.string(),
    unless: GameConditionSchema,
  }),
  z.object({ type: z.literal('must-be-rank'), rankId: z.string() }),
  z.object({ type: z.literal('must-beat-current-trick') }),
  z.object({ type: z.literal('any') }),
])

const CardConstraintSchema = z.object({
  rule: ConstraintRuleSchema,
  condition: GameConditionSchema.optional(),
})

const TurnOrderConfigSchema = z.object({
  direction: z.enum(['clockwise', 'counterclockwise']),
  startsWith: z.enum([
    'dealer',
    'left-of-dealer',
    'highest-bidder',
    'winner-of-last-trick',
    'player-position',
  ]),
  startPosition: z.number().int().optional(),
  skipCondition: GameConditionSchema.optional(),
})

const MoveConfigSchema = z.object({
  type: z.enum(['play-card', 'draw-card', 'bid', 'pass-cards', 'declare', 'skip', 'knock']),
  required: z.boolean(),
  minCards: z.number().int().optional(),
  maxCards: z.number().int().optional(),
  cardConstraints: z.array(CardConstraintSchema).optional(),
  bidRange: z.object({ min: z.number(), max: z.number() }).optional(),
  passCount: z.number().int().optional(),
  passDirection: z.enum(['left', 'right', 'across', 'none']).optional(),
})

const PhaseConfigSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum([
    'trick-taking',
    'bidding',
    'card-exchange',
    'draw',
    'discard',
    'declare',
    'reveal',
    'free-play',
  ]),
  order: z.number().int(),
  repeats: z.enum(['once', 'until-hand-empty', 'n-times', 'until-condition']),
  repeatCount: z.number().int().optional(),
  repeatCondition: GameConditionSchema.optional(),
  turnOrder: TurnOrderConfigSchema,
  playerMoves: z.array(MoveConfigSchema).min(1),
  autoAdvance: z.boolean().optional(),
  phaseEndCondition: GameConditionSchema,
})

const ScoringTriggerSchema = z.union([
  z.object({ type: z.literal('trick-won') }),
  z.object({ type: z.literal('card-in-trick'), cardSpec: CardSpecSchema }),
  z.object({ type: z.literal('hand-complete') }),
  z.object({ type: z.literal('bid-result'), outcome: z.enum(['made', 'set', 'overtrick']) }),
  z.object({ type: z.literal('player-declares'), declaration: z.string() }),
])

const ScoringFormulaSchema = z.union([
  z.object({ type: z.literal('fixed'), value: z.number() }),
  z.object({ type: z.literal('per-card'), cardSpec: CardSpecSchema, pointsEach: z.number() }),
  z.object({
    type: z.literal('bid-based'),
    madeMultiplier: z.number(),
    setMultiplier: z.number(),
    overtrickValue: z.number(),
  }),
  z.object({
    type: z.literal('shoot-the-moon'),
    threshold: z.number(),
    bonus: z.number(),
    penalty: z.number(),
  }),
])

const ScoringEventSchema = z.object({
  id: z.string(),
  trigger: ScoringTriggerSchema,
  formula: ScoringFormulaSchema,
  appliesTo: z.enum(['trick-winner', 'hand-winner', 'all-players', 'specific-player']),
})

const WinConditionSchema = z.object({
  type: z.enum(['highest-score', 'lowest-score', 'first-to-score', 'last-standing']),
  scoreThreshold: z.number().optional(),
  maxRounds: z.number().int().optional(),
  endTrigger: z.enum(['score-threshold', 'rounds-exhausted', 'hand-count']),
  handCount: z.number().int().optional(),
})

export const GameDefinitionSchema = z.object({
  version: z.literal('1.0'),
  id: z.string().min(1),
  name: z.string().min(1).max(64),
  description: z.string().min(1).max(1000),
  minPlayers: z.number().int().min(2),
  maxPlayers: z.number().int().min(2).max(10),
  estimatedMinutes: z.number().int().positive(),
  tags: z.array(z.string()),
  isBuiltIn: z.boolean(),
  authorId: z.string().optional(),
  createdAt: z.string().optional(),

  deck: DeckConfigSchema,
  dealing: DealingConfigSchema,
  trumpSuit: z
    .union([
      z.object({ suitId: z.string() }),
      z.object({ determined: z.literal('by-bid') }),
      z.object({ determined: z.literal('fixed'), suitId: z.string() }),
    ])
    .nullable()
    .optional(),

  phases: z.array(PhaseConfigSchema).min(1),
  scoring: z.object({
    events: z.array(ScoringEventSchema),
    shootTheMoon: z
      .object({ threshold: z.number(), reversePoints: z.boolean() })
      .optional(),
    runningTotal: z.boolean(),
  }),

  winCondition: WinConditionSchema,
  specialAbilities: z.array(CardAbilitySchema).optional(),
  uiHints: z
    .object({
      tableColor: z.string().optional(),
      cardBackImage: z.string().optional(),
      sortHand: z.enum(['by-suit', 'by-rank', 'none']).optional(),
    })
    .optional(),
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GameDefinitionInput = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GameDefinitionOutput = any

export function validateGameDefinition(data: unknown) {
  return GameDefinitionSchema.safeParse(data)
}
