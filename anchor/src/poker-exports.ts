// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import PokerIDL from '../target/idl/poker.json'
import type { Poker } from '../target/types/poker'

// Re-export the generated IDL and type
export { Poker, PokerIDL }

// The programId is imported from the program IDL.
export const POKER_PROGRAM_ID = new PublicKey(PokerIDL.address)

// This is a helper function to get the Poker Anchor program.
export function getPokerProgram(provider: AnchorProvider, address?: PublicKey): Program<Poker> {
  return new Program({ ...PokerIDL, address: address ? address.toBase58() : PokerIDL.address } as Poker, provider)
}

// This is a helper function to get the program ID for the Poker program depending on the cluster.
export function getPokerProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
      // This is the program ID for the Poker program on devnet and testnet.
      // Update this if you deploy to devnet/testnet
      return new PublicKey('Ev6eGkLNZQjgXekHWY1UMb1qkTVUzWsX1ziqcixqsieV')
    case 'mainnet-beta':
    default:
      return POKER_PROGRAM_ID
  }
}
