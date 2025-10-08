import { PokerAccount } from '@project/anchor'
import { UiWalletAccount } from '@wallet-ui/react'
import { Button } from '@/components/ui/button'

import { usePokerCloseMutation } from '@/features/poker/data-access/use-poker-close-mutation'

export function PokerUiButtonClose({ account, poker }: { account: UiWalletAccount; poker: PokerAccount }) {
  const closeMutation = usePokerCloseMutation({ account, poker })

  return (
    <Button
      variant="destructive"
      onClick={() => {
        if (!window.confirm('Are you sure you want to close this account?')) {
          return
        }
        return closeMutation.mutateAsync()
      }}
      disabled={closeMutation.isPending}
    >
      Close
    </Button>
  )
}
