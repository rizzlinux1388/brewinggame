import type { DeckConfig, DealingConfig } from '@/types/game-definition'
import type { Card, PlayerState } from './types'

export class DeckManager {
  static buildDeck(config: DeckConfig): Card[] {
    const cards: Card[] = []
    let index = 0

    for (let copy = 0; copy < config.copies; copy++) {
      for (const suit of config.suits) {
        for (const rank of config.ranks) {
          cards.push({
            id: `${rank.id}-${suit.id}-${index++}`,
            suitId: suit.id,
            rankId: rank.id,
            value: rank.value,
          })
        }
      }

      if (config.includeJokers) {
        const jokerCount = config.jokerCount ?? 2
        for (let j = 0; j < jokerCount; j++) {
          cards.push({
            id: `joker-${copy}-${j}`,
            suitId: 'joker',
            rankId: 'joker',
            value: 0,
          })
        }
      }
    }

    if (config.customCards) {
      for (const cc of config.customCards) {
        cards.push({
          id: `custom-${cc.id}`,
          suitId: 'custom',
          rankId: cc.id,
          value: cc.value,
        })
      }
    }

    return cards
  }

  static shuffle(cards: Card[]): Card[] {
    const shuffled = [...cards]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  static deal(
    deck: Card[],
    players: PlayerState[],
    config: DealingConfig
  ): { hands: Card[][]; stock: Card[]; discard: Card[] } {
    const n = players.length
    let cardsPerPlayer: number

    if (config.cardsPerPlayer === 'all') {
      cardsPerPlayer = Math.floor(deck.length / n)
    } else if (config.cardsPerPlayer === 'even') {
      cardsPerPlayer = Math.floor(deck.length / n)
    } else {
      cardsPerPlayer = config.cardsPerPlayer
    }

    const hands: Card[][] = Array.from({ length: n }, () => [])
    let pos = 0

    if (config.oneAtATime) {
      for (let round = 0; round < cardsPerPlayer; round++) {
        for (let seat = 0; seat < n; seat++) {
          if (pos < deck.length) {
            hands[seat].push(deck[pos++])
          }
        }
      }
    } else {
      for (let seat = 0; seat < n; seat++) {
        hands[seat] = deck.slice(pos, pos + cardsPerPlayer)
        pos += cardsPerPlayer
      }
    }

    const remaining = deck.slice(pos)
    const stock = config.remainderTo === 'stock' ? remaining : []
    const discard: Card[] = []

    if (config.remainderTo === 'discard' && remaining.length > 0) {
      discard.push(...remaining)
    }

    return { hands, stock, discard }
  }

  static sortHand(cards: Card[], sortBy: 'by-suit' | 'by-rank' | 'none'): Card[] {
    if (sortBy === 'none') return cards

    return [...cards].sort((a, b) => {
      if (sortBy === 'by-suit') {
        const suitOrder: Record<string, number> = {
          spades: 0,
          hearts: 1,
          diamonds: 2,
          clubs: 3,
        }
        const suitDiff =
          (suitOrder[a.suitId] ?? 99) - (suitOrder[b.suitId] ?? 99)
        if (suitDiff !== 0) return suitDiff
        return b.value - a.value
      }
      return b.value - a.value
    })
  }
}
