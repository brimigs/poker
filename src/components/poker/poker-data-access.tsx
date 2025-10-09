'use client'

import { getPokerProgram, getPokerProgramId } from '@project/anchor'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Cluster, Keypair, PublicKey } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../use-transaction-toast'
import { toast } from 'sonner'
import BN from 'bn.js'

export function usePokerProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getPokerProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getPokerProgram(provider, programId), [provider, programId])

  const tables = useQuery({
    queryKey: ['poker', 'tables', 'all', { cluster }],
    queryFn: () => program.account.pokerTable.all(),
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const initializeTable = useMutation({
    mutationKey: ['poker', 'initializeTable', { cluster }],
    mutationFn: async ({
      tableId,
      smallBlind,
      bigBlind,
      minBuyIn,
      maxBuyIn,
    }: {
      tableId: number
      smallBlind: number
      bigBlind: number
      minBuyIn: number
      maxBuyIn: number
    }) => {
      const [tablePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('table'), new BN(tableId).toArrayLike(Buffer, 'le', 8)],
        program.programId
      )

      return program.methods
        .initializeTable(new BN(tableId), new BN(smallBlind), new BN(bigBlind), new BN(minBuyIn), new BN(maxBuyIn))
        .accounts({
          table: tablePda,
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await tables.refetch()
    },
    onError: (error) => {
      toast.error(`Failed to initialize table: ${error.message}`)
    },
  })

  return {
    program,
    programId,
    tables,
    getProgramAccount,
    initializeTable,
  }
}

export function usePokerTable({ account }: { account: PublicKey }) {
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const { program, tables } = usePokerProgram()
  const { publicKey } = useWallet()

  const tableQuery = useQuery({
    queryKey: ['poker', 'table', 'fetch', { cluster, account }],
    queryFn: () => program.account.pokerTable.fetch(account),
  })

  const playerStateAddress = useMemo(() => {
    if (!publicKey) return null
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('player'), account.toBuffer(), publicKey.toBuffer()],
      program.programId
    )
    return pda
  }, [publicKey, account, program.programId])

  const playerStateQuery = useQuery({
    queryKey: ['poker', 'playerState', 'fetch', { cluster, account, player: publicKey?.toString() }],
    queryFn: async () => {
      if (!playerStateAddress) return null
      try {
        return await program.account.playerState.fetch(playerStateAddress)
      } catch (e) {
        return null
      }
    },
    enabled: !!playerStateAddress,
  })

  const joinTable = useMutation({
    mutationKey: ['poker', 'joinTable', { cluster, account }],
    mutationFn: async ({ buyInAmount, position }: { buyInAmount: number; position: number }) => {
      if (!publicKey || !playerStateAddress) throw new Error('Wallet not connected')

      return program.methods
        .joinTable(new BN(buyInAmount), position)
        .accounts({
          table: account,
          playerState: playerStateAddress,
        })
        .rpc()
    },
    onSuccess: async (tx) => {
      transactionToast(tx)
      await tableQuery.refetch()
      await playerStateQuery.refetch()
      await tables.refetch()
    },
    onError: (error) => {
      toast.error(`Failed to join table: ${error.message}`)
    },
  })

  const leaveTable = useMutation({
    mutationKey: ['poker', 'leaveTable', { cluster, account }],
    mutationFn: async () => {
      if (!publicKey || !playerStateAddress) throw new Error('Wallet not connected')

      return program.methods
        .leaveTable()
        .accounts({
          table: account,
          playerState: playerStateAddress,
        })
        .rpc()
    },
    onSuccess: async (tx) => {
      transactionToast(tx)
      await tableQuery.refetch()
      await playerStateQuery.refetch()
      await tables.refetch()
    },
    onError: (error) => {
      toast.error(`Failed to leave table: ${error.message}`)
    },
  })

  const startHand = useMutation({
    mutationKey: ['poker', 'startHand', { cluster, account }],
    mutationFn: async () => {
      return program.methods
        .startHand()
        .accounts({
          table: account,
        })
        .rpc()
    },
    onSuccess: async (tx) => {
      transactionToast(tx)
      await tableQuery.refetch()
    },
    onError: (error) => {
      toast.error(`Failed to start hand: ${error.message}`)
    },
  })

  const postBlinds = useMutation({
    mutationKey: ['poker', 'postBlinds', { cluster, account }],
    mutationFn: async () => {
      if (!publicKey || !playerStateAddress) throw new Error('Wallet not connected')

      return program.methods
        .postBlinds()
        .accounts({
          table: account,
          playerState: playerStateAddress,
        })
        .rpc()
    },
    onSuccess: async (tx) => {
      transactionToast(tx)
      await tableQuery.refetch()
      await playerStateQuery.refetch()
    },
    onError: (error) => {
      toast.error(`Failed to post blinds: ${error.message}`)
    },
  })

  const playerAction = useMutation({
    mutationKey: ['poker', 'playerAction', { cluster, account }],
    mutationFn: async ({
      action,
      raiseAmount = 0,
    }: {
      action: { fold?: {} } | { check?: {} } | { call?: {} } | { raise?: {} }
      raiseAmount?: number
    }) => {
      if (!publicKey || !playerStateAddress) throw new Error('Wallet not connected')

      return program.methods
        .playerAction(action, new BN(raiseAmount))
        .accounts({
          table: account,
          playerState: playerStateAddress,
        })
        .rpc()
    },
    onSuccess: async (tx) => {
      transactionToast(tx)
      await tableQuery.refetch()
      await playerStateQuery.refetch()
    },
    onError: (error) => {
      toast.error(`Failed to perform action: ${error.message}`)
    },
  })

  const advanceStreet = useMutation({
    mutationKey: ['poker', 'advanceStreet', { cluster, account }],
    mutationFn: async () => {
      return program.methods
        .advanceStreet()
        .accounts({
          table: account,
        })
        .rpc()
    },
    onSuccess: async (tx) => {
      transactionToast(tx)
      await tableQuery.refetch()
    },
    onError: (error) => {
      toast.error(`Failed to advance street: ${error.message}`)
    },
  })

  const endHand = useMutation({
    mutationKey: ['poker', 'endHand', { cluster, account }],
    mutationFn: async ({ winnerPosition }: { winnerPosition: number }) => {
      // Find the winner's player state PDA
      const tableData = tableQuery.data
      if (!tableData) throw new Error('Table data not loaded')

      const winnerPubkey = tableData.players[winnerPosition]
      const [winnerStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('player'), account.toBuffer(), winnerPubkey.toBuffer()],
        program.programId
      )

      return program.methods
        .endHand(winnerPosition)
        .accounts({
          table: account,
          winnerState: winnerStatePda,
        })
        .rpc()
    },
    onSuccess: async (tx) => {
      transactionToast(tx)
      await tableQuery.refetch()
    },
    onError: (error) => {
      toast.error(`Failed to end hand: ${error.message}`)
    },
  })

  return {
    tableQuery,
    playerStateQuery,
    joinTable,
    leaveTable,
    startHand,
    postBlinds,
    playerAction,
    advanceStreet,
    endHand,
  }
}
