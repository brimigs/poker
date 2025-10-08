import { PokerAccount } from '@project/anchor'
import { ellipsify, UiWalletAccount } from '@wallet-ui/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppExplorerLink } from '@/components/app-explorer-link'
import { PokerUiButtonClose } from './poker-ui-button-close'
import { PokerUiButtonDecrement } from './poker-ui-button-decrement'
import { PokerUiButtonIncrement } from './poker-ui-button-increment'
import { PokerUiButtonSet } from './poker-ui-button-set'

export function PokerUiCard({ account, poker }: { account: UiWalletAccount; poker: PokerAccount }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Poker: {poker.data.count}</CardTitle>
        <CardDescription>
          Account: <AppExplorerLink address={poker.address} label={ellipsify(poker.address)} />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 justify-evenly">
          <PokerUiButtonIncrement account={account} poker={poker} />
          <PokerUiButtonSet account={account} poker={poker} />
          <PokerUiButtonDecrement account={account} poker={poker} />
          <PokerUiButtonClose account={account} poker={poker} />
        </div>
      </CardContent>
    </Card>
  )
}
