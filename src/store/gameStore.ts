import { create } from 'zustand'
import type {
  GameStateUpdate,
  YourTurnData,
  CardInHand,
  ParticipantView,
  TrickCompleteData,
  HandCompleteData,
  GameEndedData,
} from '@/types/socket-events'
import type { GameDefinition } from '@/types/game-definition'

type GameStatus = 'idle' | 'waiting' | 'playing' | 'ended'

export type GameLogEntry = {
  id: string
  type: 'trick' | 'hand' | 'phase' | 'game'
  message: string
  ts: number
}

interface GameStore {
  roomId: string | null
  hostId: string | null
  status: GameStatus
  definition: GameDefinition | null
  seats: ParticipantView[]
  mySeat: number | null
  myHand: CardInHand[]
  gameState: GameStateUpdate | null
  yourTurn: YourTurnData | null
  lastTrick: TrickCompleteData | null
  lastHand: HandCompleteData | null
  gameResult: GameEndedData | null
  chatMessages: { userId: string | null; username: string; message: string; ts: number }[]
  gameLog: GameLogEntry[]

  setRoom: (roomId: string) => void
  setHostId: (id: string | null) => void
  setDefinition: (def: GameDefinition) => void
  setSeats: (seats: ParticipantView[]) => void
  setMySeat: (seat: number) => void
  setMyHand: (hand: CardInHand[]) => void
  setGameState: (state: GameStateUpdate) => void
  setYourTurn: (data: YourTurnData | null) => void
  setLastTrick: (trick: TrickCompleteData | null) => void
  setLastHand: (hand: HandCompleteData | null) => void
  setGameResult: (result: GameEndedData) => void
  addChatMessage: (msg: { userId: string | null; username: string; message: string; ts: number }) => void
  addLogEntry: (entry: Omit<GameLogEntry, 'id'>) => void
  setStatus: (status: GameStatus) => void
  reset: () => void
}

const initialState = {
  roomId: null,
  hostId: null,
  status: 'idle' as GameStatus,
  definition: null,
  seats: [],
  mySeat: null,
  myHand: [],
  gameState: null,
  yourTurn: null,
  lastTrick: null,
  lastHand: null,
  gameResult: null,
  chatMessages: [],
  gameLog: [],
}

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setRoom: (roomId) => set({ roomId }),
  setHostId: (hostId) => set({ hostId }),
  setDefinition: (definition) => set({ definition }),
  setSeats: (seats) => set({ seats }),
  setMySeat: (mySeat) => set({ mySeat }),
  setMyHand: (myHand) => set({ myHand }),
  setGameState: (gameState) => set({ gameState }),
  setYourTurn: (yourTurn) => set({ yourTurn }),
  setLastTrick: (lastTrick) => set({ lastTrick }),
  setLastHand: (lastHand) => set({ lastHand }),
  setGameResult: (gameResult) => set({ gameResult, status: 'ended' }),
  addChatMessage: (msg) =>
    set((state) => ({
      chatMessages: [...state.chatMessages.slice(-100), msg],
    })),
  addLogEntry: (entry) =>
    set((state) => ({
      gameLog: [
        ...state.gameLog.slice(-300),
        { ...entry, id: Math.random().toString(36).slice(2) },
      ],
    })),
  setStatus: (status) => set({ status }),
  reset: () => set(initialState),
}))
