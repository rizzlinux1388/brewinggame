import { create } from 'zustand'
import type { GameDefinition, DeckConfig, DealingConfig, PhaseConfig, ScoringEvent, WinCondition } from '@/types/game-definition'
import { STANDARD_SUITS, STANDARD_RANKS } from '@/engine/built-in-games/hearts'
import { nanoid } from '@/server/nanoid'

interface BuilderStore {
  step: number
  name: string
  description: string
  minPlayers: number
  maxPlayers: number
  estimatedMinutes: number
  tags: string[]
  deck: DeckConfig
  dealing: DealingConfig
  phases: PhaseConfig[]
  scoringEvents: ScoringEvent[]
  runningTotal: boolean
  winCondition: WinCondition

  setStep: (step: number) => void
  setName: (name: string) => void
  setDescription: (desc: string) => void
  setPlayers: (min: number, max: number) => void
  setEstimatedMinutes: (n: number) => void
  setTags: (tags: string[]) => void
  setDeck: (deck: DeckConfig) => void
  setDealing: (dealing: DealingConfig) => void
  setPhases: (phases: PhaseConfig[]) => void
  setScoringEvents: (events: ScoringEvent[]) => void
  setRunningTotal: (rt: boolean) => void
  setWinCondition: (wc: WinCondition) => void

  toGameDefinition: () => GameDefinition
  reset: () => void
}

const defaultState = {
  step: 1,
  name: '',
  description: '',
  minPlayers: 2,
  maxPlayers: 4,
  estimatedMinutes: 30,
  tags: ['custom'],
  deck: {
    suits: [...STANDARD_SUITS],
    ranks: [...STANDARD_RANKS],
    includeJokers: false,
    copies: 1,
  } as DeckConfig,
  dealing: {
    cardsPerPlayer: 13,
    dealDirection: 'clockwise',
    dealTo: 'all',
    remainderTo: 'none',
    faceUp: false,
    oneAtATime: true,
  } as DealingConfig,
  phases: [
    {
      id: 'phase-play',
      label: 'Play Cards',
      type: 'trick-taking',
      order: 1,
      repeats: 'until-hand-empty',
      turnOrder: { direction: 'clockwise', startsWith: 'left-of-dealer' },
      playerMoves: [
        {
          type: 'play-card',
          required: true,
          minCards: 1,
          maxCards: 1,
          cardConstraints: [{ rule: { type: 'must-follow-suit' } }],
        },
      ],
      phaseEndCondition: { type: 'hand-empty' },
    } as PhaseConfig,
  ],
  scoringEvents: [] as ScoringEvent[],
  runningTotal: true,
  winCondition: {
    type: 'highest-score',
    endTrigger: 'score-threshold',
    scoreThreshold: 100,
  } as WinCondition,
}

export const useBuilderStore = create<BuilderStore>((set, get) => ({
  ...defaultState,

  setStep: (step) => set({ step }),
  setName: (name) => set({ name }),
  setDescription: (description) => set({ description }),
  setPlayers: (minPlayers, maxPlayers) => set({ minPlayers, maxPlayers }),
  setEstimatedMinutes: (estimatedMinutes) => set({ estimatedMinutes }),
  setTags: (tags) => set({ tags }),
  setDeck: (deck) => set({ deck }),
  setDealing: (dealing) => set({ dealing }),
  setPhases: (phases) => set({ phases }),
  setScoringEvents: (scoringEvents) => set({ scoringEvents }),
  setRunningTotal: (runningTotal) => set({ runningTotal }),
  setWinCondition: (winCondition) => set({ winCondition }),

  toGameDefinition: (): GameDefinition => {
    const s = get()
    return {
      version: '1.0',
      id: `custom-${nanoid()}`,
      name: s.name || 'My Custom Game',
      description: s.description || 'A custom card game',
      minPlayers: s.minPlayers,
      maxPlayers: s.maxPlayers,
      estimatedMinutes: s.estimatedMinutes,
      tags: s.tags,
      isBuiltIn: false,
      deck: s.deck,
      dealing: s.dealing,
      phases: s.phases,
      scoring: {
        events: s.scoringEvents,
        runningTotal: s.runningTotal,
      },
      winCondition: s.winCondition,
    }
  },

  reset: () => set(defaultState),
}))
