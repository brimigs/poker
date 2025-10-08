// Here we export some useful types and functions for interacting with the Anchor program.
import { Account, getBase58Decoder, SolanaClient } from 'gill'
import { getProgramAccountsDecoded } from './helpers/get-program-accounts-decoded'
import { Poker, POKER_DISCRIMINATOR, POKER_PROGRAM_ADDRESS, getPokerDecoder } from './client/js'
import PokerIDL from '../target/idl/poker.json'

export type PokerAccount = Account<Poker, string>

// Re-export the generated IDL and type
export { PokerIDL }

export * from './client/js'

export function getPokerProgramAccounts(rpc: SolanaClient['rpc']) {
  return getProgramAccountsDecoded(rpc, {
    decoder: getPokerDecoder(),
    filter: getBase58Decoder().decode(POKER_DISCRIMINATOR),
    programAddress: POKER_PROGRAM_ADDRESS,
  })
}
