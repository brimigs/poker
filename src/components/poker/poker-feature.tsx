'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from '../solana/solana-provider'
import { ExplorerLink } from '../cluster/cluster-ui'
import { usePokerProgram } from './poker-data-access'
import { PokerTableCreate, PokerTableList } from './poker-ui'
import { AppHero } from '../app-hero'
import { ellipsify } from '@/lib/utils'

export default function PokerFeature() {
  const { publicKey } = useWallet()
  const { programId } = usePokerProgram()

  return publicKey ? (
    <div className="space-y-8">
      <div className="text-center space-y-4 py-8">
        <h1 className="text-4xl md:text-5xl font-bold">♠♥ Poker Tables ♦♣</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Create your own table or join an existing game. Play Texas Hold'em on-chain with provable fairness.
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="p-6 border rounded-lg bg-muted/30">
          <h3 className="font-semibold mb-4 text-center">💰 Chip Values (USDC)</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
                1
              </div>
              <div className="text-sm">
                <div className="font-semibold">$0.01</div>
                <div className="text-xs text-muted-foreground">Blue</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
                5
              </div>
              <div className="text-sm">
                <div className="font-semibold">$0.05</div>
                <div className="text-xs text-muted-foreground">Red</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                25
              </div>
              <div className="text-sm">
                <div className="font-semibold">$0.25</div>
                <div className="text-xs text-muted-foreground">Green</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white text-xs font-bold shadow-md">
                100
              </div>
              <div className="text-sm">
                <div className="font-semibold">$1.00</div>
                <div className="text-xs text-muted-foreground">Black</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                500
              </div>
              <div className="text-sm">
                <div className="font-semibold">$5.00</div>
                <div className="text-xs text-muted-foreground">Gold</div>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">
            All chip values are denominated in USDC • 1 chip = 1 lamport
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <PokerTableCreate />
      </div>
      <div className="max-w-6xl mx-auto">
        <PokerTableList />
      </div>
    </div>
  ) : (
    <div className="max-w-4xl mx-auto">
      <div className="hero py-16 md:py-24">
        <div className="hero-content text-center">
          <div className="space-y-8">
            <div className="text-6xl md:text-7xl">♠♥♦♣</div>
            <h1 className="text-4xl md:text-6xl font-bold">On-Chain Poker</h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
              Play Texas Hold'em on Solana blockchain. Provably fair, transparent, and decentralized.
            </p>
            <div className="pt-4">
              <WalletButton />
            </div>
            <div className="grid md:grid-cols-3 gap-6 pt-8 text-left">
              <div className="p-4 border rounded-lg">
                <div className="text-2xl mb-2">🔒</div>
                <h3 className="font-semibold mb-1">Provably Fair</h3>
                <p className="text-sm text-muted-foreground">All hands are verifiable on-chain</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl mb-2">⚡</div>
                <h3 className="font-semibold mb-1">Fast & Secure</h3>
                <p className="text-sm text-muted-foreground">Lightning-fast transactions on Solana</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl mb-2">🎲</div>
                <h3 className="font-semibold mb-1">Real Stakes</h3>
                <p className="text-sm text-muted-foreground">Play with real crypto, win real rewards</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
