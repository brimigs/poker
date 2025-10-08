import { PokerUiCard } from './poker-ui-card'
import { usePokerAccountsQuery } from '@/features/poker/data-access/use-poker-accounts-query'
import { UiWalletAccount } from '@wallet-ui/react'

export function PokerUiList({ account }: { account: UiWalletAccount }) {
  const pokerAccountsQuery = usePokerAccountsQuery()

  if (pokerAccountsQuery.isLoading) {
    return <span className="loading loading-spinner loading-lg"></span>
  }

  if (!pokerAccountsQuery.data?.length) {
    return (
      <div className="text-center">
        <h2 className={'text-2xl'}>No accounts</h2>
        No accounts found. Initialize one to get started.
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {pokerAccountsQuery.data?.map((poker) => (
        <PokerUiCard account={account} key={poker.address} poker={poker} />
      ))}
    </div>
  )
}
