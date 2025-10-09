'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Chip Amount Display Component
export function ChipAmount({ amount, className, color = 'green' }: { amount: number | string; className?: string; color?: 'green' | 'red' | 'blue' | 'gold' }) {
  const colorClasses = {
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
    blue: 'text-blue-600 dark:text-blue-400',
    gold: 'text-yellow-600 dark:text-yellow-400',
  }

  return (
    <span className={cn('chip-stack font-semibold', colorClasses[color], className)}>
      <span className="chip-icon"></span>
      {amount.toLocaleString()}
    </span>
  )
}

// Stake Level Badge
export function StakeBadge({ level }: { level: 'micro' | 'low' | 'high' }) {
  const badges = {
    micro: { label: 'Micro Stakes', className: 'stake-badge-micro', emoji: '🟢' },
    low: { label: 'Low Stakes', className: 'stake-badge-low', emoji: '🟡' },
    high: { label: 'High Stakes', className: 'stake-badge-high', emoji: '🔴' },
  }

  const badge = badges[level]

  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold', badge.className)}>
      <span>{badge.emoji}</span>
      {badge.label}
    </span>
  )
}

// Card Suit Decorations
export function CardSuitDecor() {
  return (
    <>
      <span className="poker-card-suit" style={{ top: '10%', left: '5%' }}>♠</span>
      <span className="poker-card-suit" style={{ top: '10%', right: '5%' }}>♥</span>
      <span className="poker-card-suit" style={{ bottom: '10%', left: '5%' }}>♦</span>
      <span className="poker-card-suit" style={{ bottom: '10%', right: '5%' }}>♣</span>
    </>
  )
}

// Visual Seat Selector Component
interface Seat {
  index: number
  playerId: string | null
  isEmpty: boolean
}

export function PokerTableVisual({
  seats,
  selectedSeat,
  onSeatSelect,
  currentPlayerId,
}: {
  seats: Seat[]
  selectedSeat: number | null
  onSeatSelect: (index: number) => void
  currentPlayerId?: string
}) {
  // Calculate positions for 9 seats in a circular layout
  const getSeatPosition = (index: number) => {
    const angle = (index * 40 - 90) * (Math.PI / 180) // Distribute evenly in circle, start at top
    const radius = 42 // percentage from center
    const x = 50 + radius * Math.cos(angle)
    const y = 50 + radius * Math.sin(angle)
    return { x: `${x}%`, y: `${y}%` }
  }

  return (
    <div className="seat-selector">
      {/* Poker Table Surface */}
      <div className="absolute inset-0 rounded-[45%] poker-felt border-4 border-amber-700 dark:border-amber-900 shadow-2xl">
        <div className="absolute inset-[15%] rounded-[45%] border-2 border-amber-800/30 dark:border-amber-700/30"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white/20 font-bold text-xl">
            <div>SELECT</div>
            <div>YOUR SEAT</div>
          </div>
        </div>
      </div>

      {/* Seats */}
      {seats.map((seat) => {
        const pos = getSeatPosition(seat.index)
        const isSelected = selectedSeat === seat.index
        const isOccupied = !seat.isEmpty
        const isCurrentPlayer = seat.playerId === currentPlayerId

        return (
          <Button
            key={seat.index}
            onClick={() => !isOccupied && onSeatSelect(seat.index)}
            disabled={isOccupied && !isCurrentPlayer}
            className={cn(
              'seat-button',
              isSelected && 'ring-4 ring-yellow-400 scale-110',
              isOccupied && !isCurrentPlayer && 'bg-gray-400 dark:bg-gray-700',
              !isOccupied && 'bg-green-600 hover:bg-green-500 dark:bg-green-700 dark:hover:bg-green-600',
              isCurrentPlayer && 'bg-blue-600 dark:bg-blue-700'
            )}
            style={{ left: pos.x, top: pos.y }}
            size="icon"
          >
            <span className="text-xs font-bold">{seat.index + 1}</span>
          </Button>
        )
      })}
    </div>
  )
}

// Preset Table Template Card
export interface TablePreset {
  name: string
  level: 'micro' | 'low' | 'high'
  smallBlind: number
  bigBlind: number
  minBuyIn: number
  maxBuyIn: number
  description: string
}

export function PresetCard({
  preset,
  isSelected,
  onSelect,
}: {
  preset: TablePreset
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left p-4 rounded-lg border-2 transition-all',
        isSelected
          ? 'border-primary bg-primary/10 shadow-lg scale-[1.02]'
          : 'border-border hover:border-primary/50 hover:shadow-md'
      )}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">{preset.name}</h3>
          <StakeBadge level={preset.level} />
        </div>
        <p className="text-sm text-muted-foreground">{preset.description}</p>
        <div className="grid grid-cols-2 gap-2 text-sm mt-3">
          <div>
            <div className="text-muted-foreground">Blinds</div>
            <div className="font-semibold">
              <ChipAmount amount={preset.smallBlind} color="blue" /> / <ChipAmount amount={preset.bigBlind} color="red" />
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Buy-in</div>
            <div className="font-semibold">
              <ChipAmount amount={preset.minBuyIn} color="green" /> - <ChipAmount amount={preset.maxBuyIn} color="gold" />
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}
