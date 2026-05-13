'use client'

import { useState } from 'react'
import type { ValidMove } from '@/types/socket-events'
import type { TypedClientSocket } from '@/lib/socket-client'

type Props = {
  validMoves: ValidMove[]
  roomId: string
  socket: TypedClientSocket
}

export function BidPanel({ validMoves, roomId, socket }: Props) {
  const bidMove = validMoves.find((m) => m.type === 'bid')
  const [bid, setBid] = useState<number>(0)

  if (!bidMove || bidMove.type !== 'bid') return null

  const { min, max } = bidMove.range

  function handleBid() {
    socket.emit('game:move', { roomId, type: 'bid', amount: bid }, () => {})
  }

  return (
    <div className="card-panel flex flex-col items-center gap-3 max-w-xs mx-auto">
      <h3 className="font-semibold text-white">Place Your Bid</h3>
      <p className="text-sm text-gray-400">How many tricks will you take?</p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setBid((b) => Math.max(min, b - 1))}
          className="btn-secondary w-8 h-8 text-lg flex items-center justify-center p-0"
        >
          −
        </button>
        <span className="text-3xl font-bold text-white w-12 text-center">{bid}</span>
        <button
          onClick={() => setBid((b) => Math.min(max, b + 1))}
          className="btn-secondary w-8 h-8 text-lg flex items-center justify-center p-0"
        >
          +
        </button>
      </div>
      <button onClick={handleBid} className="btn-primary w-full">
        Bid {bid}
      </button>
    </div>
  )
}
