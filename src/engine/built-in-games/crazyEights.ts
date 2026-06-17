import type { GameDefinition } from '@/types/game-definition'
import { STANDARD_DECK } from './hearts'

export const crazyEightsDefinition: GameDefinition = {
  version: '1.0',
  id: 'builtin-crazy-eights',
  name: 'Crazy Eights',
  description:
    'Shed all your cards first! Match the suit or rank of the top discard card. Eights are wild — play one to change the suit.',
  minPlayers: 2,
  maxPlayers: 5,
  estimatedMinutes: 15,
  tags: ['shedding', 'family', 'casual', 'wild-cards'],
  isBuiltIn: true,

  deck: STANDARD_DECK,

  dealing: {
    cardsPerPlayer: 7,
    dealDirection: 'clockwise',
    dealTo: 'all',
    remainderTo: 'stock',
    faceUp: false,
    oneAtATime: true,
  },

  trumpSuit: null,

  phases: [
    {
      id: 'phase-play',
      label: 'Play Cards',
      type: 'discard',
      order: 1,
      repeats: 'until-hand-empty',
      turnOrder: {
        direction: 'clockwise',
        startsWith: 'left-of-dealer',
      },
      playerMoves: [
        {
          type: 'play-card',
          required: false,
          minCards: 1,
          maxCards: 1,
          cardConstraints: [
            {
              rule: { type: 'must-follow-suit' },
              condition: { type: 'always' },
            },
          ],
        },
        {
          type: 'draw-card',
          required: false,
        },
      ],
      autoAdvance: false,
      phaseEndCondition: { type: 'hand-empty' },
    },
  ],

  scoring: {
    events: [
      {
        id: 'score-eights',
        trigger: { type: 'hand-complete' },
        formula: { type: 'fixed', value: 50 },
        appliesTo: 'hand-winner',
      },
    ],
    runningTotal: true,
  },

  winCondition: {
    type: 'first-to-score',
    endTrigger: 'score-threshold',
    scoreThreshold: 200,
  },

  specialAbilities: [
    {
      id: 'wild-eight',
      label: 'Wild Eight',
      trigger: 'when-played',
      effect: { type: 'wild-card' },
    },
  ],

  uiHints: {
    tableColor: '#4b1a6b',
    sortHand: 'by-rank',
  },
}
