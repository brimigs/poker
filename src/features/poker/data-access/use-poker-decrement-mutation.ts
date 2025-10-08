import { PokerAccount, getDecrementInstruction } from '@project/anchor'
import { useMutation } from '@tanstack/react-query'
import { UiWalletAccount, useWalletUiSigner } from '@wallet-ui/react'
import { useWalletUiSignAndSend } from '@wallet-ui/react-gill'
import { toastTx } from '@/components/toast-tx'
import { usePokerAccountsInvalidate } from './use-poker-accounts-invalidate'

export function usePokerDecrementMutation({
  account,
  poker,
}: {
  account: UiWalletAccount
  poker: PokerAccount
}) {
  const invalidateAccounts = usePokerAccountsInvalidate()
  const signer = useWalletUiSigner({ account })
  const signAndSend = useWalletUiSignAndSend()

  return useMutation({
    mutationFn: async () => await signAndSend(getDecrementInstruction({ poker: poker.address }), signer),
    onSuccess: async (tx) => {
      toastTx(tx)
      await invalidateAccounts()
    },
  })
}
