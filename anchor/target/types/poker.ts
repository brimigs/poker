/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/poker.json`.
 */
export type Poker = {
  "address": "Ev6eGkLNZQjgXekHWY1UMb1qkTVUzWsX1ziqcixqsieV",
  "metadata": {
    "name": "poker",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "advanceStreet",
      "discriminator": [
        32,
        130,
        217,
        150,
        106,
        172,
        250,
        30
      ],
      "accounts": [
        {
          "name": "table",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "advanceStreetAuto",
      "discriminator": [
        225,
        118,
        69,
        186,
        174,
        191,
        105,
        148
      ],
      "accounts": [
        {
          "name": "table",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "checkAutoWin",
      "discriminator": [
        183,
        160,
        255,
        22,
        154,
        24,
        185,
        184
      ],
      "accounts": [
        {
          "name": "table",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "endHand",
      "discriminator": [
        252,
        75,
        51,
        58,
        72,
        237,
        183,
        58
      ],
      "accounts": [
        {
          "name": "table",
          "writable": true
        },
        {
          "name": "winnerState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "table"
              },
              {
                "kind": "account",
                "path": "winner_state.player",
                "account": "playerState"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "winnerPosition",
          "type": "u8"
        }
      ]
    },
    {
      "name": "initializeTable",
      "discriminator": [
        223,
        143,
        246,
        102,
        122,
        200,
        108,
        147
      ],
      "accounts": [
        {
          "name": "table",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  97,
                  98,
                  108,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "tableId"
              }
            ]
          }
        },
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "tableId",
          "type": "u64"
        },
        {
          "name": "smallBlind",
          "type": "u64"
        },
        {
          "name": "bigBlind",
          "type": "u64"
        },
        {
          "name": "minBuyIn",
          "type": "u64"
        },
        {
          "name": "maxBuyIn",
          "type": "u64"
        }
      ]
    },
    {
      "name": "joinTable",
      "discriminator": [
        14,
        117,
        84,
        51,
        95,
        146,
        171,
        70
      ],
      "accounts": [
        {
          "name": "table",
          "writable": true
        },
        {
          "name": "playerState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "table"
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "buyInAmount",
          "type": "u64"
        },
        {
          "name": "position",
          "type": "u8"
        }
      ]
    },
    {
      "name": "leaveTable",
      "discriminator": [
        163,
        153,
        94,
        194,
        19,
        106,
        113,
        32
      ],
      "accounts": [
        {
          "name": "table",
          "writable": true
        },
        {
          "name": "playerState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "table"
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "player",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "playerAction",
      "discriminator": [
        37,
        85,
        25,
        135,
        200,
        116,
        96,
        101
      ],
      "accounts": [
        {
          "name": "table",
          "writable": true
        },
        {
          "name": "playerState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "table"
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "player",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "action",
          "type": {
            "defined": {
              "name": "playerActionType"
            }
          }
        },
        {
          "name": "raiseAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "postBlinds",
      "discriminator": [
        61,
        32,
        219,
        77,
        94,
        8,
        6,
        152
      ],
      "accounts": [
        {
          "name": "table",
          "writable": true
        },
        {
          "name": "playerState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "table"
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "player",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "startHand",
      "discriminator": [
        50,
        173,
        164,
        52,
        65,
        42,
        197,
        135
      ],
      "accounts": [
        {
          "name": "table",
          "writable": true
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "playerState",
      "discriminator": [
        56,
        3,
        60,
        86,
        174,
        16,
        244,
        195
      ]
    },
    {
      "name": "pokerTable",
      "discriminator": [
        128,
        243,
        17,
        3,
        215,
        50,
        15,
        15
      ]
    }
  ],
  "events": [
    {
      "name": "handComplete",
      "discriminator": [
        192,
        45,
        57,
        14,
        165,
        90,
        229,
        178
      ]
    },
    {
      "name": "handStarted",
      "discriminator": [
        92,
        115,
        135,
        103,
        133,
        169,
        143,
        43
      ]
    },
    {
      "name": "playerActioned",
      "discriminator": [
        130,
        135,
        225,
        93,
        234,
        116,
        205,
        27
      ]
    },
    {
      "name": "playerJoined",
      "discriminator": [
        39,
        144,
        49,
        106,
        108,
        210,
        183,
        38
      ]
    },
    {
      "name": "tableCreated",
      "discriminator": [
        164,
        233,
        12,
        97,
        250,
        213,
        187,
        147
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "tableFull",
      "msg": "Table is full"
    },
    {
      "code": 6001,
      "name": "gameInProgress",
      "msg": "Game is already in progress"
    },
    {
      "code": 6002,
      "name": "invalidBuyIn",
      "msg": "Invalid buy-in amount"
    },
    {
      "code": 6003,
      "name": "invalidPosition",
      "msg": "Invalid position"
    },
    {
      "code": 6004,
      "name": "seatTaken",
      "msg": "Seat is already taken"
    },
    {
      "code": 6005,
      "name": "notAtTable",
      "msg": "Player is not at table"
    },
    {
      "code": 6006,
      "name": "cannotLeaveNow",
      "msg": "Cannot leave table during active hand"
    },
    {
      "code": 6007,
      "name": "notEnoughPlayers",
      "msg": "Not enough players to start"
    },
    {
      "code": 6008,
      "name": "wrongGameState",
      "msg": "Wrong game state"
    },
    {
      "code": 6009,
      "name": "notBlindPosition",
      "msg": "Not in blind position"
    },
    {
      "code": 6010,
      "name": "insufficientFunds",
      "msg": "Insufficient funds"
    },
    {
      "code": 6011,
      "name": "playerNotActive",
      "msg": "Player is not active"
    },
    {
      "code": 6012,
      "name": "notYourTurn",
      "msg": "Not your turn"
    },
    {
      "code": 6013,
      "name": "cannotCheck",
      "msg": "Cannot check - must call or raise"
    },
    {
      "code": 6014,
      "name": "raiseTooSmall",
      "msg": "Raise amount is too small"
    },
    {
      "code": 6015,
      "name": "invalidWinner",
      "msg": "Invalid winner"
    },
    {
      "code": 6016,
      "name": "noActivePlayersRemaining",
      "msg": "No active players remaining"
    },
    {
      "code": 6017,
      "name": "alreadyPostedBlind",
      "msg": "Player has already posted blind this hand"
    },
    {
      "code": 6018,
      "name": "bettingRoundNotComplete",
      "msg": "Betting round is not complete"
    }
  ],
  "types": [
    {
      "name": "gameState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "waitingForPlayers"
          },
          {
            "name": "preFlop"
          },
          {
            "name": "flop"
          },
          {
            "name": "turn"
          },
          {
            "name": "river"
          },
          {
            "name": "showdown"
          },
          {
            "name": "handComplete"
          }
        ]
      }
    },
    {
      "name": "handComplete",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "table",
            "type": "pubkey"
          },
          {
            "name": "winner",
            "type": "pubkey"
          },
          {
            "name": "pot",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "handStarted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "table",
            "type": "pubkey"
          },
          {
            "name": "handNumber",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "playerActionType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "fold"
          },
          {
            "name": "check"
          },
          {
            "name": "call"
          },
          {
            "name": "raise"
          }
        ]
      }
    },
    {
      "name": "playerActioned",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "action",
            "type": {
              "defined": {
                "name": "playerActionType"
              }
            }
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "playerJoined",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "table",
            "type": "pubkey"
          },
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "position",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "playerState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "table",
            "type": "pubkey"
          },
          {
            "name": "stack",
            "type": "u64"
          },
          {
            "name": "currentBet",
            "type": "u64"
          },
          {
            "name": "position",
            "type": "u8"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "playerStatus"
              }
            }
          },
          {
            "name": "holeCardsComputation",
            "type": "pubkey"
          },
          {
            "name": "hasActedThisStreet",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "playerStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "folded"
          },
          {
            "name": "allIn"
          }
        ]
      }
    },
    {
      "name": "pokerTable",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tableId",
            "type": "u64"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "playerCount",
            "type": "u8"
          },
          {
            "name": "players",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "buttonPosition",
            "type": "u8"
          },
          {
            "name": "currentPlayerIndex",
            "type": "u8"
          },
          {
            "name": "pot",
            "type": "u64"
          },
          {
            "name": "currentBet",
            "type": "u64"
          },
          {
            "name": "gameState",
            "type": {
              "defined": {
                "name": "gameState"
              }
            }
          },
          {
            "name": "smallBlind",
            "type": "u64"
          },
          {
            "name": "bigBlind",
            "type": "u64"
          },
          {
            "name": "minBuyIn",
            "type": "u64"
          },
          {
            "name": "maxBuyIn",
            "type": "u64"
          },
          {
            "name": "handNumber",
            "type": "u64"
          },
          {
            "name": "deckComputation",
            "type": "pubkey"
          },
          {
            "name": "communityCards",
            "type": {
              "array": [
                "u8",
                5
              ]
            }
          },
          {
            "name": "streetBetCount",
            "type": "u8"
          },
          {
            "name": "blindsPosted",
            "type": "u16"
          },
          {
            "name": "lastRaiseAmount",
            "type": "u64"
          },
          {
            "name": "lastAggressorIndex",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "tableCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tableId",
            "type": "u64"
          },
          {
            "name": "creator",
            "type": "pubkey"
          }
        ]
      }
    }
  ]
};
