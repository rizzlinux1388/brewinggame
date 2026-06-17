import type { GameDefinition } from '@/types/game-definition'
import { STANDARD_DECK } from './hearts'

export const spadesDefinition: GameDefinition = {
  version: '1.0',
  id: 'builtin-spades',
  name: 'Spades',
  description:
    'Partnership trick-taking with spades as permanent trump. Bid your tricks carefully — set bids hurt!',
  minPlayers: 4,
  maxPlayers: 4,
  estimatedMinutes: 45,
  tags: ['trick-taking', 'partnership', 'bidding', 'classic', '4-players'],
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

  trumpSuit: { determined: 'fixed', suitId: 'spades' },

  phases: [
    {
      id: 'phase-bid',
      label: 'Bidding',
      type: 'bidding',
      order: 1,
      repeats: 'once',
      turnOrder: {
        direction: 'clockwise',
        startsWith: 'left-of-dealer',
      },
      playerMoves: [
        {
          type: 'bid',
          required: true,
          bidRange: { min: 0, max: 13 },
        },
      ],
      autoAdvance: true,
      phaseEndCondition: { type: 'bid-made' },
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
            { rule: { type: 'must-follow-suit' } },
            {
              rule: {
                type: 'cannot-lead',
                suitId: 'spades',
                unless: {
                  type: 'or',
                  conditions: [
                    { type: 'suit-broken', suitId: 'spades' },
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
        id: 'score-bid',
        trigger: { type: 'hand-complete' },
        formula: {
          type: 'bid-based',
          madeMultiplier: 10,
          setMultiplier: -10,
          overtrickValue: 1,
        },
        appliesTo: 'all-players',
      },
    ],
    runningTotal: true,
  },

  winCondition: {
    type: 'highest-score',
    endTrigger: 'score-threshold',
    scoreThreshold: 500,
  },

  uiHints: {
    tableColor: '#1a3a6b',
    sortHand: 'by-suit',
  },
}
