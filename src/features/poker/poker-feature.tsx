import { useSolana } from '@/components/solana/use-solana'
import { WalletDropdown } from '@/components/wallet-dropdown'
import { AppHero } from '@/components/app-hero'
import { PokerUiButtonInitialize } from './ui/poker-ui-button-initialize'
import { PokerUiList } from './ui/poker-ui-list'
import { PokerUiProgramExplorerLink } from './ui/poker-ui-program-explorer-link'
import { PokerUiProgramGuard } from './ui/poker-ui-program-guard'

export default function PokerFeature() {
  const { account } = useSolana()

  return (
    <PokerUiProgramGuard>
      <AppHero
        title="Poker"
        subtitle={
          account
            ? "Initialize a new poker onchain by clicking the button. Use the program's methods (increment, decrement, set, and close) to change the state of the account."
            : 'Select a wallet to run the program.'
        }
      >
        <p className="mb-6">
          <PokerUiProgramExplorerLink />
        </p>
        {account ? (
          <PokerUiButtonInitialize account={account} />
        ) : (
          <div style={{ display: 'inline-block' }}>
            <WalletDropdown />
          </div>
        )}
      </AppHero>
      {account ? <PokerUiList account={account} /> : null}
    </PokerUiProgramGuard>
  )
}
