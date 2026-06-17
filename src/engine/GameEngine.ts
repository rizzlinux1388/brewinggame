import type { GameDefinition } from '@/types/game-definition'
import type {
  EngineGameState,
  PlayerState,
  ApplyMoveInput,
  MoveResult,
  GameEvent,
  Card,
  TrickCard,
} from './types'
import { DeckManager } from './DeckManager'
import { MoveValidator } from './MoveValidator'
import { ScoringEngine } from './ScoringEngine'
import { WinConditionChecker } from './WinConditionChecker'

export class GameEngine {
  static initialize(
    definition: GameDefinition,
    participants: { seatPosition: number; isAI: boolean }[]
  ): EngineGameState {
    const players: PlayerState[] = participants.map((p) => ({
      seatPosition: p.seatPosition,
      hand: [],
      score: 0,
      tricksTaken: 0,
      isAI: p.isAI,
    }))

    const phase = definition.phases[0]
    const dealerSeat = 0

    const state: EngineGameState = {
      definition,
      players,
      currentPhaseIndex: 0,
      currentTurn: this.resolveStartSeat(phase, dealerSeat, players.length),
      dealerSeat,
      roundNumber: 1,
      handNumber: 1,
      trickNumber: 1,
      currentTrick: [],
      trickLeadSuit: null,
      brokenSuits: new Set(),
      stockPile: [],
      discardPile: [],
      activeTrumpSuit: null,
      phase,
      isGameOver: false,
      winners: [],
      lastTrickWinner: null,
      bidsMade: new Map(),
      passPhaseComplete: new Set(),
    }

    this.dealCards(state)
    this.resolveInitialTrump(state)

    return state
  }

  private static dealCards(state: EngineGameState): void {
    const deck = DeckManager.shuffle(DeckManager.buildDeck(state.definition.deck))
    const { hands, stock, discard } = DeckManager.deal(
      deck,
      state.players,
      state.definition.dealing
    )

    for (let i = 0; i < state.players.length; i++) {
      const sortHint = state.definition.uiHints?.sortHand ?? 'none'
      state.players[i].hand = DeckManager.sortHand(hands[i], sortHint)
    }

    state.stockPile = stock
    state.discardPile = discard
  }

  private static resolveInitialTrump(state: EngineGameState): void {
    const ts = state.definition.trumpSuit
    if (!ts) return

    if ('determined' in ts && ts.determined === 'fixed') {
      state.activeTrumpSuit = ts.suitId
    } else if ('suitId' in ts) {
      state.activeTrumpSuit = ts.suitId
    }
  }

  private static resolveStartSeat(
    phase: EngineGameState['phase'],
    dealerSeat: number,
    numPlayers: number
  ): number {
    switch (phase.turnOrder.startsWith) {
      case 'dealer':
        return dealerSeat
      case 'left-of-dealer':
        return (dealerSeat + 1) % numPlayers
      case 'player-position':
        return phase.turnOrder.startPosition ?? 0
      default:
        return 0
    }
  }

  static applyMove(
    state: EngineGameState,
    seatPosition: number,
    move: ApplyMoveInput
  ): MoveResult {
    const validation = MoveValidator.validate(state, seatPosition, move)
    if (!validation.valid) {
      return { success: false, error: validation.reason, events: [], newState: state }
    }

    // Deep-clone state (via JSON roundtrip — acceptable for game state)
    const newState = this.cloneState(state)
    const events: GameEvent[] = []

    switch (move.type) {
      case 'play-card':
        this.handlePlayCard(newState, seatPosition, move.card, events)
        break

      case 'bid':
        this.handleBid(newState, seatPosition, move.amount, events)
        break

      case 'pass-cards':
        this.handlePassCards(newState, seatPosition, move.cards, move.direction, events)
        break

      case 'draw-card':
        this.handleDrawCard(newState, seatPosition, events)
        break

      case 'skip':
        this.advanceTurn(newState)
        break

      case 'declare':
        this.advanceTurn(newState)
        break
    }

    return { success: true, events, newState }
  }

  private static handlePlayCard(
    state: EngineGameState,
    seat: number,
    card: Card,
    events: GameEvent[]
  ): void {
    const player = state.players[seat]
    // Use the actual card object from hand to preserve its value for trick resolution
    const actualCard = player.hand.find((c) => c.id === card.id) ?? card
    player.hand = player.hand.filter((c) => c.id !== card.id)

    if (state.currentTrick.length === 0) {
      state.trickLeadSuit = actualCard.suitId
    }

    // Off-suit play (following) breaks that suit so it can be led in future rounds
    if (state.currentTrick.length > 0 && actualCard.suitId !== state.trickLeadSuit && !state.brokenSuits.has(actualCard.suitId)) {
      state.brokenSuits.add(actualCard.suitId)
      events.push({ type: 'suit-broken', suitId: actualCard.suitId })
    }
    // Leading a hearts-type restricted suit (when forced — only that suit left) also breaks it
    if (state.currentTrick.length === 0 && !state.brokenSuits.has(actualCard.suitId)) {
      const phaseConstraints = state.phase.playerMoves[0]?.cardConstraints ?? []
      const hasCannotLead = phaseConstraints.some(
        (c) => c.rule.type === 'cannot-lead' && (c.rule as { suitId: string }).suitId === actualCard.suitId
      )
      if (hasCannotLead) {
        state.brokenSuits.add(actualCard.suitId)
        events.push({ type: 'suit-broken', suitId: actualCard.suitId })
      }
    }

    state.currentTrick.push({ seatPosition: seat, card: actualCard })
    events.push({ type: 'card-played', seatPosition: seat, card: actualCard })

    if (state.currentTrick.length === state.players.length) {
      this.resolveTrick(state, events)
    } else {
      this.advanceTurn(state)
    }
  }

  private static resolveTrick(state: EngineGameState, events: GameEvent[]): void {
    const trick = [...state.currentTrick]
    const winnerSeat = this.determineTrickWinner(state, trick)

    state.players[winnerSeat].tricksTaken++
    const trickPoints = ScoringEngine.scoreTrick(state, trick, winnerSeat)

    for (const { seat, pts } of trickPoints) {
      state.players[seat].score += pts
    }

    events.push({
      type: 'trick-complete',
      winner: winnerSeat,
      cards: trick,
      points: trickPoints,
    })

    state.currentTrick = []
    state.trickLeadSuit = null
    state.lastTrickWinner = winnerSeat
    state.trickNumber++

    const allHandsEmpty = state.players.every((p) => p.hand.length === 0)
    if (allHandsEmpty) {
      this.resolveHandEnd(state, events)
    } else {
      state.currentTurn = winnerSeat
    }
  }

  private static determineTrickWinner(state: EngineGameState, trick: TrickCard[]): number {
    const leadSuit = trick[0].card.suitId
    const trump = state.activeTrumpSuit

    let best = trick[0]

    for (let i = 1; i < trick.length; i++) {
      const tc = trick[i]
      if (trump && tc.card.suitId === trump && best.card.suitId !== trump) {
        best = tc
      } else if (tc.card.suitId === best.card.suitId && tc.card.value > best.card.value) {
        best = tc
      } else if (tc.card.suitId === leadSuit && best.card.suitId !== leadSuit && best.card.suitId !== trump) {
        best = tc
      }
    }

    return best.seatPosition
  }

  private static resolveHandEnd(state: EngineGameState, events: GameEvent[]): void {
    const handScores = ScoringEngine.scoreHand(state)

    let shootTheMoonSeat: number | undefined
    const stm = state.definition.scoring.shootTheMoon
    if (stm) {
      const shooter = handScores.find((s) => s.roundPoints >= stm.threshold)
      if (shooter) {
        shootTheMoonSeat = shooter.seat
        for (const s of handScores) {
          if (s.seat === shooter.seat) s.roundPoints = 0
          else s.roundPoints = stm.threshold
        }
      }
    }

    for (const hs of handScores) {
      state.players[hs.seat].score = hs.total
    }

    events.push({
      type: 'hand-complete',
      scores: handScores,
      shootTheMoon: shootTheMoonSeat,
    })

    const { isOver, winners } = WinConditionChecker.check(state)
    if (isOver) {
      state.isGameOver = true
      state.winners = winners
      events.push({
        type: 'game-over',
        winners,
        finalScores: state.players.map((p) => ({ seat: p.seatPosition, total: p.score })),
      })
      return
    }

    this.startNewHand(state, events)
  }

  private static startNewHand(state: EngineGameState, events: GameEvent[]): void {
    state.handNumber++
    state.roundNumber++
    state.trickNumber = 1
    state.dealerSeat = (state.dealerSeat + 1) % state.players.length
    state.brokenSuits = new Set()
    state.bidsMade = new Map()
    state.passPhaseComplete = new Set()
    state.lastTrickWinner = null

    for (const player of state.players) {
      player.tricksTaken = 0
      player.bid = undefined
      player.passedCards = undefined
      player.receivedCards = undefined
    }

    this.dealCards(state)
    this.resolveInitialTrump(state)

    const firstPhase = state.definition.phases[0]
    state.currentPhaseIndex = 0
    state.phase = firstPhase
    state.currentTurn = this.resolveStartSeat(firstPhase, state.dealerSeat, state.players.length)

    events.push({ type: 'phase-changed', phaseId: firstPhase.id })
  }

  private static handleBid(
    state: EngineGameState,
    seat: number,
    amount: number,
    events: GameEvent[]
  ): void {
    state.bidsMade.set(seat, amount)
    state.players[seat].bid = amount
    events.push({ type: 'bid-placed', seatPosition: seat, amount })

    if (state.bidsMade.size === state.players.length) {
      this.advancePhase(state, events)
    } else {
      this.advanceTurn(state)
    }
  }

  private static handlePassCards(
    state: EngineGameState,
    seat: number,
    cards: Card[],
    direction: string,
    events: GameEvent[]
  ): void {
    const player = state.players[seat]
    const cardIds = new Set(cards.map((c) => c.id))
    // Look up actual card objects from hand to preserve values
    const actualCards = player.hand.filter((c) => cardIds.has(c.id))
    player.hand = player.hand.filter((c) => !cardIds.has(c.id))
    player.passedCards = actualCards
    state.passPhaseComplete.add(seat)

    events.push({ type: 'cards-passed', from: seat, to: -1, cards: actualCards })

    if (state.passPhaseComplete.size === state.players.length) {
      this.resolveCardExchange(state, events)
    } else {
      this.advanceTurn(state)
    }
  }

  private static resolveCardExchange(state: EngineGameState, events: GameEvent[]): void {
    const n = state.players.length
    for (const player of state.players) {
      if (!player.passedCards) continue

      let targetSeat: number
      const phase = state.phase
      const moveConfig = phase.playerMoves.find((m) => m.type === 'pass-cards')
      const dir = moveConfig?.passDirection ?? 'left'

      if (dir === 'left') {
        targetSeat = (player.seatPosition + 1) % n
      } else if (dir === 'right') {
        targetSeat = (player.seatPosition - 1 + n) % n
      } else if (dir === 'across') {
        targetSeat = (player.seatPosition + 2) % n
      } else {
        targetSeat = player.seatPosition
      }

      state.players[targetSeat].hand.push(...player.passedCards)
      events.push({
        type: 'cards-passed',
        from: player.seatPosition,
        to: targetSeat,
        cards: player.passedCards,
      })
    }

    this.advancePhase(state, events)
  }

  private static handleDrawCard(
    state: EngineGameState,
    seat: number,
    events: GameEvent[]
  ): void {
    const card = state.stockPile.shift()
    if (card) {
      state.players[seat].hand.push(card)
      events.push({ type: 'card-drawn', seatPosition: seat, card })
    }
    this.advanceTurn(state)
  }

  private static advanceTurn(state: EngineGameState): void {
    const n = state.players.length
    if (state.phase.turnOrder.direction === 'clockwise') {
      state.currentTurn = (state.currentTurn + 1) % n
    } else {
      state.currentTurn = (state.currentTurn - 1 + n) % n
    }
  }

  private static advancePhase(state: EngineGameState, events: GameEvent[]): void {
    const nextIndex = state.currentPhaseIndex + 1
    if (nextIndex >= state.definition.phases.length) {
      this.resolveHandEnd(state, events)
      return
    }

    state.currentPhaseIndex = nextIndex
    state.phase = state.definition.phases[nextIndex]
    state.currentTurn = this.resolveStartSeat(
      state.phase,
      state.dealerSeat,
      state.players.length
    )
    events.push({ type: 'phase-changed', phaseId: state.phase.id })
  }

  static getValidMoves(
    state: EngineGameState,
    seatPosition: number
  ): import('./types').ApplyMoveInput[] {
    if (state.currentTurn !== seatPosition || state.isGameOver) return []

    const phase = state.phase
    const player = state.players[seatPosition]
    const moves: ApplyMoveInput[] = []

    for (const moveConfig of phase.playerMoves) {
      if (moveConfig.type === 'play-card') {
        const eligible = MoveValidator.getEligibleCards(state, seatPosition)
        for (const card of eligible) {
          moves.push({ type: 'play-card', card })
        }
      } else if (moveConfig.type === 'bid' && moveConfig.bidRange) {
        for (let i = moveConfig.bidRange.min; i <= moveConfig.bidRange.max; i++) {
          moves.push({ type: 'bid', amount: i })
        }
      } else if (moveConfig.type === 'pass-cards') {
        if (!state.passPhaseComplete.has(seatPosition)) {
          const count = moveConfig.passCount ?? 3
          const direction = moveConfig.passDirection ?? 'left'
          moves.push({ type: 'pass-cards', cards: player.hand.slice(0, count), direction })
        }
      } else if (moveConfig.type === 'draw-card') {
        moves.push({ type: 'draw-card' })
      } else if (moveConfig.type === 'skip') {
        moves.push({ type: 'skip' })
      }
    }

    return moves
  }

  private static cloneState(state: EngineGameState): EngineGameState {
    const cloned = JSON.parse(
      JSON.stringify(state, (_key, value) => {
        if (value instanceof Set) return { __type: 'Set', values: [...value] }
        if (value instanceof Map) return { __type: 'Map', entries: [...value.entries()] }
        return value
      })
    )

    // Restore Set and Map
    function restore(obj: unknown): unknown {
      if (obj && typeof obj === 'object') {
        const o = obj as Record<string, unknown>
        if (o.__type === 'Set') return new Set(o.values as unknown[])
        if (o.__type === 'Map') return new Map(o.entries as [unknown, unknown][])
        for (const key of Object.keys(o)) {
          o[key] = restore(o[key])
        }
      }
      return obj
    }

    return restore(cloned) as EngineGameState
  }
}
