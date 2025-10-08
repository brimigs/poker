import { PokerAccount } from '@project/anchor'
import { UiWalletAccount } from '@wallet-ui/react'
import { Button } from '@/components/ui/button'
import { usePokerIncrementMutation } from '../data-access/use-poker-increment-mutation'

export function PokerUiButtonIncrement({ account, poker }: { account: UiWalletAccount; poker: PokerAccount }) {
  const incrementMutation = usePokerIncrementMutation({ account, poker })

  return (
    <Button variant="outline" onClick={() => incrementMutation.mutateAsync()} disabled={incrementMutation.isPending}>
      Increment
    </Button>
  )
}
