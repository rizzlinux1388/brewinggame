import type { PhaseConfig, CardConstraint, GameCondition, ConstraintRule } from '@/types/game-definition'
import type { Card, EngineGameState, ApplyMoveInput } from './types'

export class MoveValidator {
  static validate(
    state: EngineGameState,
    seatPosition: number,
    move: ApplyMoveInput
  ): { valid: boolean; reason?: string } {
    if (state.currentTurn !== seatPosition) {
      return { valid: false, reason: 'Not your turn' }
    }

    if (state.isGameOver) {
      return { valid: false, reason: 'Game is over' }
    }

    const phase = state.phase
    const moveConfig = phase.playerMoves.find((m) => m.type === move.type)

    if (!moveConfig) {
      return { valid: false, reason: `Move type '${move.type}' not allowed in this phase` }
    }

    const player = state.players[seatPosition]

    switch (move.type) {
      case 'play-card':
        return this.validatePlayCard(state, player.hand, move.card, phase)

      case 'bid':
        if (!moveConfig.bidRange) return { valid: true }
        if (move.amount < moveConfig.bidRange.min || move.amount > moveConfig.bidRange.max) {
          return {
            valid: false,
            reason: `Bid must be between ${moveConfig.bidRange.min} and ${moveConfig.bidRange.max}`,
          }
        }
        return { valid: true }

      case 'pass-cards':
        if (!moveConfig.passCount) return { valid: true }
        if (move.cards.length !== moveConfig.passCount) {
          return { valid: false, reason: `Must pass exactly ${moveConfig.passCount} cards` }
        }
        for (const card of move.cards) {
          if (!player.hand.find((h) => h.id === card.id)) {
            return { valid: false, reason: 'Card not in hand' }
          }
        }
        return { valid: true }

      case 'draw-card':
        if (state.stockPile.length === 0) {
          return { valid: false, reason: 'Stock pile is empty' }
        }
        return { valid: true }

      case 'declare':
      case 'skip':
        return { valid: true }

      default:
        return { valid: false, reason: 'Unknown move type' }
    }
  }

  private static validatePlayCard(
    state: EngineGameState,
    hand: Card[],
    card: Card,
    phase: PhaseConfig
  ): { valid: boolean; reason?: string } {
    if (!hand.find((h) => h.id === card.id)) {
      return { valid: false, reason: 'Card not in hand' }
    }

    const moveConfig = phase.playerMoves.find((m) => m.type === 'play-card')
    if (!moveConfig?.cardConstraints) return { valid: true }

    const isLeading = state.currentTrick.length === 0

    for (const constraint of moveConfig.cardConstraints) {
      if (constraint.condition && !this.evaluateCondition(constraint.condition, state)) {
        continue
      }

      const result = this.applyConstraint(constraint, card, hand, state, isLeading)
      if (!result.valid) return result
    }

    return { valid: true }
  }

  private static applyConstraint(
    constraint: CardConstraint,
    card: Card,
    hand: Card[],
    state: EngineGameState,
    isLeading: boolean
  ): { valid: boolean; reason?: string } {
    const rule = constraint.rule

    switch (rule.type) {
      case 'must-follow-suit': {
        if (isLeading) return { valid: true }
        const leadSuit = state.trickLeadSuit
        if (!leadSuit) return { valid: true }
        const hasLeadSuit = hand.some((h) => h.suitId === leadSuit)
        if (hasLeadSuit && card.suitId !== leadSuit) {
          return { valid: false, reason: `Must follow suit (${leadSuit})` }
        }
        return { valid: true }
      }

      case 'cannot-lead': {
        if (!isLeading) return { valid: true }
        if (card.suitId === rule.suitId) {
          const unless = this.evaluateCondition(rule.unless, state)
          if (!unless) {
            const onlyHasThatSuit = hand.every((h) => h.suitId === rule.suitId)
            if (!onlyHasThatSuit) {
              return { valid: false, reason: `Cannot lead ${rule.suitId} yet` }
            }
          }
        }
        return { valid: true }
      }

      case 'must-beat-current-trick': {
        if (state.currentTrick.length === 0) return { valid: true }
        const currentBest = state.currentTrick.reduce(
          (best, tc) => (tc.card.value > best ? tc.card.value : best),
          0
        )
        if (card.value <= currentBest) {
          const canBeat = hand.some((h) => h.value > currentBest)
          if (canBeat) {
            return { valid: false, reason: 'Must play a higher card if able' }
          }
        }
        return { valid: true }
      }

      case 'must-follow-if-able':
      case 'must-be-rank':
      case 'any':
        return { valid: true }

      default:
        return { valid: true }
    }
  }

  static evaluateCondition(condition: GameCondition, state: EngineGameState): boolean {
    switch (condition.type) {
      case 'always':
        return true

      case 'never':
        return false

      case 'hand-empty':
        return state.players[state.currentTurn]?.hand.length === 0

      case 'suit-broken':
        return state.brokenSuits.has(condition.suitId)

      case 'bid-made':
        return state.bidsMade.size >= state.players.length

      case 'score-threshold': {
        const scores = state.players.map((p) => p.score)
        if (condition.player === 'any') {
          return scores.some((s) =>
            this.compare(s, condition.operator as '<' | '>' | '>=', condition.value)
          )
        }
        return scores.every((s) =>
          this.compare(s, condition.operator as '<' | '>' | '>=', condition.value)
        )
      }

      case 'round-count':
        return state.roundNumber === condition.count

      case 'tricks-remaining': {
        const cardsLeft = state.players[0]?.hand.length ?? 0
        return this.compare(cardsLeft, condition.operator, condition.count)
      }

      case 'and':
        return condition.conditions.every((c) => this.evaluateCondition(c, state))

      case 'or':
        return condition.conditions.some((c) => this.evaluateCondition(c, state))

      case 'not':
        return !this.evaluateCondition(condition.condition, state)

      case 'player-has-card': {
        const spec = condition.cardSpec
        return state.players.some((p) =>
          p.hand.some(
            (c) =>
              (!spec.suitId || c.suitId === spec.suitId) &&
              (!spec.rankId || c.rankId === spec.rankId)
          )
        )
      }

      default:
        return false
    }
  }

  private static compare(
    a: number,
    op: '<' | '<=' | '>' | '>=' | '==',
    b: number
  ): boolean {
    switch (op) {
      case '<': return a < b
      case '<=': return a <= b
      case '>': return a > b
      case '>=': return a >= b
      case '==': return a === b
    }
  }

  static getEligibleCards(state: EngineGameState, seatPosition: number): Card[] {
    const player = state.players[seatPosition]
    if (!player) return []

    return player.hand.filter((card) => {
      const result = this.validatePlayCard(state, player.hand, card, state.phase)
      return result.valid
    })
  }
}
