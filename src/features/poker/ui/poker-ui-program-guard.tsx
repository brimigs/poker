import { ReactNode } from 'react'

import { AppAlert } from '@/components/app-alert'
import { useSolana } from '@/components/solana/use-solana'
import { usePokerProgram } from '@/features/poker/data-access/use-poker-program'

export function PokerUiProgramGuard({ children }: { children: ReactNode }) {
  const { cluster } = useSolana()
  const programAccountQuery = usePokerProgram()

  if (programAccountQuery.isLoading) {
    return <span className="loading loading-spinner loading-lg"></span>
  }

  if (!programAccountQuery.data?.value) {
    return (
      <AppAlert>Program account not found on {cluster.label}. Be sure to deploy your program and try again.</AppAlert>
    )
  }

  return children
}
