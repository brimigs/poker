import { PokerAccount } from '@project/anchor'
import { UiWalletAccount } from '@wallet-ui/react'
import { Button } from '@/components/ui/button'

import { usePokerSetMutation } from '@/features/poker/data-access/use-poker-set-mutation'

export function PokerUiButtonSet({ account, poker }: { account: UiWalletAccount; poker: PokerAccount }) {
  const setMutation = usePokerSetMutation({ account, poker })

  return (
    <Button
      variant="outline"
      onClick={() => {
        const value = window.prompt('Set value to:', poker.data.count.toString() ?? '0')
        if (!value || parseInt(value) === poker.data.count || isNaN(parseInt(value))) {
          return
        }
        return setMutation.mutateAsync(parseInt(value))
      }}
      disabled={setMutation.isPending}
    >
      Set
    </Button>
  )
}
