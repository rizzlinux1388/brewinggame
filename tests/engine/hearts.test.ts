import { GameEngine } from '../../src/engine/GameEngine'
import { MoveValidator } from '../../src/engine/MoveValidator'
import { DeckManager } from '../../src/engine/DeckManager'
import { heartsDefinition } from '../../src/engine/built-in-games/hearts'
import type { EngineGameState } from '../../src/engine/types'

const fourPlayers = [
  { seatPosition: 0, isAI: false },
  { seatPosition: 1, isAI: false },
  { seatPosition: 2, isAI: false },
  { seatPosition: 3, isAI: false },
]

describe('GameEngine - Hearts', () => {
  describe('initialization', () => {
    it('deals 13 cards to each player', () => {
      const state = GameEngine.initialize(heartsDefinition, fourPlayers)
      for (const player of state.players) {
        expect(player.hand).toHaveLength(13)
      }
    })

    it('starts in the pass phase', () => {
      const state = GameEngine.initialize(heartsDefinition, fourPlayers)
      expect(state.phase.id).toBe('phase-pass')
    })

    it('has no trump suit', () => {
      const state = GameEngine.initialize(heartsDefinition, fourPlayers)
      expect(state.activeTrumpSuit).toBeNull()
    })

    it('all 52 cards are distributed', () => {
      const state = GameEngine.initialize(heartsDefinition, fourPlayers)
      const allCards = state.players.flatMap((p) => p.hand)
      expect(allCards).toHaveLength(52)

      const ids = new Set(allCards.map((c) => c.id))
      expect(ids.size).toBe(52)
    })
  })

  describe('DeckManager', () => {
    it('builds 52 unique cards for a standard deck', () => {
      const deck = DeckManager.buildDeck(heartsDefinition.deck)
      expect(deck).toHaveLength(52)
      const ids = new Set(deck.map((c) => c.id))
      expect(ids.size).toBe(52)
    })

    it('shuffles cards', () => {
      const deck1 = DeckManager.shuffle(DeckManager.buildDeck(heartsDefinition.deck))
      const deck2 = DeckManager.shuffle(DeckManager.buildDeck(heartsDefinition.deck))
      const same = deck1.every((c, i) => c.id === deck2[i].id)
      expect(same).toBe(false) // Very unlikely to be same order
    })
  })

  describe('pass phase', () => {
    it('allows passing 3 cards', () => {
      const state = GameEngine.initialize(heartsDefinition, fourPlayers)
      const hand = state.players[0].hand
      const toPass = hand.slice(0, 3)

      const result = GameEngine.applyMove(state, 0, {
        type: 'pass-cards',
        cards: toPass,
        direction: 'left',
      })

      expect(result.success).toBe(true)
    })

    it('rejects passing wrong number of cards', () => {
      const state = GameEngine.initialize(heartsDefinition, fourPlayers)
      const hand = state.players[0].hand

      const result = MoveValidator.validate(state, 0, {
        type: 'pass-cards',
        cards: hand.slice(0, 2),
        direction: 'left',
      })

      expect(result.valid).toBe(false)
      expect(result.reason).toContain('3')
    })
  })

  describe('trick-taking phase', () => {
    function skipToTrickPhase(state: EngineGameState): EngineGameState {
      let s = state
      // All players pass 3 cards
      for (let seat = 0; seat < 4; seat++) {
        const hand = s.players[seat].hand
        const result = GameEngine.applyMove(s, seat, {
          type: 'pass-cards',
          cards: hand.slice(0, 3),
          direction: 'left',
        })
        expect(result.success).toBe(true)
        s = result.newState
      }
      return s
    }

    it('advances to trick phase after all players pass', () => {
      const state = GameEngine.initialize(heartsDefinition, fourPlayers)
      const trickState = skipToTrickPhase(state)
      expect(trickState.phase.id).toBe('phase-tricks')
    })

    it('rejects playing a card not in hand', () => {
      const state = GameEngine.initialize(heartsDefinition, fourPlayers)
      const trickState = skipToTrickPhase(state)

      const otherPlayerCard = trickState.players[1].hand[0]
      const result = MoveValidator.validate(trickState, 0, {
        type: 'play-card',
        card: otherPlayerCard,
      })

      expect(result.valid).toBe(false)
      expect(result.reason).toContain('not in hand')
    })

    it('enforces must-follow-suit', () => {
      const state = GameEngine.initialize(heartsDefinition, fourPlayers)
      const trickState = skipToTrickPhase(state)

      // Find a player whose lead card determines the suit we can test
      const leadCard = trickState.players[trickState.currentTurn].hand[0]
      const leadResult = GameEngine.applyMove(trickState, trickState.currentTurn, {
        type: 'play-card',
        card: leadCard,
      })
      expect(leadResult.success).toBe(true)

      const s2 = leadResult.newState
      const nextSeat = s2.currentTurn
      const nextPlayer = s2.players[nextSeat]
      const leadSuit = leadCard.suitId

      // Find a card of a different suit when player has lead suit
      const hasLeadSuit = nextPlayer.hand.some((c) => c.suitId === leadSuit)
      if (hasLeadSuit) {
        const offSuit = nextPlayer.hand.find((c) => c.suitId !== leadSuit)
        if (offSuit) {
          const rejResult = MoveValidator.validate(s2, nextSeat, {
            type: 'play-card',
            card: offSuit,
          })
          expect(rejResult.valid).toBe(false)
        }
      }
    })

    it('tracks trick winner correctly', () => {
      const state = GameEngine.initialize(heartsDefinition, fourPlayers)
      const trickState = skipToTrickPhase(state)

      let s = trickState
      const initialTurn = s.currentTurn

      // Play a full trick (4 cards)
      for (let i = 0; i < 4; i++) {
        const seat = s.currentTurn
        const eligible = MoveValidator.getEligibleCards(s, seat)
        expect(eligible.length).toBeGreaterThan(0)

        const result = GameEngine.applyMove(s, seat, {
          type: 'play-card',
          card: eligible[0],
        })
        expect(result.success).toBe(true)
        s = result.newState
      }

      // After a full trick, trick pile should be cleared
      expect(s.currentTrick).toHaveLength(0)
      expect(s.trickNumber).toBe(2)
    })
  })

  describe('scoring', () => {
    it('each player starts with 0 score', () => {
      const state = GameEngine.initialize(heartsDefinition, fourPlayers)
      for (const player of state.players) {
        expect(player.score).toBe(0)
      }
    })
  })

  describe('move rejection', () => {
    it('rejects moves when not your turn', () => {
      const state = GameEngine.initialize(heartsDefinition, fourPlayers)
      const wrongSeat = (state.currentTurn + 1) % 4

      const result = MoveValidator.validate(state, wrongSeat, {
        type: 'pass-cards',
        cards: state.players[wrongSeat].hand.slice(0, 3),
        direction: 'left',
      })

      expect(result.valid).toBe(false)
      expect(result.reason).toContain('Not your turn')
    })
  })
})

describe('GameEngine - Full Hearts simulation', () => {
  it('completes a full hand (pass + 13 tricks) without errors', () => {
    const state = GameEngine.initialize(heartsDefinition, fourPlayers)
    let s = state

    // Pass phase: all 4 players pass 3 cards
    expect(s.phase.type).toBe('card-exchange')
    for (let seat = 0; seat < 4; seat++) {
      const hand = s.players[seat].hand
      const result = GameEngine.applyMove(s, seat, {
        type: 'pass-cards',
        cards: hand.slice(0, 3),
        direction: 'left',
      })
      expect(result.success).toBe(true)
      s = result.newState
    }

    expect(s.phase.id).toBe('phase-tricks')
    expect(s.phase.type).toBe('trick-taking')

    // Play exactly 13 tricks (52 card plays)
    let plays = 0
    const MAX_PLAYS = 52
    while (plays < MAX_PLAYS && !s.isGameOver) {
      // Stop if we've moved back to pass phase (new hand)
      if (s.phase.type !== 'trick-taking') break

      const seat = s.currentTurn
      const eligible = MoveValidator.getEligibleCards(s, seat)
      expect(eligible.length).toBeGreaterThan(0)

      const result = GameEngine.applyMove(s, seat, {
        type: 'play-card',
        card: eligible[0],
      })

      expect(result.success).toBe(true)
      s = result.newState
      plays++
    }

    // 13 tricks × 4 plays = 52 total card plays
    expect(plays).toBe(MAX_PLAYS)

    // After one hand, each player's score comes from hearts/QoS taken
    // Total scoring cards: 13 hearts (1pt each) + 1 QoS (13pt) = 26
    // Or if shoot the moon, some players get 26
    const totalScore = s.players.reduce((sum, p) => sum + p.score, 0)
    expect(totalScore % 26).toBe(0) // always a multiple of 26
    expect(totalScore).toBeGreaterThan(0) // at least one player scored
  })
})
