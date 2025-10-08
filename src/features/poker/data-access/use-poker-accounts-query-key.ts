import { useSolana } from '@/components/solana/use-solana'

export function usePokerAccountsQueryKey() {
  const { cluster } = useSolana()

  return ['poker', 'accounts', { cluster }]
}
