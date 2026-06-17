import type { GameDefinition } from '@/types/game-definition'
import { STANDARD_DECK } from './hearts'

export const goFishDefinition: GameDefinition = {
  version: '1.0',
  id: 'builtin-go-fish',
  name: 'Go Fish',
  description:
    'Ask opponents for cards to complete sets of four. When the stock runs out, the player with the most sets wins!',
  minPlayers: 2,
  maxPlayers: 6,
  estimatedMinutes: 20,
  tags: ['draw', 'family', 'classic', 'casual'],
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
      label: 'Go Fish!',
      type: 'free-play',
      order: 1,
      repeats: 'until-hand-empty',
      turnOrder: {
        direction: 'clockwise',
        startsWith: 'left-of-dealer',
      },
      playerMoves: [
        {
          type: 'declare',
          required: true,
          cardConstraints: [{ rule: { type: 'any' } }],
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
        id: 'score-set',
        trigger: { type: 'player-declares', declaration: 'set-complete' },
        formula: { type: 'fixed', value: 1 },
        appliesTo: 'hand-winner',
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
    tableColor: '#1a4b6b',
    sortHand: 'by-rank',
  },
}
