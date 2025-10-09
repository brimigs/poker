'use client'

import { useParams } from 'next/navigation'
import { PublicKey } from '@solana/web3.js'
import { PokerGameTable } from '@/components/poker/poker-ui'
import { AppHero } from '@/components/app-hero'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function PokerTablePage() {
  const params = useParams()
  const address = params.address as string

  let tableAddress: PublicKey
  try {
    tableAddress = new PublicKey(address)
  } catch (e) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Invalid Table Address</h1>
        <Link href="/poker">
          <Button>Back to Tables</Button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <AppHero title="Poker Table" subtitle="Play poker with other players on-chain">
        <Link href="/poker">
          <Button variant="outline">Back to All Tables</Button>
        </Link>
      </AppHero>
      <PokerGameTable account={tableAddress} />
    </div>
  )
}
