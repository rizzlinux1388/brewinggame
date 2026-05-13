'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { GameDefinition } from '@/types/game-definition'

type GenerationState = 'idle' | 'generating' | 'done' | 'error'

export default function AICreatorPage() {
  const router = useRouter()
  const [description, setDescription] = useState('')
  const [state, setState] = useState<GenerationState>('idle')
  const [streamedTokens, setStreamedTokens] = useState('')
  const [schema, setSchema] = useState<GameDefinition | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [gameName, setGameName] = useState('')
  const [isPublished, setIsPublished] = useState(false)

  async function handleGenerate() {
    if (!description.trim()) return
    setState('generating')
    setStreamedTokens('')
    setSchema(null)
    setErrors([])

    const res = await fetch('/api/ai/generate-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    })

    if (!res.ok || !res.body) {
      setState('error')
      setErrors(['Failed to connect to AI service'])
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter((l) => l.startsWith('data: '))

      for (const line of lines) {
        try {
          const data = JSON.parse(line.slice(6))

          if (data.token) {
            setStreamedTokens((prev) => prev + data.token)
          }

          if (data.done) {
            if (data.valid && data.schema) {
              setSchema(data.schema)
              setGameName(data.schema.name)
              setState('done')
            } else {
              setErrors(data.errors ?? ['Unknown error'])
              setState('error')
            }
          }
        } catch {}
      }
    }
  }

  async function handleSave() {
    if (!schema) return
    setSaving(true)

    const finalSchema = { ...schema, name: gameName || schema.name }

    const res = await fetch('/api/game-definitions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schema: finalSchema,
        isPublished,
        createdByAI: true,
        aiPrompt: description,
      }),
    })

    if (res.ok) {
      router.push('/games')
    } else {
      const data = await res.json()
      setErrors([data.error ?? 'Failed to save'])
    }
    setSaving(false)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-2">AI Game Creator</h1>
      <p className="text-gray-400 text-sm mb-6">
        Describe your card game in plain English. Be specific about player count, how cards are played,
        and how points are scored.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Game Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="input-field resize-none"
            placeholder="Example: A trick-taking game for 3 players using a standard deck. Each player is dealt 17 cards. Players must follow suit. Hearts are worth 1 point each. The player with the fewest points after 50 total points are dealt out wins."
            disabled={state === 'generating'}
          />
          <div className="text-xs text-gray-600 mt-1">{description.length}/2000</div>
        </div>

        {state === 'idle' || state === 'error' ? (
          <button
            onClick={handleGenerate}
            disabled={!description.trim() || description.length < 10}
            className="btn-primary w-full py-3"
          >
            🤖 Generate Game
          </button>
        ) : state === 'generating' ? (
          <div className="card-panel">
            <div className="flex items-center gap-3 mb-3">
              <div className="animate-spin w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full" />
              <span className="text-emerald-400 font-medium">Generating your game…</span>
            </div>
            <div className="text-xs text-gray-500 font-mono max-h-32 overflow-auto">
              {streamedTokens.slice(-500)}
            </div>
          </div>
        ) : null}

        {errors.length > 0 && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
            <p className="text-red-300 font-medium mb-2">Generation failed:</p>
            <ul className="text-red-400 text-sm space-y-1">
              {errors.map((e, i) => <li key={i}>• {e}</li>)}
            </ul>
            <button onClick={handleGenerate} className="btn-danger text-sm mt-3">
              Try Again
            </button>
          </div>
        )}

        {state === 'done' && schema && (
          <div className="space-y-4">
            <div className="bg-emerald-900/20 border border-emerald-700 rounded-lg p-4">
              <p className="text-emerald-300 font-medium mb-1">✓ Game generated successfully!</p>
              <p className="text-gray-400 text-sm">{schema.description}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="bg-gray-800 px-2 py-1 rounded">{schema.minPlayers}–{schema.maxPlayers} players</span>
                <span className="bg-gray-800 px-2 py-1 rounded">~{schema.estimatedMinutes} min</span>
                {schema.tags.map((t) => (
                  <span key={t} className="bg-gray-800 px-2 py-1 rounded">{t}</span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Game Name</label>
              <input
                type="text"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                className="input-field"
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-gray-300">Make this game public (others can play it)</span>
            </label>

            <details className="card-panel cursor-pointer">
              <summary className="text-sm text-gray-400 select-none">View generated JSON schema</summary>
              <pre className="mt-3 text-xs text-gray-400 overflow-auto max-h-64">
                {JSON.stringify(schema, null, 2)}
              </pre>
            </details>

            <div className="flex gap-3">
              <button
                onClick={() => { setState('idle'); setSchema(null) }}
                className="btn-secondary"
              >
                Start Over
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex-1"
              >
                {saving ? 'Saving…' : 'Save Game'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
