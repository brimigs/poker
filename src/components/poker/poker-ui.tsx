'use client'

import { PublicKey } from '@solana/web3.js'
import { useState } from 'react'
import { ExplorerLink } from '../cluster/cluster-ui'
import { usePokerProgram, usePokerTable } from './poker-data-access'
import { ellipsify } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { useWallet } from '@solana/wallet-adapter-react'

export function PokerTableCreate() {
  const { initializeTable } = usePokerProgram()
  const [tableId, setTableId] = useState(Math.floor(Math.random() * 1000000))
  const [smallBlind, setSmallBlind] = useState(10)
  const [bigBlind, setBigBlind] = useState(20)
  const [minBuyIn, setMinBuyIn] = useState(1000)
  const [maxBuyIn, setMaxBuyIn] = useState(10000)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    initializeTable.mutateAsync({ tableId, smallBlind, bigBlind, minBuyIn, maxBuyIn })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Poker Table</CardTitle>
        <CardDescription>Set up a new poker table with your preferred settings</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tableId">Table ID</Label>
              <Input
                id="tableId"
                type="number"
                value={tableId}
                onChange={(e) => setTableId(parseInt(e.target.value))}
                required
              />
            </div>
            <div>
              <Label htmlFor="smallBlind">Small Blind</Label>
              <Input
                id="smallBlind"
                type="number"
                value={smallBlind}
                onChange={(e) => setSmallBlind(parseInt(e.target.value))}
                required
              />
            </div>
            <div>
              <Label htmlFor="bigBlind">Big Blind</Label>
              <Input
                id="bigBlind"
                type="number"
                value={bigBlind}
                onChange={(e) => setBigBlind(parseInt(e.target.value))}
                required
              />
            </div>
            <div>
              <Label htmlFor="minBuyIn">Min Buy-in</Label>
              <Input
                id="minBuyIn"
                type="number"
                value={minBuyIn}
                onChange={(e) => setMinBuyIn(parseInt(e.target.value))}
                required
              />
            </div>
            <div>
              <Label htmlFor="maxBuyIn">Max Buy-in</Label>
              <Input
                id="maxBuyIn"
                type="number"
                value={maxBuyIn}
                onChange={(e) => setMaxBuyIn(parseInt(e.target.value))}
                required
              />
            </div>
          </div>
          <Button type="submit" disabled={initializeTable.isPending}>
            {initializeTable.isPending ? 'Creating...' : 'Create Table'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export function PokerTableList() {
  const { tables, getProgramAccount } = usePokerProgram()

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
      {tables.isLoading ? (
        <div className="text-center">Loading tables...</div>
      ) : tables.data?.length ? (
        <div className="grid md:grid-cols-2 gap-4">
          {tables.data.map((table) => (
            <PokerTableCard key={table.publicKey.toString()} account={table.publicKey} />
          ))}
        </div>
      ) : (
        <div className="text-center">
          <h2 className="text-2xl">No tables</h2>
          <p>No tables found. Create one above to get started.</p>
        </div>
      )}
    </div>
  )
}

function PokerTableCard({ account }: { account: PublicKey }) {
  const { tableQuery, playerStateQuery, joinTable } = usePokerTable({ account })
  const { publicKey } = useWallet()
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [buyInAmount, setBuyInAmount] = useState(1000)
  const [position, setPosition] = useState(0)

  const table = tableQuery.data
  const playerState = playerStateQuery.data

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

  const handleJoin = () => {
    joinTable.mutateAsync({ buyInAmount, position }).then(() => setShowJoinForm(false))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Table #{table.tableId.toString()} - {gameStateLabel}
        </CardTitle>
        <CardDescription>
          <ExplorerLink path={`account/${account}`} label={ellipsify(account.toString())} />
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Players: {table.playerCount}/9</div>
          <div>Pot: {table.pot.toString()}</div>
          <div>Small Blind: {table.smallBlind.toString()}</div>
          <div>Big Blind: {table.bigBlind.toString()}</div>
          <div>Min Buy-in: {table.minBuyIn.toString()}</div>
          <div>Max Buy-in: {table.maxBuyIn.toString()}</div>
        </div>

        {isPlayerAtTable ? (
          <div className="p-3 bg-green-100 dark:bg-green-900 rounded">
            <p className="font-semibold">You are at this table</p>
            <p className="text-sm">
              Position: {playerState.position} | Stack: {playerState.stack.toString()}
            </p>
          </div>
        ) : showJoinForm ? (
          <div className="space-y-3 p-3 border rounded">
            <div>
              <Label htmlFor={`buyIn-${account}`}>Buy-in Amount</Label>
              <Input
                id={`buyIn-${account}`}
                type="number"
                value={buyInAmount}
                onChange={(e) => setBuyInAmount(parseInt(e.target.value))}
                min={table.minBuyIn.toNumber()}
                max={table.maxBuyIn.toNumber()}
              />
            </div>
            <div>
              <Label htmlFor={`position-${account}`}>Seat Position (0-8)</Label>
              <Input
                id={`position-${account}`}
                type="number"
                value={position}
                onChange={(e) => setPosition(parseInt(e.target.value))}
                min={0}
                max={8}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleJoin} disabled={joinTable.isPending}>
                {joinTable.isPending ? 'Joining...' : 'Join'}
              </Button>
              <Button variant="outline" onClick={() => setShowJoinForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setShowJoinForm(true)} disabled={!publicKey}>
            Join Table
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
  const { tableQuery, playerStateQuery, leaveTable, startHand, postBlinds, playerAction, advanceStreet, endHand } =
    usePokerTable({
      account,
    })
  const { publicKey } = useWallet()
  const [raiseAmount, setRaiseAmount] = useState(0)

  const table = tableQuery.data
  const playerState = playerStateQuery.data

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
              <div className="font-semibold">{table.pot.toString()}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Current Bet</div>
              <div className="font-semibold">{table.currentBet.toString()}</div>
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
                return (
                  <div
                    key={idx}
                    className={`p-2 rounded text-xs ${isEmpty ? 'bg-gray-100 dark:bg-gray-800' : 'bg-blue-100 dark:bg-blue-900'} ${isCurrent ? 'ring-2 ring-yellow-500' : ''}`}
                  >
                    <div className="font-semibold">
                      Seat {idx} {isButton && '(BTN)'}
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
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded">
              <div className="font-semibold">Your Stats</div>
              <div className="text-sm space-y-1">
                <div>Position: {playerState.position}</div>
                <div>Stack: {playerState.stack.toString()}</div>
                <div>Current Bet: {playerState.currentBet.toString()}</div>
                <div>Status: {Object.keys(playerState.status)[0]}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {gameStateKey === 'waitingForPlayers' && (
            <Button onClick={() => startHand.mutateAsync()} disabled={startHand.isPending || table.playerCount < 2}>
              {startHand.isPending ? 'Starting...' : 'Start Hand'}
            </Button>
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
