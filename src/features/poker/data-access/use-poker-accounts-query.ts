import { useSolana } from '@/components/solana/use-solana'
import { useQuery } from '@tanstack/react-query'
import { getPokerProgramAccounts } from '@project/anchor'
import { usePokerAccountsQueryKey } from './use-poker-accounts-query-key'

export function usePokerAccountsQuery() {
  const { client } = useSolana()

  return useQuery({
    queryKey: usePokerAccountsQueryKey(),
    queryFn: async () => await getPokerProgramAccounts(client.rpc),
  })
}
