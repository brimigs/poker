import { useQueryClient } from '@tanstack/react-query'
import { usePokerAccountsQueryKey } from './use-poker-accounts-query-key'

export function usePokerAccountsInvalidate() {
  const queryClient = useQueryClient()
  const queryKey = usePokerAccountsQueryKey()

  return () => queryClient.invalidateQueries({ queryKey })
}
