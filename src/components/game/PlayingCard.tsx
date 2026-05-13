'use client'

import { cn } from '@/lib/cn'

type Props = {
  suitId: string
  rankId: string
  faceUp?: boolean
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
}

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
  joker: '🃏',
}

const RED_SUITS = new Set(['hearts', 'diamonds'])

const SIZE_CLASSES = {
  sm: 'w-10 text-xs',
  md: 'w-16 text-sm',
  lg: 'w-20 text-base',
}

export function PlayingCard({
  suitId,
  rankId,
  faceUp = true,
  selected = false,
  disabled = false,
  onClick,
  size = 'md',
}: Props) {
  const isRed = RED_SUITS.has(suitId)
  const symbol = SUIT_SYMBOLS[suitId] ?? suitId[0].toUpperCase()

  if (!faceUp) {
    return (
      <div
        className={cn(
          'playing-card flex items-center justify-center rounded-lg',
          SIZE_CLASSES[size],
          'aspect-[2.5/3.5]'
        )}
        style={{
          background: 'repeating-linear-gradient(45deg, #1e3a5f, #1e3a5f 2px, #1a3355 2px, #1a3355 8px)',
          border: '2px solid #4a7a9b',
        }}
      />
    )
  }

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled && !onClick}
      className={cn(
        'playing-card flex flex-col justify-between p-1.5 rounded-lg select-none',
        SIZE_CLASSES[size],
        'aspect-[2.5/3.5]',
        isRed ? 'text-card-red' : 'text-card-black',
        selected && 'selected',
        disabled && 'disabled',
        onClick && !disabled && 'cursor-pointer'
      )}
    >
      <div className="flex flex-col items-start leading-none">
        <span className="font-bold">{rankId}</span>
        <span>{symbol}</span>
      </div>
      <div className="flex items-center justify-center text-2xl opacity-80">
        {symbol}
      </div>
      <div className="flex flex-col items-end leading-none rotate-180">
        <span className="font-bold">{rankId}</span>
        <span>{symbol}</span>
      </div>
    </button>
  )
}
