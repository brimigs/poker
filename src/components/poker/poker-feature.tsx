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
    <div>
      <AppHero
        title="Poker"
        subtitle="Create or join a poker table. Play Texas Hold'em on-chain with other players."
      >
        <p className="mb-6">
          <ExplorerLink path={`account/${programId}`} label={ellipsify(programId.toString())} />
        </p>
        <PokerTableCreate />
      </AppHero>
      <PokerTableList />
    </div>
  ) : (
    <div className="max-w-4xl mx-auto">
      <div className="hero py-[64px]">
        <div className="hero-content text-center">
          <div className="space-y-6">
            <h1 className="text-5xl font-bold">Welcome to On-Chain Poker</h1>
            <p className="text-lg">Connect your wallet to create or join poker tables</p>
            <WalletButton />
          </div>
        </div>
      </div>
    </div>
  )
}
