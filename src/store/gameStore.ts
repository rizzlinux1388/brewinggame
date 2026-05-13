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

interface GameStore {
  roomId: string | null
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

  setRoom: (roomId: string) => void
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
  setStatus: (status: GameStatus) => void
  reset: () => void
}

const initialState = {
  roomId: null,
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
}

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setRoom: (roomId) => set({ roomId }),
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
  setStatus: (status) => set({ status }),
  reset: () => set(initialState),
}))
