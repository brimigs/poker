import { PokerAccount, getIncrementInstruction } from '@project/anchor'
import { UiWalletAccount, useWalletUiSigner } from '@wallet-ui/react'
import { useWalletUiSignAndSend } from '@wallet-ui/react-gill'
import { useMutation } from '@tanstack/react-query'
import { toastTx } from '@/components/toast-tx'
import { usePokerAccountsInvalidate } from './use-poker-accounts-invalidate'

export function usePokerIncrementMutation({
  account,
  poker,
}: {
  account: UiWalletAccount
  poker: PokerAccount
}) {
  const invalidateAccounts = usePokerAccountsInvalidate()
  const signAndSend = useWalletUiSignAndSend()
  const signer = useWalletUiSigner({ account })

  return useMutation({
    mutationFn: async () => await signAndSend(getIncrementInstruction({ poker: poker.address }), signer),
    onSuccess: async (tx) => {
      toastTx(tx)
      await invalidateAccounts()
    },
  })
}
