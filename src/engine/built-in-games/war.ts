import type { GameDefinition } from '@/types/game-definition'
import { STANDARD_DECK } from './hearts'

export const warDefinition: GameDefinition = {
  version: '1.0',
  id: 'builtin-war',
  name: 'War',
  description:
    'Flip cards simultaneously. The highest card wins the trick. Collect all cards to win. Simple but dramatic!',
  minPlayers: 2,
  maxPlayers: 2,
  estimatedMinutes: 20,
  tags: ['comparison', 'simple', 'casual', '2-players'],
  isBuiltIn: true,

  deck: STANDARD_DECK,

  dealing: {
    cardsPerPlayer: 'even',
    dealDirection: 'clockwise',
    dealTo: 'all',
    remainderTo: 'none',
    faceUp: false,
    oneAtATime: true,
  },

  trumpSuit: null,

  phases: [
    {
      id: 'phase-battle',
      label: 'Battle',
      type: 'trick-taking',
      order: 1,
      repeats: 'until-hand-empty',
      turnOrder: {
        direction: 'clockwise',
        startsWith: 'player-position',
        startPosition: 0,
      },
      playerMoves: [
        {
          type: 'play-card',
          required: true,
          minCards: 1,
          maxCards: 1,
          cardConstraints: [{ rule: { type: 'any' } }],
        },
      ],
      autoAdvance: true,
      phaseEndCondition: { type: 'hand-empty' },
    },
  ],

  scoring: {
    events: [
      {
        id: 'score-trick',
        trigger: { type: 'trick-won' },
        formula: { type: 'fixed', value: 1 },
        appliesTo: 'trick-winner',
      },
    ],
    runningTotal: false,
  },

  winCondition: {
    type: 'highest-score',
    endTrigger: 'rounds-exhausted',
    maxRounds: 1,
  },

  uiHints: {
    tableColor: '#6b1a1a',
    sortHand: 'none',
  },
}
