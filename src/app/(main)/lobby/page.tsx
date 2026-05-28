'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type GameDef = {
  id: string
  name: string
  description: string
  minPlayers: number
  maxPlayers: number
  tags: string[]
  isBuiltIn: boolean
}

type Room = {
  id: string
  code: string
  status: string
  mode: string
  maxPlayers: number
  gameDefinition: { name: string; minPlayers: number; maxPlayers: number }
  participants: { seatPosition: number; type: string }[]
}

export default function LobbyPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [games, setGames] = useState<GameDef[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedGame, setSelectedGame] = useState<GameDef | null>(null)
  const [creating, setCreating] = useState(false)
  const [aiCount, setAiCount] = useState(1)

  useEffect(() => {
    fetch('/api/game-definitions?builtIn=true')
      .then((r) => r.json())
      .then(setGames)
    fetch('/api/rooms')
      .then((r) => r.json())
      .then(setRooms)
  }, [])

  useEffect(() => {
    if (selectedGame) {
      const max = selectedGame.maxPlayers - 1
      setAiCount((prev) => Math.min(prev, max))
    }
  }, [selectedGame])

  async function createRoom(mode: 'REALTIME' | 'AI_SOLO') {
    if (!selectedGame) return
    setCreating(true)

    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameDefinitionId: selectedGame.id,
        mode,
        aiCount: mode === 'AI_SOLO' ? aiCount : 0,
      }),
    })

    if (res.ok) {
      const room = await res.json()
      router.push(`/game/${room.id}`)
    }
    setCreating(false)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Game Lobby</h1>
        <Link href="/builder" className="btn-secondary text-sm">
          + Create Custom Game
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game picker */}
        <div className="lg:col-span-1">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Choose a Game
          </h2>
          <div className="space-y-2">
            {games.map((game) => (
              <button
                key={game.id}
                onClick={() => setSelectedGame(game)}
                className={`w-full text-left rounded-xl px-4 py-3 border transition-all ${
                  selectedGame?.id === game.id
                    ? 'bg-emerald-900/40 border-emerald-600 ring-1 ring-emerald-500'
                    : 'bg-gray-900 border-gray-800 hover:border-gray-600'
                }`}
              >
                <div className="font-medium text-white">{game.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {game.minPlayers}–{game.maxPlayers} players
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Start game */}
        <div className="lg:col-span-1">
          {selectedGame ? (
            <div className="card-panel">
              <h2 className="font-bold text-white text-lg mb-1">{selectedGame.name}</h2>
              <p className="text-gray-400 text-sm mb-4">{selectedGame.description}</p>

              <div className="space-y-3">
                <button
                  onClick={() => createRoom('AI_SOLO')}
                  disabled={creating}
                  className="btn-primary w-full"
                >
                  🤖 Play vs AI
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">AI opponents:</span>
                  {Array.from({ length: selectedGame.maxPlayers - 1 }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => setAiCount(n)}
                      className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                        aiCount === n ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                <div className="border-t border-gray-700 pt-3">
                  <button
                    onClick={() => createRoom('REALTIME')}
                    disabled={creating}
                    className="btn-secondary w-full"
                  >
                    👥 Create Multiplayer Room
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card-panel text-center text-gray-500 py-12">
              Select a game to get started
            </div>
          )}
        </div>

        {/* Open rooms */}
        <div className="lg:col-span-1">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Open Rooms
          </h2>
          {rooms.length === 0 ? (
            <div className="text-gray-600 text-sm">No open rooms right now</div>
          ) : (
            <div className="space-y-2">
              {rooms.map((room) => (
                <div key={room.id} className="card-panel">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white text-sm">
                        {room.gameDefinition.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {room.participants.length}/{room.maxPlayers} players · Code:{' '}
                        <span className="font-mono text-emerald-400">{room.code}</span>
                      </div>
                    </div>
                    <Link
                      href={`/game/${room.id}`}
                      className="btn-secondary text-xs px-3 py-1"
                    >
                      Join
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
