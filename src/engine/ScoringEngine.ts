import type { ScoringEvent, ScoringTrigger } from '@/types/game-definition'
import type { Card, EngineGameState, TrickCard, GameEvent } from './types'

export class ScoringEngine {
  static scoreTrick(
    state: EngineGameState,
    trick: TrickCard[],
    winnerSeat: number
  ): { seat: number; pts: number }[] {
    const points: { seat: number; pts: number }[] = []
    const events = state.definition.scoring.events

    for (const event of events) {
      if (event.trigger.type !== 'card-in-trick' && event.trigger.type !== 'trick-won') continue

      let pts = 0

      if (event.trigger.type === 'trick-won') {
        pts = this.computeFormula(event, trick, winnerSeat, state)
        if (pts !== 0) {
          points.push({ seat: winnerSeat, pts })
        }
      } else if (event.trigger.type === 'card-in-trick') {
        const spec = event.trigger.cardSpec
        for (const tc of trick) {
          if (
            (!spec.suitId || tc.card.suitId === spec.suitId) &&
            (!spec.rankId || tc.card.rankId === spec.rankId)
          ) {
            const cardPts = this.computeFormula(event, trick, winnerSeat, state)
            if (cardPts !== 0) {
              points.push({ seat: winnerSeat, pts: cardPts })
            }
          }
        }
      }
    }

    return this.consolidatePoints(points)
  }

  static scoreHand(
    state: EngineGameState
  ): { seat: number; roundPoints: number; total: number }[] {
    const results = state.players.map((p) => ({
      seat: p.seatPosition,
      roundPoints: 0,
      total: p.score,
    }))

    const events = state.definition.scoring.events

    for (const event of events) {
      if (event.trigger.type !== 'hand-complete' && event.trigger.type !== 'bid-result') continue

      if (event.trigger.type === 'hand-complete') {
        for (const result of results) {
          const pts = this.computeHandFormula(event, result.seat, state)
          result.roundPoints += pts
        }
      } else if (event.trigger.type === 'bid-result') {
        for (const result of results) {
          const pts = this.computeBidFormula(event, result.seat, state)
          result.roundPoints += pts
        }
      }
    }

    const shootMoon = this.checkShootTheMoon(state, results)

    for (const result of results) {
      result.total += result.roundPoints
    }

    return results
  }

  private static checkShootTheMoon(
    state: EngineGameState,
    results: { seat: number; roundPoints: number; total: number }[]
  ): number | null {
    const stm = state.definition.scoring.shootTheMoon
    if (!stm) return null

    const moonShooter = results.find((r) => r.roundPoints >= stm.threshold)
    if (!moonShooter) return null

    if (stm.reversePoints) {
      for (const result of results) {
        if (result.seat === moonShooter.seat) {
          result.roundPoints = 0
        } else {
          result.roundPoints = stm.threshold
        }
      }
    }

    return moonShooter.seat
  }

  private static computeFormula(
    event: ScoringEvent,
    trick: TrickCard[],
    winnerSeat: number,
    state: EngineGameState
  ): number {
    switch (event.formula.type) {
      case 'fixed':
        return event.formula.value

      case 'per-card': {
        const spec = event.formula.cardSpec
        const matching = trick.filter(
          (tc) =>
            (!spec.suitId || tc.card.suitId === spec.suitId) &&
            (!spec.rankId || tc.card.rankId === spec.rankId)
        )
        return matching.length * event.formula.pointsEach
      }

      default:
        return 0
    }
  }

  private static computeHandFormula(
    event: ScoringEvent,
    seat: number,
    state: EngineGameState
  ): number {
    if (event.formula.type === 'fixed') return event.formula.value
    return 0
  }

  private static computeBidFormula(
    event: ScoringEvent,
    seat: number,
    state: EngineGameState
  ): number {
    if (event.formula.type !== 'bid-based') return 0

    const bid = state.bidsMade.get(seat)
    if (bid === undefined) return 0

    const player = state.players[seat]
    const taken = player.tricksTaken
    const { madeMultiplier, setMultiplier, overtrickValue } = event.formula

    if (taken >= bid) {
      const overtricks = taken - bid
      return bid * madeMultiplier + overtricks * overtrickValue
    } else {
      return bid * setMultiplier
    }
  }

  private static consolidatePoints(
    points: { seat: number; pts: number }[]
  ): { seat: number; pts: number }[] {
    const map = new Map<number, number>()
    for (const { seat, pts } of points) {
      map.set(seat, (map.get(seat) ?? 0) + pts)
    }
    return Array.from(map.entries()).map(([seat, pts]) => ({ seat, pts }))
  }
}
