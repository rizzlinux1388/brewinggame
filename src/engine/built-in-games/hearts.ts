import type { GameDefinition } from '@/types/game-definition'

export const STANDARD_SUITS = [
  { id: 'hearts', label: 'Hearts', symbol: '♥', color: 'red' },
  { id: 'diamonds', label: 'Diamonds', symbol: '♦', color: 'red' },
  { id: 'clubs', label: 'Clubs', symbol: '♣', color: 'black' },
  { id: 'spades', label: 'Spades', symbol: '♠', color: 'black' },
] as const

export const STANDARD_RANKS = [
  { id: '2', label: '2', value: 2, displayOrder: 1 },
  { id: '3', label: '3', value: 3, displayOrder: 2 },
  { id: '4', label: '4', value: 4, displayOrder: 3 },
  { id: '5', label: '5', value: 5, displayOrder: 4 },
  { id: '6', label: '6', value: 6, displayOrder: 5 },
  { id: '7', label: '7', value: 7, displayOrder: 6 },
  { id: '8', label: '8', value: 8, displayOrder: 7 },
  { id: '9', label: '9', value: 9, displayOrder: 8 },
  { id: '10', label: '10', value: 10, displayOrder: 9 },
  { id: 'J', label: 'J', value: 11, displayOrder: 10 },
  { id: 'Q', label: 'Q', value: 12, displayOrder: 11 },
  { id: 'K', label: 'K', value: 13, displayOrder: 12 },
  { id: 'A', label: 'A', value: 14, displayOrder: 13 },
] as const

export const STANDARD_DECK: import('@/types/game-definition').DeckConfig = {
  suits: STANDARD_SUITS.map((s) => ({ ...s })),
  ranks: STANDARD_RANKS.map((r) => ({ ...r })),
  includeJokers: false,
  copies: 1,
}

export const heartsDefinition: GameDefinition = {
  version: '1.0',
  id: 'builtin-hearts',
  name: 'Hearts',
  description:
    'Classic trick-avoidance game. Collect as few hearts as possible, and avoid the deadly Queen of Spades.',
  minPlayers: 4,
  maxPlayers: 4,
  estimatedMinutes: 30,
  tags: ['trick-taking', 'classic', 'strategy', '4-players'],
  isBuiltIn: true,

  deck: STANDARD_DECK,

  dealing: {
    cardsPerPlayer: 13,
    dealDirection: 'clockwise',
    dealTo: 'all',
    remainderTo: 'none',
    faceUp: false,
    oneAtATime: true,
  },

  trumpSuit: null,

  phases: [
    {
      id: 'phase-pass',
      label: 'Pass Cards',
      type: 'card-exchange',
      order: 1,
      repeats: 'once',
      turnOrder: {
        direction: 'clockwise',
        startsWith: 'player-position',
        startPosition: 0,
      },
      playerMoves: [
        {
          type: 'pass-cards',
          required: true,
          passCount: 3,
          passDirection: 'left',
          cardConstraints: [{ rule: { type: 'any' } }],
        },
      ],
      autoAdvance: true,
      phaseEndCondition: { type: 'always' },
    },
    {
      id: 'phase-tricks',
      label: 'Play Tricks',
      type: 'trick-taking',
      order: 2,
      repeats: 'until-hand-empty',
      turnOrder: {
        direction: 'clockwise',
        startsWith: 'left-of-dealer',
      },
      playerMoves: [
        {
          type: 'play-card',
          required: true,
          minCards: 1,
          maxCards: 1,
          cardConstraints: [
            {
              rule: { type: 'must-follow-suit' },
              condition: { type: 'always' },
            },
            {
              rule: {
                type: 'cannot-lead',
                suitId: 'hearts',
                unless: {
                  type: 'or',
                  conditions: [
                    { type: 'suit-broken', suitId: 'hearts' },
                    { type: 'hand-empty' },
                  ],
                },
              },
            },
          ],
        },
      ],
      autoAdvance: false,
      phaseEndCondition: { type: 'hand-empty' },
    },
  ],

  scoring: {
    events: [
      {
        id: 'score-heart',
        trigger: { type: 'card-in-trick', cardSpec: { suitId: 'hearts' } },
        formula: { type: 'fixed', value: 1 },
        appliesTo: 'trick-winner',
      },
      {
        id: 'score-queen-spades',
        trigger: { type: 'card-in-trick', cardSpec: { suitId: 'spades', rankId: 'Q' } },
        formula: { type: 'fixed', value: 13 },
        appliesTo: 'trick-winner',
      },
    ],
    shootTheMoon: { threshold: 26, reversePoints: true },
    runningTotal: true,
  },

  winCondition: {
    type: 'lowest-score',
    endTrigger: 'score-threshold',
    scoreThreshold: 100,
  },

  uiHints: {
    tableColor: '#1a6b3c',
    sortHand: 'by-suit',
  },
}
