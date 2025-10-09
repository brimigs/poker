'use client'

import { PublicKey } from '@solana/web3.js'
import { useState, useEffect } from 'react'
import { ExplorerLink } from '../cluster/cluster-ui'
import { usePokerProgram, usePokerTable } from './poker-data-access'
import { ellipsify } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { useWallet } from '@solana/wallet-adapter-react'
import { ChipAmount, StakeBadge, CardSuitDecor, PokerTableVisual } from './poker-components'

export function PokerTableCreate() {
  const { initializeTable } = usePokerProgram()
  const [smallBlind, setSmallBlind] = useState(5)
  const [bigBlind, setBigBlind] = useState(10)
  const [minBuyIn, setMinBuyIn] = useState(500)
  const [maxBuyIn, setMaxBuyIn] = useState(5000)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Generate a new random table ID for each submission
    const tableId = Math.floor(Math.random() * 1000000)
    initializeTable.mutateAsync({ tableId, smallBlind, bigBlind, minBuyIn, maxBuyIn })
  }

  return (
    <Card className="relative overflow-hidden">
      <CardSuitDecor />
      <CardHeader>
        <CardTitle className="text-2xl text-center">Create New Poker Table</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="smallBlind">Small Blind</Label>
              <Input
                id="smallBlind"
                type="number"
                value={smallBlind}
                onChange={(e) => setSmallBlind(parseInt(e.target.value) || 0)}
                min={1}
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="bigBlind">Big Blind</Label>
              <Input
                id="bigBlind"
                type="number"
                value={bigBlind}
                onChange={(e) => setBigBlind(parseInt(e.target.value) || 0)}
                min={1}
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="minBuyIn">Min Buy-in</Label>
              <Input
                id="minBuyIn"
                type="number"
                value={minBuyIn}
                onChange={(e) => setMinBuyIn(parseInt(e.target.value) || 0)}
                min={1}
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="maxBuyIn">Max Buy-in</Label>
              <Input
                id="maxBuyIn"
                type="number"
                value={maxBuyIn}
                onChange={(e) => setMaxBuyIn(parseInt(e.target.value) || 0)}
                min={1}
                required
                className="mt-1.5"
              />
            </div>
          </div>

          <Button type="submit" disabled={initializeTable.isPending} size="lg" className="w-full">
            {initializeTable.isPending ? 'Creating Table...' : '🎲 Create Table'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export function PokerTableList() {
  const { tables, getProgramAccount } = usePokerProgram()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTables = tables.data?.filter((table) => {
    const tableIdString = table.account.tableId.toString()
    const addressString = table.publicKey.toString()
    return (
      tableIdString.includes(searchQuery) ||
      addressString.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  if (getProgramAccount.isLoading) {
    return <div className="text-center">Loading program...</div>
  }
  if (!getProgramAccount.data?.value) {
    return (
      <div className="alert alert-info flex justify-center">
        <span>Program account not found. Make sure you have deployed the program and are on the correct cluster.</span>
      </div>
    )
  }
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="border-b border-border pb-4">
          <h2 className="text-3xl font-bold mb-2">Join An Active Table</h2>
          <p className="text-muted-foreground">Browse and join existing poker tables</p>
        </div>

        <div className="relative">
          <Input
            type="text"
            placeholder="Search by table ID or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            🔍
          </div>
        </div>
      </div>

      {tables.isLoading ? (
        <div className="text-center">Loading tables...</div>
      ) : filteredTables && filteredTables.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredTables.map((table) => (
            <PokerTableCard key={table.publicKey.toString()} account={table.publicKey} />
          ))}
        </div>
      ) : tables.data?.length ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No tables match your search.</p>
        </div>
      ) : (
        <div className="text-center py-8">
          <h3 className="text-xl font-semibold mb-2">No Active Tables</h3>
          <p className="text-muted-foreground">Be the first to create a table!</p>
        </div>
      )}
    </div>
  )
}

function PokerTableCard({ account }: { account: PublicKey }) {
  const { tableQuery, playerStateQuery } = usePokerTable({ account })
  const { publicKey } = useWallet()

  const table = tableQuery.data
  const playerState = playerStateQuery.data

  // Determine stake level based on blinds
  const getStakeLevel = (smallBlind: number): 'micro' | 'low' | 'high' => {
    if (smallBlind <= 2) return 'micro'
    if (smallBlind <= 10) return 'low'
    return 'high'
  }

  const stakeLevel = table ? getStakeLevel(table.smallBlind.toNumber()) : 'low'

  if (tableQuery.isLoading) {
    return <div className="text-center">Loading table...</div>
  }

  if (!table) {
    return null
  }

  const gameStateLabels: Record<string, string> = {
    waitingForPlayers: 'Waiting for Players',
    preFlop: 'Pre-Flop',
    flop: 'Flop',
    turn: 'Turn',
    river: 'River',
    showdown: 'Showdown',
    handComplete: 'Hand Complete',
  }

  const gameStateKey = Object.keys(table.gameState)[0]
  const gameStateLabel = gameStateLabels[gameStateKey] || gameStateKey

  const isPlayerAtTable = playerState !== null

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              Table #{table.tableId.toString()}
            </CardTitle>
            <CardDescription className="mt-1">
              <ExplorerLink path={`account/${account}`} label={ellipsify(account.toString())} />
            </CardDescription>
          </div>
          <StakeBadge level={stakeLevel} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
          <span className="text-sm font-semibold">{gameStateLabel}</span>
          <span className="text-sm text-muted-foreground">{table.playerCount}/9 Players</span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">Blinds</div>
            <div className="font-semibold flex gap-1 items-center">
              <ChipAmount amount={table.smallBlind.toString()} color="blue" /> /
              <ChipAmount amount={table.bigBlind.toString()} color="red" />
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Current Pot</div>
            <div className="font-semibold">
              <ChipAmount amount={table.pot.toString()} color="gold" />
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Min Buy-in</div>
            <div className="font-semibold">
              <ChipAmount amount={table.minBuyIn.toString()} color="green" />
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Max Buy-in</div>
            <div className="font-semibold">
              <ChipAmount amount={table.maxBuyIn.toString()} color="gold" />
            </div>
          </div>
        </div>

        {isPlayerAtTable && playerState ? (
          <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg border-2 border-green-300 dark:border-green-700">
            <p className="font-semibold flex items-center gap-2">
              <span className="text-lg">✓</span> You're at this table
            </p>
            <p className="text-sm mt-1">
              Seat {playerState.position + 1} | Stack: <ChipAmount amount={playerState.stack.toString()} color="green" />
            </p>
          </div>
        ) : (
          <Button
            onClick={() => (window.location.href = `/poker/${account.toString()}`)}
            disabled={!publicKey}
            className="w-full"
            size="lg"
          >
            🎰 Join Table
          </Button>
        )}

        <Button
          variant="outline"
          onClick={() => (window.location.href = `/poker/${account.toString()}`)}
          className="w-full"
        >
          View Table
        </Button>
      </CardContent>
    </Card>
  )
}

export function PokerGameTable({ account }: { account: PublicKey }) {
  const { tableQuery, playerStateQuery, leaveTable, startHand, postBlinds, playerAction, advanceStreet, endHand, joinTable } =
    usePokerTable({
      account,
    })
  const { publicKey } = useWallet()
  const [raiseAmount, setRaiseAmount] = useState(0)
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [position, setPosition] = useState<number | null>(null)
  const [buyInAmount, setBuyInAmount] = useState(0)

  const table = tableQuery.data
  const playerState = playerStateQuery.data

  const defaultBuyIn = table ? Math.floor((table.minBuyIn.toNumber() + table.maxBuyIn.toNumber()) / 2) : 0

  // Update buyInAmount when table data loads
  useEffect(() => {
    if (table && buyInAmount === 0 && table.minBuyIn && table.maxBuyIn) {
      setBuyInAmount(defaultBuyIn)
    }
  }, [table, buyInAmount, defaultBuyIn])

  if (tableQuery.isLoading) {
    return <div className="text-center">Loading table...</div>
  }

  if (!table) {
    return <div className="text-center">Table not found</div>
  }

  const gameStateLabels: Record<string, string> = {
    waitingForPlayers: 'Waiting for Players',
    preFlop: 'Pre-Flop',
    flop: 'Flop',
    turn: 'Turn',
    river: 'River',
    showdown: 'Showdown',
    handComplete: 'Hand Complete',
  }

  const gameStateKey = Object.keys(table.gameState)[0]
  const gameStateLabel = gameStateLabels[gameStateKey] || gameStateKey

  const isMyTurn =
    publicKey &&
    playerState &&
    table.players[table.currentPlayerIndex] &&
    table.players[table.currentPlayerIndex].toString() === publicKey.toString()

  const canCheck = playerState && playerState.currentBet.eq(table.currentBet)

  const isPlayerAtTable = playerState !== null

  // Create seat data for visual selector
  const seats = Array.from({ length: 9 }, (_, i) => ({
    index: i,
    playerId: table.players[i]?.toString() || null,
    isEmpty: table.players[i]?.toString() === PublicKey.default.toString(),
  }))

  const handleJoin = () => {
    if (position === null) return
    joinTable.mutateAsync({ buyInAmount, position }).then(() => {
      setShowJoinForm(false)
      setPosition(null)
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Table #{table.tableId.toString()}</CardTitle>
          <CardDescription>
            <ExplorerLink path={`account/${account}`} label={ellipsify(account.toString())} />
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Game State</div>
              <div className="font-semibold">{gameStateLabel}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Pot</div>
              <div className="font-semibold">
                <ChipAmount amount={table.pot.toString()} color="gold" />
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Current Bet</div>
              <div className="font-semibold">
                <ChipAmount amount={table.currentBet.toString()} color="red" />
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Hand #</div>
              <div className="font-semibold">{table.handNumber.toString()}</div>
            </div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground mb-2">Players</div>
            <div className="grid grid-cols-3 gap-2">
              {table.players.map((player, idx) => {
                const isEmpty = player.toString() === PublicKey.default.toString()
                const isButton = idx === table.buttonPosition
                const isCurrent = idx === table.currentPlayerIndex
                // Only show button indicator when hand is in progress
                const showButton = isButton && gameStateKey !== 'waitingForPlayers' && gameStateKey !== 'handComplete'
                return (
                  <div
                    key={idx}
                    className={`p-2 rounded text-xs ${isEmpty ? 'bg-gray-100 dark:bg-gray-800' : 'bg-blue-100 dark:bg-blue-900'} ${isCurrent ? 'ring-2 ring-yellow-500' : ''}`}
                  >
                    <div className="font-semibold">
                      Seat {idx} {showButton && '(BTN)'}
                    </div>
                    {isEmpty ? (
                      <div className="text-gray-500">Empty</div>
                    ) : (
                      <div className="truncate">{ellipsify(player.toString())}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {playerState && (
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg border-2 border-green-300 dark:border-green-700">
              <div className="font-semibold mb-2">Your Stats</div>
              <div className="text-sm space-y-1">
                <div>Position: Seat {playerState.position + 1}</div>
                <div className="flex items-center gap-2">
                  Stack: <ChipAmount amount={playerState.stack.toString()} color="green" />
                </div>
                <div className="flex items-center gap-2">
                  Current Bet: <ChipAmount amount={playerState.currentBet.toString()} color="blue" />
                </div>
                <div>Status: <span className="font-semibold">{Object.keys(playerState.status)[0]}</span></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {!isPlayerAtTable && publicKey && (
        <Card>
          <CardHeader>
            <CardTitle>Join This Table</CardTitle>
            <CardDescription>Select your seat and buy-in amount to join the game</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showJoinForm ? (
              <Button onClick={() => setShowJoinForm(true)} className="w-full" size="lg">
                🎰 Join Table
              </Button>
            ) : (
              <>
                <div>
                  <Label className="text-sm font-semibold mb-3 block">Select Your Seat</Label>
                  <PokerTableVisual
                    seats={seats}
                    selectedSeat={position}
                    onSeatSelect={setPosition}
                    currentPlayerId={publicKey?.toString()}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`buyIn-${account}`}>Buy-in Amount</Label>
                  <Input
                    id={`buyIn-${account}`}
                    type="number"
                    value={buyInAmount}
                    onChange={(e) => setBuyInAmount(parseInt(e.target.value))}
                    min={table.minBuyIn.toNumber()}
                    max={table.maxBuyIn.toNumber()}
                  />
                  <div className="flex gap-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBuyInAmount(table.minBuyIn.toNumber())}
                    >
                      Min
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBuyInAmount(defaultBuyIn)}
                    >
                      Half
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBuyInAmount(table.maxBuyIn.toNumber())}
                    >
                      Max
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={handleJoin} disabled={joinTable.isPending || position === null} className="flex-1">
                    {joinTable.isPending ? 'Joining...' : position === null ? 'Select a Seat' : 'Join Table'}
                  </Button>
                  <Button variant="outline" onClick={() => { setShowJoinForm(false); setPosition(null); }}>
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {gameStateKey === 'waitingForPlayers' && (
            <div className="space-y-2">
              <Button onClick={() => startHand.mutateAsync()} disabled={startHand.isPending || table.playerCount < 2} className="w-full">
                {startHand.isPending ? 'Starting...' : 'Start Hand'}
              </Button>
              {table.playerCount < 2 && (
                <p className="text-sm text-muted-foreground text-center">
                  ⏳ Waiting for at least 2 players to start ({table.playerCount}/2)
                </p>
              )}
            </div>
          )}

          {gameStateKey === 'preFlop' && playerState && (
            <Button onClick={() => postBlinds.mutateAsync()} disabled={postBlinds.isPending}>
              {postBlinds.isPending ? 'Posting...' : 'Post Blinds'}
            </Button>
          )}

          {isMyTurn && gameStateKey !== 'waitingForPlayers' && gameStateKey !== 'handComplete' && (
            <div className="space-y-3">
              <div className="font-semibold text-yellow-600 dark:text-yellow-400">Your Turn!</div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="destructive"
                  onClick={() => playerAction.mutateAsync({ action: { fold: {} } })}
                  disabled={playerAction.isPending}
                >
                  Fold
                </Button>
                {canCheck && (
                  <Button
                    variant="outline"
                    onClick={() => playerAction.mutateAsync({ action: { check: {} } })}
                    disabled={playerAction.isPending}
                  >
                    Check
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => playerAction.mutateAsync({ action: { call: {} } })}
                  disabled={playerAction.isPending}
                >
                  Call
                </Button>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    placeholder="Raise amount"
                    value={raiseAmount}
                    onChange={(e) => setRaiseAmount(parseInt(e.target.value) || 0)}
                    className="w-32"
                  />
                  <Button
                    onClick={() => playerAction.mutateAsync({ action: { raise: {} }, raiseAmount })}
                    disabled={playerAction.isPending}
                  >
                    Raise
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="pt-3 border-t space-y-2">
            <Button
              variant="outline"
              onClick={() => advanceStreet.mutateAsync()}
              disabled={advanceStreet.isPending}
              size="sm"
            >
              Advance Street (Admin)
            </Button>
            <Button variant="outline" onClick={() => tableQuery.refetch()} size="sm">
              Refresh
            </Button>
            {playerState && (
              <Button
                variant="destructive"
                onClick={() => leaveTable.mutateAsync()}
                disabled={leaveTable.isPending}
                size="sm"
              >
                Leave Table
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
