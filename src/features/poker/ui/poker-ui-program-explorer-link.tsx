import { POKER_PROGRAM_ADDRESS } from '@project/anchor'
import { AppExplorerLink } from '@/components/app-explorer-link'
import { ellipsify } from '@wallet-ui/react'

export function PokerUiProgramExplorerLink() {
  return <AppExplorerLink address={POKER_PROGRAM_ADDRESS} label={ellipsify(POKER_PROGRAM_ADDRESS)} />
}
