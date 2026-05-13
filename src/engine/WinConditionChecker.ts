import type { WinCondition } from '@/types/game-definition'
import type { EngineGameState } from './types'

export class WinConditionChecker {
  static check(state: EngineGameState): { isOver: boolean; winners: number[] } {
    const wc = state.definition.winCondition

    switch (wc.endTrigger) {
      case 'score-threshold': {
        const threshold = wc.scoreThreshold!
        const triggered = state.players.some((p) => p.score >= threshold)
        if (!triggered) return { isOver: false, winners: [] }

        return { isOver: true, winners: this.findWinners(state.players, wc.type) }
      }

      case 'rounds-exhausted': {
        const maxRounds = wc.maxRounds ?? 1
        if (state.roundNumber <= maxRounds) return { isOver: false, winners: [] }

        return { isOver: true, winners: this.findWinners(state.players, wc.type) }
      }

      case 'hand-count': {
        if (state.handNumber <= (wc.handCount ?? 1)) return { isOver: false, winners: [] }

        return { isOver: true, winners: this.findWinners(state.players, wc.type) }
      }

      default:
        return { isOver: false, winners: [] }
    }
  }

  private static findWinners(
    players: EngineGameState['players'],
    winType: WinCondition['type']
  ): number[] {
    if (winType === 'highest-score' || winType === 'first-to-score') {
      const max = Math.max(...players.map((p) => p.score))
      return players.filter((p) => p.score === max).map((p) => p.seatPosition)
    }

    if (winType === 'lowest-score') {
      const min = Math.min(...players.map((p) => p.score))
      return players.filter((p) => p.score === min).map((p) => p.seatPosition)
    }

    return []
  }
}
