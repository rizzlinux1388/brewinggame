'use client'

import { useEffect, useRef } from 'react'
import type { GameLogEntry } from '@/store/gameStore'

type Props = {
  entries: GameLogEntry[]
}

const typeStyles: Record<GameLogEntry['type'], string> = {
  trick: 'text-gray-300',
  hand: 'text-yellow-300 font-medium',
  phase: 'text-emerald-400 font-semibold text-center',
  game: 'text-blue-300 font-semibold',
}

export function GameLog({ entries }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries.length])

  return (
    <div className="card-panel flex flex-col min-h-0 h-48">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 shrink-0">
        Game Log
      </h3>
      <div className="flex-1 overflow-y-auto space-y-0.5 text-xs">
        {entries.length === 0 ? (
          <p className="text-gray-600 italic">No events yet</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className={typeStyles[entry.type]}>
              {entry.message}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
