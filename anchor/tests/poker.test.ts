import {
  Blockhash,
  createSolanaClient,
  createTransaction,
  generateKeyPairSigner,
  Instruction,
  isSolanaError,
  KeyPairSigner,
  signTransactionMessageWithSigners,
} from 'gill'
import {
  fetchPoker,
  getCloseInstruction,
  getDecrementInstruction,
  getIncrementInstruction,
  getInitializeInstruction,
  getSetInstruction,
} from '../src'
// @ts-ignore error TS2307 suggest setting `moduleResolution` but this is already configured
import { loadKeypairSignerFromFile } from 'gill/node'

const { rpc, sendAndConfirmTransaction } = createSolanaClient({ urlOrMoniker: process.env.ANCHOR_PROVIDER_URL! })

describe('poker', () => {
  let payer: KeyPairSigner
  let poker: KeyPairSigner

  beforeAll(async () => {
    poker = await generateKeyPairSigner()
    payer = await loadKeypairSignerFromFile(process.env.ANCHOR_WALLET!)
  })

  it('Initialize Poker', async () => {
    // ARRANGE
    expect.assertions(1)
    const ix = getInitializeInstruction({ payer: payer, poker: poker })

    // ACT
    await sendAndConfirm({ ix, payer })

    // ASSER
    const currentPoker = await fetchPoker(rpc, poker.address)
    expect(currentPoker.data.count).toEqual(0)
  })

  it('Increment Poker', async () => {
    // ARRANGE
    expect.assertions(1)
    const ix = getIncrementInstruction({
      poker: poker.address,
    })

    // ACT
    await sendAndConfirm({ ix, payer })

    // ASSERT
    const currentCount = await fetchPoker(rpc, poker.address)
    expect(currentCount.data.count).toEqual(1)
  })

  it('Increment Poker Again', async () => {
    // ARRANGE
    expect.assertions(1)
    const ix = getIncrementInstruction({ poker: poker.address })

    // ACT
    await sendAndConfirm({ ix, payer })

    // ASSERT
    const currentCount = await fetchPoker(rpc, poker.address)
    expect(currentCount.data.count).toEqual(2)
  })

  it('Decrement Poker', async () => {
    // ARRANGE
    expect.assertions(1)
    const ix = getDecrementInstruction({
      poker: poker.address,
    })

    // ACT
    await sendAndConfirm({ ix, payer })

    // ASSERT
    const currentCount = await fetchPoker(rpc, poker.address)
    expect(currentCount.data.count).toEqual(1)
  })

  it('Set poker value', async () => {
    // ARRANGE
    expect.assertions(1)
    const ix = getSetInstruction({ poker: poker.address, value: 42 })

    // ACT
    await sendAndConfirm({ ix, payer })

    // ASSERT
    const currentCount = await fetchPoker(rpc, poker.address)
    expect(currentCount.data.count).toEqual(42)
  })

  it('Set close the poker account', async () => {
    // ARRANGE
    expect.assertions(1)
    const ix = getCloseInstruction({
      payer: payer,
      poker: poker.address,
    })

    // ACT
    await sendAndConfirm({ ix, payer })

    // ASSERT
    try {
      await fetchPoker(rpc, poker.address)
    } catch (e) {
      if (!isSolanaError(e)) {
        throw new Error(`Unexpected error: ${e}`)
      }
      expect(e.message).toEqual(`Account not found at address: ${poker.address}`)
    }
  })
})

// Helper function to keep the tests DRY
let latestBlockhash: Awaited<ReturnType<typeof getLatestBlockhash>> | undefined
async function getLatestBlockhash(): Promise<Readonly<{ blockhash: Blockhash; lastValidBlockHeight: bigint }>> {
  if (latestBlockhash) {
    return latestBlockhash
  }
  return await rpc
    .getLatestBlockhash()
    .send()
    .then(({ value }) => value)
}
async function sendAndConfirm({ ix, payer }: { ix: Instruction; payer: KeyPairSigner }) {
  const tx = createTransaction({
    feePayer: payer,
    instructions: [ix],
    version: 'legacy',
    latestBlockhash: await getLatestBlockhash(),
  })
  const signedTransaction = await signTransactionMessageWithSigners(tx)
  return await sendAndConfirmTransaction(signedTransaction)
}
