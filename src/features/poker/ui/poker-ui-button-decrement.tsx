import { PokerAccount } from '@project/anchor'
import { UiWalletAccount } from '@wallet-ui/react'
import { Button } from '@/components/ui/button'

import { usePokerDecrementMutation } from '../data-access/use-poker-decrement-mutation'

export function PokerUiButtonDecrement({ account, poker }: { account: UiWalletAccount; poker: PokerAccount }) {
  const decrementMutation = usePokerDecrementMutation({ account, poker })

  return (
    <Button variant="outline" onClick={() => decrementMutation.mutateAsync()} disabled={decrementMutation.isPending}>
      Decrement
    </Button>
  )
}
