'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useBuilderStore } from '@/store/builderStore'
import { cn } from '@/lib/cn'

const STEPS = [
  { label: 'Basic Info', icon: '📝' },
  { label: 'Players', icon: '👥' },
  { label: 'Deck', icon: '🃏' },
  { label: 'Dealing', icon: '🤲' },
  { label: 'Phases', icon: '🔄' },
  { label: 'Scoring', icon: '🏆' },
  { label: 'Win Condition', icon: '🎯' },
  { label: 'Review', icon: '✅' },
]

export default function BuilderWizardPage() {
  const router = useRouter()
  const store = useBuilderStore()
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const def = store.toGameDefinition()

    const res = await fetch('/api/game-definitions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schema: def, isPublished: true }),
    })

    if (res.ok) {
      store.reset()
      router.push('/games')
    }
    setSaving(false)
  }

  const step = store.step

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Visual Game Builder</h1>

      {/* Step indicators */}
      <div className="flex gap-1 mb-8 overflow-x-auto">
        {STEPS.map((s, i) => {
          const n = i + 1
          return (
            <button
              key={n}
              onClick={() => store.setStep(n)}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium shrink-0 transition-colors',
                step === n
                  ? 'bg-emerald-700 text-white'
                  : step > n
                  ? 'bg-gray-700 text-gray-300'
                  : 'bg-gray-900 text-gray-500'
              )}
            >
              <span>{s.icon}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          )
        })}
      </div>

      {/* Step content */}
      <div className="card-panel min-h-64">
        {step === 1 && <Step1BasicInfo />}
        {step === 2 && <Step2Players />}
        {step === 3 && <Step3Deck />}
        {step === 4 && <Step4Dealing />}
        {step === 5 && <Step5Phases />}
        {step === 6 && <Step6Scoring />}
        {step === 7 && <Step7WinCondition />}
        {step === 8 && <Step8Review onSave={handleSave} saving={saving} />}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button
          onClick={() => store.setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="btn-secondary disabled:opacity-30"
        >
          ← Back
        </button>
        {step < 8 && (
          <button
            onClick={() => store.setStep(step + 1)}
            className="btn-primary"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  )
}

function Step1BasicInfo() {
  const store = useBuilderStore()
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Basic Information</h2>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Game Name</label>
        <input
          type="text"
          value={store.name}
          onChange={(e) => store.setName(e.target.value)}
          className="input-field"
          placeholder="My Awesome Card Game"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Description</label>
        <textarea
          value={store.description}
          onChange={(e) => store.setDescription(e.target.value)}
          rows={3}
          className="input-field resize-none"
          placeholder="A brief description of how to play and what makes your game unique."
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Estimated Time (minutes)</label>
        <input
          type="number"
          value={store.estimatedMinutes}
          onChange={(e) => store.setEstimatedMinutes(Number(e.target.value))}
          className="input-field"
          min={5}
          max={300}
        />
      </div>
    </div>
  )
}

function Step2Players() {
  const store = useBuilderStore()
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Player Count</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Minimum Players</label>
          <input
            type="number"
            value={store.minPlayers}
            onChange={(e) => store.setPlayers(Number(e.target.value), store.maxPlayers)}
            className="input-field"
            min={2}
            max={10}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Maximum Players</label>
          <input
            type="number"
            value={store.maxPlayers}
            onChange={(e) => store.setPlayers(store.minPlayers, Number(e.target.value))}
            className="input-field"
            min={2}
            max={10}
          />
        </div>
      </div>
    </div>
  )
}

function Step3Deck() {
  const store = useBuilderStore()
  const isStandard =
    store.deck.suits.length === 4 &&
    store.deck.ranks.length === 13 &&
    !store.deck.includeJokers

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Deck Configuration</h2>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Standard 52-card', suits: 4, ranks: 13, jokers: 0 },
          { label: '54-card (with Jokers)', suits: 4, ranks: 13, jokers: 2 },
        ].map((preset) => (
          <button
            key={preset.label}
            onClick={() =>
              store.setDeck({
                ...store.deck,
                includeJokers: preset.jokers > 0,
                jokerCount: preset.jokers,
              })
            }
            className={cn(
              'rounded-lg border p-3 text-left text-sm transition-colors',
              !store.deck.includeJokers && preset.jokers === 0
                ? 'border-emerald-500 bg-emerald-900/30 text-white'
                : store.deck.includeJokers && preset.jokers > 0
                ? 'border-emerald-500 bg-emerald-900/30 text-white'
                : 'border-gray-700 text-gray-400 hover:border-gray-500'
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Deck copies</label>
        <select
          value={store.deck.copies}
          onChange={(e) => store.setDeck({ ...store.deck, copies: Number(e.target.value) })}
          className="input-field"
        >
          {[1, 2, 3].map((n) => (
            <option key={n} value={n}>{n} deck{n > 1 ? 's' : ''}</option>
          ))}
        </select>
      </div>
      <div className="text-sm text-gray-500">
        Total cards: {store.deck.suits.length * store.deck.ranks.length * store.deck.copies + (store.deck.includeJokers ? store.deck.jokerCount ?? 2 : 0)}
      </div>
    </div>
  )
}

function Step4Dealing() {
  const store = useBuilderStore()
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Dealing Rules</h2>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Cards per player</label>
        <select
          value={String(store.dealing.cardsPerPlayer)}
          onChange={(e) => {
            const v = e.target.value
            store.setDealing({
              ...store.dealing,
              cardsPerPlayer: v === 'all' || v === 'even' ? v : Number(v),
            })
          }}
          className="input-field"
        >
          {Array.from({ length: 26 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{n} cards</option>
          ))}
          <option value="even">Split evenly</option>
          <option value="all">All cards</option>
        </select>
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Leftover cards go to</label>
        <select
          value={store.dealing.remainderTo}
          onChange={(e) =>
            store.setDealing({
              ...store.dealing,
              remainderTo: e.target.value as 'stock' | 'discard' | 'none',
            })
          }
          className="input-field"
        >
          <option value="none">Discard (not used)</option>
          <option value="stock">Stock pile (draw pile)</option>
          <option value="discard">Discard pile</option>
        </select>
      </div>
    </div>
  )
}

function Step5Phases() {
  const store = useBuilderStore()
  const phase = store.phases[0]

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Game Phases</h2>
      <p className="text-gray-400 text-sm">Configure the main play phase of your game.</p>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Phase Type</label>
        <select
          value={phase.type}
          onChange={(e) =>
            store.setPhases([{ ...phase, type: e.target.value as PhaseConfig['type'] }])
          }
          className="input-field"
        >
          <option value="trick-taking">Trick-Taking (highest card wins)</option>
          <option value="bidding">Bidding</option>
          <option value="card-exchange">Card Exchange (pass cards)</option>
          <option value="discard">Shedding (play to discard pile)</option>
          <option value="draw">Draw</option>
          <option value="free-play">Free Play</option>
        </select>
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Turn Order</label>
        <select
          value={phase.turnOrder.direction}
          onChange={(e) =>
            store.setPhases([
              {
                ...phase,
                turnOrder: {
                  ...phase.turnOrder,
                  direction: e.target.value as 'clockwise' | 'counterclockwise',
                },
              },
            ])
          }
          className="input-field"
        >
          <option value="clockwise">Clockwise</option>
          <option value="counterclockwise">Counter-clockwise</option>
        </select>
      </div>
    </div>
  )

  // TypeScript fix — PhaseConfig type needs to be imported
  type PhaseConfig = import('@/types/game-definition').PhaseConfig
}

function Step6Scoring() {
  const store = useBuilderStore()

  function addTrickEvent() {
    store.setScoringEvents([
      ...store.scoringEvents,
      {
        id: `score-${Date.now()}`,
        trigger: { type: 'trick-won' },
        formula: { type: 'fixed', value: 1 },
        appliesTo: 'trick-winner',
      },
    ])
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Scoring</h2>

      <div className="space-y-2">
        {store.scoringEvents.length === 0 && (
          <p className="text-gray-500 text-sm">No scoring events yet. Add one below.</p>
        )}
        {store.scoringEvents.map((event, i) => (
          <div key={event.id} className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
            <div className="text-sm text-gray-300">
              {event.trigger.type === 'trick-won' ? 'Per trick won' : 'Per card'}: {' '}
              {event.formula.type === 'fixed' ? `${event.formula.value} pt` : 'custom'}
            </div>
            <button
              onClick={() =>
                store.setScoringEvents(store.scoringEvents.filter((_, j) => j !== i))
              }
              className="text-red-400 text-xs hover:text-red-300"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button onClick={addTrickEvent} className="btn-secondary text-sm">
        + Add Trick-Win Points
      </button>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={store.runningTotal}
          onChange={(e) => store.setRunningTotal(e.target.checked)}
          className="w-4 h-4"
        />
        <span className="text-sm text-gray-300">Carry scores across rounds</span>
      </label>
    </div>
  )
}

function Step7WinCondition() {
  const store = useBuilderStore()
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Win Condition</h2>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Winner is the player with</label>
        <select
          value={store.winCondition.type}
          onChange={(e) =>
            store.setWinCondition({
              ...store.winCondition,
              type: e.target.value as WinCondition['type'],
            })
          }
          className="input-field"
        >
          <option value="highest-score">Highest Score</option>
          <option value="lowest-score">Lowest Score</option>
          <option value="first-to-score">First to Reach X Points</option>
        </select>
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Game ends when</label>
        <select
          value={store.winCondition.endTrigger}
          onChange={(e) =>
            store.setWinCondition({
              ...store.winCondition,
              endTrigger: e.target.value as WinCondition['endTrigger'],
            })
          }
          className="input-field"
        >
          <option value="score-threshold">A player reaches the score threshold</option>
          <option value="rounds-exhausted">After N rounds</option>
        </select>
      </div>
      {store.winCondition.endTrigger === 'score-threshold' && (
        <div>
          <label className="block text-sm text-gray-400 mb-1">Score threshold</label>
          <input
            type="number"
            value={store.winCondition.scoreThreshold ?? 100}
            onChange={(e) =>
              store.setWinCondition({ ...store.winCondition, scoreThreshold: Number(e.target.value) })
            }
            className="input-field"
            min={1}
          />
        </div>
      )}
    </div>
  )

  type WinCondition = import('@/types/game-definition').WinCondition
}

function Step8Review({ onSave, saving }: { onSave: () => void; saving: boolean }) {
  const store = useBuilderStore()
  const def = store.toGameDefinition()

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Review & Save</h2>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Name</span>
          <span className="text-white">{def.name || '(unnamed)'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Players</span>
          <span className="text-white">{def.minPlayers}–{def.maxPlayers}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Cards in deck</span>
          <span className="text-white">
            {def.deck.suits.length * def.deck.ranks.length * def.deck.copies}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Cards per player</span>
          <span className="text-white">{String(def.dealing.cardsPerPlayer)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Phases</span>
          <span className="text-white">{def.phases.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Win by</span>
          <span className="text-white">{def.winCondition.type.replace('-', ' ')}</span>
        </div>
      </div>

      <details>
        <summary className="text-xs text-gray-500 cursor-pointer">View JSON</summary>
        <pre className="mt-2 text-xs text-gray-400 overflow-auto max-h-48">
          {JSON.stringify(def, null, 2)}
        </pre>
      </details>

      <button
        onClick={onSave}
        disabled={saving || !store.name}
        className="btn-primary w-full py-3 text-lg disabled:opacity-50"
      >
        {saving ? 'Saving…' : '✓ Save & Publish Game'}
      </button>

      {!store.name && (
        <p className="text-yellow-400 text-xs">Please add a game name in Step 1 before saving.</p>
      )}
    </div>
  )
}
