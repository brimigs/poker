import { Button } from '@/components/ui/button'
import { UiWalletAccount } from '@wallet-ui/react'

import { usePokerInitializeMutation } from '@/features/poker/data-access/use-poker-initialize-mutation'

export function PokerUiButtonInitialize({ account }: { account: UiWalletAccount }) {
  const mutationInitialize = usePokerInitializeMutation({ account })

  return (
    <Button onClick={() => mutationInitialize.mutateAsync()} disabled={mutationInitialize.isPending}>
      Initialize Poker {mutationInitialize.isPending && '...'}
    </Button>
  )
}
