import type { EngineGameState, ApplyMoveInput, Card } from './types'
import { GameEngine } from './GameEngine'
import { MoveValidator } from './MoveValidator'

export type AIDifficulty = 'easy' | 'medium' | 'hard'

export class AIOpponent {
  static chooseMove(
    state: EngineGameState,
    seatPosition: number,
    difficulty: AIDifficulty = 'medium'
  ): ApplyMoveInput | null {
    const valid = GameEngine.getValidMoves(state, seatPosition)
    if (valid.length === 0) return null

    // Random chance based on difficulty
    const randomChance = difficulty === 'easy' ? 0.4 : difficulty === 'medium' ? 0.15 : 0
    if (Math.random() < randomChance) {
      return valid[Math.floor(Math.random() * valid.length)]
    }

    const phase = state.phase

    if (phase.type === 'trick-taking') {
      return this.chooseTrickMove(state, seatPosition, valid)
    }

    if (phase.type === 'bidding') {
      return this.chooseBid(state, seatPosition, valid)
    }

    if (phase.type === 'card-exchange') {
      return this.choosePassCards(state, seatPosition)
    }

    // Default: pick first valid
    return valid[0]
  }

  private static chooseTrickMove(
    state: EngineGameState,
    seat: number,
    valid: ApplyMoveInput[]
  ): ApplyMoveInput {
    const playCardMoves = valid.filter((m) => m.type === 'play-card') as Extract<
      ApplyMoveInput,
      { type: 'play-card' }
    >[]

    if (playCardMoves.length === 0) return valid[0]

    const eligibleCards = playCardMoves.map((m) => m.card)

    // If leading the trick, play lowest non-penalty card
    if (state.currentTrick.length === 0) {
      const card = this.pickLowest(eligibleCards, state)
      return { type: 'play-card', card }
    }

    // Following: try to dump penalty cards first
    const penaltyCards = this.getPenaltyCards(eligibleCards, state)
    const leadSuit = state.trickLeadSuit
    const offSuit = eligibleCards.filter((c) => c.suitId !== leadSuit)

    if (offSuit.length > 0 && penaltyCards.length > 0) {
      // Discard highest penalty card
      const card = penaltyCards.reduce((a, b) => (a.value > b.value ? a : b))
      return { type: 'play-card', card }
    }

    // If can win without penalty, win with lowest winning card
    const currentBest = this.getCurrentTrickBest(state)
    const canWin = eligibleCards.filter(
      (c) => c.suitId === leadSuit && c.value > (currentBest?.value ?? 0)
    )

    if (canWin.length > 0) {
      // Only win if there are no penalty cards still out
      const card = canWin.reduce((a, b) => (a.value < b.value ? a : b))
      return { type: 'play-card', card }
    }

    // Otherwise play lowest card
    const card = this.pickLowest(eligibleCards, state)
    return { type: 'play-card', card }
  }

  private static chooseBid(
    state: EngineGameState,
    seat: number,
    valid: ApplyMoveInput[]
  ): ApplyMoveInput {
    const bidMoves = valid.filter((m) => m.type === 'bid') as Extract<
      ApplyMoveInput,
      { type: 'bid' }
    >[]

    if (bidMoves.length === 0) return valid[0]

    // Estimate sure tricks: high-value cards in hand
    const hand = state.players[seat].hand
    const highThreshold = 11 // J and above = "sure tricks"
    const sureTricks = hand.filter((c) => c.value >= highThreshold).length

    const bid = Math.max(0, Math.min(sureTricks, 13))
    const closest = bidMoves.reduce((prev, curr) => {
      return Math.abs(curr.amount - bid) < Math.abs(prev.amount - bid) ? curr : prev
    })

    return closest
  }

  private static choosePassCards(
    state: EngineGameState,
    seat: number
  ): ApplyMoveInput {
    const hand = state.players[seat].hand
    const phase = state.phase
    const moveConfig = phase.playerMoves.find((m) => m.type === 'pass-cards')
    const count = moveConfig?.passCount ?? 3

    // Pass highest penalty cards and highest spades
    const sorted = [...hand].sort((a, b) => {
      const penaltyA = this.cardPenaltyScore(a, state)
      const penaltyB = this.cardPenaltyScore(b, state)
      return penaltyB - penaltyA
    })

    const toPass = sorted.slice(0, count)
    return {
      type: 'pass-cards',
      cards: toPass,
      direction: moveConfig?.passDirection ?? 'left',
    }
  }

  private static pickLowest(cards: Card[], state: EngineGameState): Card {
    return cards.reduce((a, b) => {
      const penA = this.cardPenaltyScore(a, state)
      const penB = this.cardPenaltyScore(b, state)
      if (penA !== penB) return penA < penB ? a : b
      return a.value < b.value ? a : b
    })
  }

  private static getPenaltyCards(cards: Card[], state: EngineGameState): Card[] {
    return cards.filter((c) => this.cardPenaltyScore(c, state) > 0)
  }

  private static cardPenaltyScore(card: Card, state: EngineGameState): number {
    // Infer penalty from scoring events
    let penalty = 0
    for (const event of state.definition.scoring.events) {
      if (event.trigger.type !== 'card-in-trick') continue
      const spec = event.trigger.cardSpec
      const matches =
        (!spec.suitId || card.suitId === spec.suitId) &&
        (!spec.rankId || card.rankId === spec.rankId)
      if (matches && event.formula.type === 'fixed') {
        penalty += event.formula.value
      }
    }
    return penalty
  }

  private static getCurrentTrickBest(state: EngineGameState): Card | null {
    if (state.currentTrick.length === 0) return null
    return state.currentTrick.reduce(
      (best, tc) => (tc.card.value > best.value ? tc.card : best),
      state.currentTrick[0].card
    )
  }
}
