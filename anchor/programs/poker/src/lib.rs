use anchor_lang::prelude::*;

declare_id!("Ev6eGkLNZQjgXekHWY1UMb1qkTVUzWsX1ziqcixqsieV");

pub const MAX_PLAYERS: usize = 9;
pub const SMALL_BLIND_DEFAULT: u64 = 10;
pub const BIG_BLIND_DEFAULT: u64 = 20;
pub const MIN_BUY_IN_DEFAULT: u64 = 1000;
pub const MAX_BUY_IN_DEFAULT: u64 = 10000;

// Helper function to find next active player using remaining_accounts
fn find_next_active_player<'info>(
    table_key: &Pubkey,
    table: &PokerTable,
    current_index: u8,
    player_state_accounts: &[AccountInfo<'info>],
) -> Result<u8> {
    let mut next = (current_index + 1) % MAX_PLAYERS as u8;
    let mut checked = 0;

    while checked < MAX_PLAYERS {
        // Skip empty seats
        if table.players[next as usize] == Pubkey::default() {
            next = (next + 1) % MAX_PLAYERS as u8;
            checked += 1;
            continue;
        }

        // Get player pubkey at this position
        let player_pubkey = table.players[next as usize];

        // Derive expected PDA for this player
        let (expected_pda, _) = Pubkey::find_program_address(
            &[b"player", table_key.as_ref(), player_pubkey.as_ref()],
            &crate::ID,
        );

        // Try to find this account in remaining_accounts
        for account_info in player_state_accounts {
            if account_info.key == &expected_pda {
                // Try to deserialize the player state
                let data = account_info.try_borrow_data()?;
                let player_state = PlayerState::try_deserialize(&mut &data[..])?;

                // Check if player can act (is active, not folded/all-in)
                if player_state.status == PlayerStatus::Active {
                    return Ok(next);
                }
                break;
            }
        }

        next = (next + 1) % MAX_PLAYERS as u8;
        checked += 1;
    }

    Err(PokerError::NoActivePlayersRemaining.into())
}

// Helper to check if betting round is complete
fn is_betting_round_complete<'info>(
    table: &PokerTable,
    player_state_accounts: &[AccountInfo<'info>],
) -> Result<bool> {
    let mut active_players = Vec::new();

    // Collect all active/all-in players from remaining_accounts
    for account_info in player_state_accounts {
        let data = account_info.try_borrow_data()?;
        let player_state = PlayerState::try_deserialize(&mut &data[..])?;

        match player_state.status {
            PlayerStatus::Active | PlayerStatus::AllIn => {
                active_players.push(player_state);
            }
            PlayerStatus::Folded => continue,
        }
    }

    if active_players.is_empty() {
        return Ok(true);
    }

    // Check all active players have acted
    for player_state in &active_players {
        if player_state.status == PlayerStatus::Active
            && !player_state.has_acted_this_street {
            return Ok(false);
        }
    }

    // Check all active players match current bet (or all-in)
    for player_state in &active_players {
        if player_state.status == PlayerStatus::Active
            && player_state.current_bet != table.current_bet {
            return Ok(false);
        }
    }

    Ok(true)
}

// Helper to reset player states for new street
fn reset_player_states_for_street<'info>(
    player_state_accounts: &[AccountInfo<'info>],
) -> Result<()> {
    for account_info in player_state_accounts {
        let mut data = account_info.try_borrow_mut_data()?;
        let mut player_state = PlayerState::try_deserialize(&mut &data[..])?;

        player_state.current_bet = 0;
        player_state.has_acted_this_street = false;
        // Don't change status (keep folded/all-in)

        player_state.try_serialize(&mut &mut data[8..])?;
    }
    Ok(())
}

// Helper to reset player states for new hand
fn reset_player_states_for_hand<'info>(
    player_state_accounts: &[AccountInfo<'info>],
) -> Result<()> {
    for account_info in player_state_accounts {
        let mut data = account_info.try_borrow_mut_data()?;
        let mut player_state = PlayerState::try_deserialize(&mut &data[..])?;

        player_state.current_bet = 0;
        player_state.has_acted_this_street = false;
        player_state.status = PlayerStatus::Active;

        player_state.try_serialize(&mut &mut data[8..])?;
    }
    Ok(())
}

#[program]
pub mod poker {
    use super::*;

    // Table Management 

    pub fn initialize_table(
        ctx: Context<InitializeTable>,
        table_id: u64,
        small_blind: u64,
        big_blind: u64,
        min_buy_in: u64,
        max_buy_in: u64,
    ) -> Result<()> {
        let table = &mut ctx.accounts.table;
        table.table_id = table_id;
        table.creator = ctx.accounts.creator.key();
        table.bump = ctx.bumps.table;
        table.player_count = 0;
        table.players = vec![Pubkey::default(); MAX_PLAYERS];
        table.button_position = 0;
        table.current_player_index = 0;
        table.pot = 0;
        table.current_bet = 0;
        table.game_state = GameState::WaitingForPlayers;
        table.small_blind = small_blind;
        table.big_blind = big_blind;
        table.min_buy_in = min_buy_in;
        table.max_buy_in = max_buy_in;
        table.hand_number = 0;
        table.deck_computation = Pubkey::default();
        table.community_cards = [0; 5];
        table.street_bet_count = 0;
        table.blinds_posted = 0;
        table.last_raise_amount = 0;
        table.last_aggressor_index = 0;

        msg!("Poker table {} initialized by {}", table_id, ctx.accounts.creator.key());
        Ok(())
    }

    pub fn join_table(
        ctx: Context<JoinTable>,
        buy_in_amount: u64,
        position: u8,
    ) -> Result<()> {
        let table = &mut ctx.accounts.table;

        require!(
            table.game_state == GameState::WaitingForPlayers,
            PokerError::GameInProgress
        );
        require!(
            table.player_count < MAX_PLAYERS as u8,
            PokerError::TableFull
        );
        require!(
            buy_in_amount >= table.min_buy_in && buy_in_amount <= table.max_buy_in,
            PokerError::InvalidBuyIn
        );
        require!(
            position < MAX_PLAYERS as u8,
            PokerError::InvalidPosition
        );
        require!(
            table.players[position as usize] == Pubkey::default(),
            PokerError::SeatTaken
        );

        let player_state = &mut ctx.accounts.player_state;
        player_state.player = ctx.accounts.player.key();
        player_state.table = table.key();
        player_state.stack = buy_in_amount;
        player_state.current_bet = 0;
        player_state.position = position;
        player_state.status = PlayerStatus::Active;
        player_state.hole_cards_computation = Pubkey::default();
        player_state.has_acted_this_street = false;

        table.players[position as usize] = ctx.accounts.player.key();
        table.player_count += 1;

        msg!("Player {} joined table at position {}", ctx.accounts.player.key(), position);
        Ok(())
    }

    pub fn leave_table(ctx: Context<LeaveTable>) -> Result<()> {
        let table = &mut ctx.accounts.table;
        let player_state = &ctx.accounts.player_state;

        require!(
            table.game_state == GameState::WaitingForPlayers
            || table.game_state == GameState::HandComplete,
            PokerError::CannotLeaveNow
        );

        let position = player_state.position as usize;
        require!(
            table.players[position] == ctx.accounts.player.key(),
            PokerError::NotAtTable
        );

        table.players[position] = Pubkey::default();
        table.player_count -= 1;

        msg!("Player {} left table", ctx.accounts.player.key());
        Ok(())
    }

    // Game Flow

    pub fn start_hand(ctx: Context<StartHand>) -> Result<()> {
        let table = &mut ctx.accounts.table;

        require!(
            table.player_count >= 2,
            PokerError::NotEnoughPlayers
        );
        require!(
            table.game_state == GameState::WaitingForPlayers
            || table.game_state == GameState::HandComplete,
            PokerError::GameInProgress
        );

        // Reset all player states for new hand if remaining_accounts provided
        if !ctx.remaining_accounts.is_empty() {
            reset_player_states_for_hand(ctx.remaining_accounts)?;
        }

        table.hand_number += 1;
        table.game_state = GameState::PreFlop;
        table.pot = 0;
        table.current_bet = table.big_blind;
        table.street_bet_count = 0;
        table.community_cards = [0; 5];
        table.blinds_posted = 0;
        table.last_raise_amount = 0;
        table.last_aggressor_index = 0;

        // Find next button position (skip empty seats)
        let mut next_button = (table.button_position + 1) % MAX_PLAYERS as u8;
        while table.players[next_button as usize] == Pubkey::default() {
            next_button = (next_button + 1) % MAX_PLAYERS as u8;
        }
        table.button_position = next_button;

        // First to act is after big blind (UTG)
        let mut utg = (table.button_position + 3) % MAX_PLAYERS as u8;
        while table.players[utg as usize] == Pubkey::default() {
            utg = (utg + 1) % MAX_PLAYERS as u8;
        }
        table.current_player_index = utg;

        emit!(HandStarted {
            table: table.key(),
            hand_number: table.hand_number,
        });

        msg!("Starting hand #{}", table.hand_number);
        Ok(())
    }

    pub fn post_blinds(ctx: Context<PostBlinds>) -> Result<()> {
        let table = &mut ctx.accounts.table;
        let player_state = &mut ctx.accounts.player_state;

        require!(
            table.game_state == GameState::PreFlop,
            PokerError::WrongGameState
        );

        let player_position = player_state.position;

        // Check if player already posted blind this hand using bitmask
        require!(
            (table.blinds_posted & (1u16 << player_position)) == 0,
            PokerError::AlreadyPostedBlind
        );

        let small_blind_pos = {
            let mut sb = (table.button_position + 1) % MAX_PLAYERS as u8;
            while table.players[sb as usize] == Pubkey::default() {
                sb = (sb + 1) % MAX_PLAYERS as u8;
            }
            sb
        };
        let big_blind_pos = {
            let mut bb = (small_blind_pos + 1) % MAX_PLAYERS as u8;
            while table.players[bb as usize] == Pubkey::default() {
                bb = (bb + 1) % MAX_PLAYERS as u8;
            }
            bb
        };

        let blind_amount = if player_position == small_blind_pos {
            table.small_blind
        } else if player_position == big_blind_pos {
            table.big_blind
        } else {
            return Err(PokerError::NotBlindPosition.into());
        };

        require!(
            player_state.stack >= blind_amount,
            PokerError::InsufficientFunds
        );

        player_state.stack -= blind_amount;
        player_state.current_bet = blind_amount;
        table.pot += blind_amount;

        // Mark player as having posted blind using bitmask
        table.blinds_posted |= 1u16 << player_position;

        // Mark player as having acted this street
        player_state.has_acted_this_street = true;

        msg!("Player posted {} blind", blind_amount);
        Ok(())
    }

    pub fn player_action(
        ctx: Context<PlayerAction>,
        action: PlayerActionType,
        raise_amount: u64,
    ) -> Result<()> {
        let table = &mut ctx.accounts.table;
        let player_state = &mut ctx.accounts.player_state;

        require!(
            player_state.status == PlayerStatus::Active,
            PokerError::PlayerNotActive
        );
        require!(
            table.players[table.current_player_index as usize] == ctx.accounts.player.key(),
            PokerError::NotYourTurn
        );

        match action {
            PlayerActionType::Fold => {
                player_state.status = PlayerStatus::Folded;
                msg!("Player folded");
            }
            PlayerActionType::Check => {
                require!(
                    player_state.current_bet == table.current_bet,
                    PokerError::CannotCheck
                );
                msg!("Player checked");
            }
            PlayerActionType::Call => {
                let call_amount = table.current_bet.saturating_sub(player_state.current_bet);
                let actual_call = call_amount.min(player_state.stack);

                player_state.stack -= actual_call;
                player_state.current_bet += actual_call;
                table.pot += actual_call;

                if player_state.stack == 0 {
                    player_state.status = PlayerStatus::AllIn;
                }

                msg!("Player called {}", actual_call);
            }
            PlayerActionType::Raise => {
                let total_bet = table.current_bet + raise_amount;
                let amount_to_add = total_bet.saturating_sub(player_state.current_bet);

                require!(
                    player_state.stack >= amount_to_add,
                    PokerError::InsufficientFunds
                );

                // Minimum raise validation: must be at least the big blind OR the last raise amount
                let min_raise = if table.last_raise_amount > 0 {
                    table.last_raise_amount
                } else {
                    table.big_blind
                };
                require!(
                    raise_amount >= min_raise,
                    PokerError::RaiseTooSmall
                );

                player_state.stack -= amount_to_add;
                player_state.current_bet = total_bet;
                table.current_bet = total_bet;
                table.pot += amount_to_add;
                table.street_bet_count += 1;

                // Track this raise for future min-raise validation
                table.last_raise_amount = raise_amount;
                table.last_aggressor_index = player_state.position;

                msg!("Player raised to {}", total_bet);
            }
        }

        player_state.has_acted_this_street = true;

        // Move to next active player using helper function
        // If remaining_accounts is empty, fall back to simple next-seat logic
        let next_player = if ctx.remaining_accounts.is_empty() {
            let mut next = (table.current_player_index + 1) % MAX_PLAYERS as u8;
            while table.players[next as usize] == Pubkey::default() {
                next = (next + 1) % MAX_PLAYERS as u8;
            }
            next
        } else {
            find_next_active_player(
                &table.key(),
                &table,
                table.current_player_index,
                ctx.remaining_accounts,
            )?
        };
        table.current_player_index = next_player;

        Ok(())
    }

    pub fn advance_street(ctx: Context<AdvanceStreet>) -> Result<()> {
        let table = &mut ctx.accounts.table;

        table.game_state = match table.game_state {
            GameState::PreFlop => GameState::Flop,
            GameState::Flop => GameState::Turn,
            GameState::Turn => GameState::River,
            GameState::River => GameState::Showdown,
            _ => return Err(PokerError::WrongGameState.into()),
        };

        // Reset betting for new street
        table.current_bet = 0;
        table.street_bet_count = 0;

        // First to act is after button
        let mut first_to_act = (table.button_position + 1) % MAX_PLAYERS as u8;
        while table.players[first_to_act as usize] == Pubkey::default() {
            first_to_act = (first_to_act + 1) % MAX_PLAYERS as u8;
        }
        table.current_player_index = first_to_act;

        msg!("Advanced to {:?}", table.game_state);
        Ok(())
    }

    pub fn advance_street_auto(ctx: Context<AdvanceStreetAuto>) -> Result<()> {
        let table = &mut ctx.accounts.table;

        // Validate betting round is complete using remaining_accounts
        require!(
            !ctx.remaining_accounts.is_empty(),
            PokerError::BettingRoundNotComplete
        );

        let round_complete = is_betting_round_complete(&table, ctx.remaining_accounts)?;
        require!(
            round_complete,
            PokerError::BettingRoundNotComplete
        );

        // Reset all player states for new street
        reset_player_states_for_street(ctx.remaining_accounts)?;

        // Advance to next street
        table.game_state = match table.game_state {
            GameState::PreFlop => GameState::Flop,
            GameState::Flop => GameState::Turn,
            GameState::Turn => GameState::River,
            GameState::River => GameState::Showdown,
            _ => return Err(PokerError::WrongGameState.into()),
        };

        // Reset betting for new street
        table.current_bet = 0;
        table.street_bet_count = 0;
        table.last_raise_amount = 0;

        // Find first active player to act after button
        let first_to_act = if ctx.remaining_accounts.is_empty() {
            let mut next = (table.button_position + 1) % MAX_PLAYERS as u8;
            while table.players[next as usize] == Pubkey::default() {
                next = (next + 1) % MAX_PLAYERS as u8;
            }
            next
        } else {
            find_next_active_player(
                &table.key(),
                &table,
                table.button_position,
                ctx.remaining_accounts,
            )?
        };
        table.current_player_index = first_to_act;

        msg!("Advanced to {:?} with validation", table.game_state);
        Ok(())
    }

    pub fn check_auto_win(ctx: Context<CheckAutoWin>) -> Result<()> {
        let table = &mut ctx.accounts.table;

        require!(
            !ctx.remaining_accounts.is_empty(),
            PokerError::NoActivePlayersRemaining
        );

        // Count active players (not folded, not all-in)
        let mut active_count = 0;
        let mut last_active_position = 0u8;

        for account_info in ctx.remaining_accounts {
            let data = account_info.try_borrow_data()?;
            let player_state = PlayerState::try_deserialize(&mut &data[..])?;

            if player_state.status == PlayerStatus::Active {
                active_count += 1;
                last_active_position = player_state.position;
            }
        }

        // If only one active player remains, they win automatically
        if active_count == 1 {
            // Find the winner's account in remaining_accounts
            for account_info in ctx.remaining_accounts {
                let mut data = account_info.try_borrow_mut_data()?;
                let mut player_state = PlayerState::try_deserialize(&mut &data[..])?;

                if player_state.position == last_active_position {
                    // Award pot to winner
                    player_state.stack += table.pot;
                    player_state.try_serialize(&mut &mut data[8..])?;

                    table.pot = 0;
                    table.game_state = GameState::HandComplete;

                    emit!(HandComplete {
                        table: table.key(),
                        winner: player_state.player,
                        pot: table.pot,
                    });

                    msg!("Auto-win: Player at position {} wins by default", last_active_position);
                    return Ok(());
                }
            }
        }

        // If multiple active players, do nothing (hand continues)
        msg!("No auto-win: {} active players remaining", active_count);
        Ok(())
    }

    pub fn end_hand(ctx: Context<EndHand>, winner_position: u8) -> Result<()> {
        let table = &mut ctx.accounts.table;
        let winner_state = &mut ctx.accounts.winner_state;

        require!(
            winner_position < MAX_PLAYERS as u8,
            PokerError::InvalidPosition
        );
        require!(
            table.players[winner_position as usize] == winner_state.player,
            PokerError::InvalidWinner
        );

        // Award pot to winner
        winner_state.stack += table.pot;
        table.pot = 0;
        table.game_state = GameState::HandComplete;

        msg!("Hand complete. Winner: position {}", winner_position);
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(table_id: u64)]
pub struct InitializeTable<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + PokerTable::INIT_SPACE,
        seeds = [b"table", table_id.to_le_bytes().as_ref()],
        bump
    )]
    pub table: Account<'info, PokerTable>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinTable<'info> {
    #[account(mut)]
    pub table: Account<'info, PokerTable>,
    #[account(
        init,
        payer = player,
        space = 8 + PlayerState::INIT_SPACE,
        seeds = [b"player", table.key().as_ref(), player.key().as_ref()],
        bump
    )]
    pub player_state: Account<'info, PlayerState>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LeaveTable<'info> {
    #[account(mut)]
    pub table: Account<'info, PokerTable>,
    #[account(
        mut,
        close = player,
        seeds = [b"player", table.key().as_ref(), player.key().as_ref()],
        bump
    )]
    pub player_state: Account<'info, PlayerState>,
    #[account(mut)]
    pub player: Signer<'info>,
}

#[derive(Accounts)]
pub struct StartHand<'info> {
    #[account(mut)]
    pub table: Account<'info, PokerTable>,
}

#[derive(Accounts)]
pub struct PostBlinds<'info> {
    #[account(mut)]
    pub table: Account<'info, PokerTable>,
    #[account(
        mut,
        seeds = [b"player", table.key().as_ref(), player.key().as_ref()],
        bump
    )]
    pub player_state: Account<'info, PlayerState>,
    pub player: Signer<'info>,
}

#[derive(Accounts)]
pub struct PlayerAction<'info> {
    #[account(mut)]
    pub table: Account<'info, PokerTable>,
    #[account(
        mut,
        seeds = [b"player", table.key().as_ref(), player.key().as_ref()],
        bump
    )]
    pub player_state: Account<'info, PlayerState>,
    pub player: Signer<'info>,
}

#[derive(Accounts)]
pub struct AdvanceStreet<'info> {
    #[account(mut)]
    pub table: Account<'info, PokerTable>,
}

#[derive(Accounts)]
pub struct AdvanceStreetAuto<'info> {
    #[account(mut)]
    pub table: Account<'info, PokerTable>,
}

#[derive(Accounts)]
pub struct CheckAutoWin<'info> {
    #[account(mut)]
    pub table: Account<'info, PokerTable>,
}

#[derive(Accounts)]
pub struct EndHand<'info> {
    #[account(mut)]
    pub table: Account<'info, PokerTable>,
    #[account(
        mut,
        seeds = [b"player", table.key().as_ref(), winner_state.player.as_ref()],
        bump
    )]
    pub winner_state: Account<'info, PlayerState>,
}

#[account]
#[derive(InitSpace)]
pub struct PokerTable {
    pub table_id: u64,
    pub creator: Pubkey,           // Who created the table (for reference only, no authority)
    pub bump: u8,                  // PDA bump seed
    pub player_count: u8,
    #[max_len(MAX_PLAYERS)]
    pub players: Vec<Pubkey>,      // Fixed-size array of player pubkeys (default = empty seat)
    pub button_position: u8,
    pub current_player_index: u8,
    pub pot: u64,
    pub current_bet: u64,
    pub game_state: GameState,
    pub small_blind: u64,
    pub big_blind: u64,
    pub min_buy_in: u64,
    pub max_buy_in: u64,
    pub hand_number: u64,
    pub deck_computation: Pubkey,  // TODO: Is this how we interact with the API??
    pub community_cards: [u8; 5],  // TODO: Again, is this how we interact with the API??
    pub street_bet_count: u8,      // Number of raises this street
    pub blinds_posted: u16,        // Bitmask: bit N = player at position N posted blind
    pub last_raise_amount: u64,    // Size of last raise for min-raise validation
    pub last_aggressor_index: u8,  // Position of last player who raised
}

#[account]
#[derive(InitSpace)]
pub struct PlayerState {
    pub player: Pubkey,
    pub table: Pubkey,
    pub stack: u64,                      // Current chip stack
    pub current_bet: u64,                // Amount bet in current round
    pub position: u8,                    // Seat position (0-8)
    pub status: PlayerStatus,
    pub hole_cards_computation: Pubkey,  // TODO: Is this how we interact with the API??
    pub has_acted_this_street: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum GameState {
    WaitingForPlayers,
    PreFlop,
    Flop,
    Turn,
    River,
    Showdown,
    HandComplete,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum PlayerStatus {
    Active,
    Folded,
    AllIn,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PlayerActionType {
    Fold,
    Check,
    Call,
    Raise,
}

#[event]
pub struct TableCreated {
    pub table_id: u64,
    pub creator: Pubkey,
}

#[event]
pub struct PlayerJoined {
    pub table: Pubkey,
    pub player: Pubkey,
    pub position: u8,
}

#[event]
pub struct HandStarted {
    pub table: Pubkey,
    pub hand_number: u64,
}

#[event]
pub struct PlayerActioned {
    pub player: Pubkey,
    pub action: PlayerActionType,
    pub amount: u64,
}

#[event]
pub struct HandComplete {
    pub table: Pubkey,
    pub winner: Pubkey,
    pub pot: u64,
}


#[error_code]
pub enum PokerError {
    #[msg("Table is full")]
    TableFull,
    #[msg("Game is already in progress")]
    GameInProgress,
    #[msg("Invalid buy-in amount")]
    InvalidBuyIn,
    #[msg("Invalid position")]
    InvalidPosition,
    #[msg("Seat is already taken")]
    SeatTaken,
    #[msg("Player is not at table")]
    NotAtTable,
    #[msg("Cannot leave table during active hand")]
    CannotLeaveNow,
    #[msg("Not enough players to start")]
    NotEnoughPlayers,
    #[msg("Wrong game state")]
    WrongGameState,
    #[msg("Not in blind position")]
    NotBlindPosition,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Player is not active")]
    PlayerNotActive,
    #[msg("Not your turn")]
    NotYourTurn,
    #[msg("Cannot check - must call or raise")]
    CannotCheck,
    #[msg("Raise amount is too small")]
    RaiseTooSmall,
    #[msg("Invalid winner")]
    InvalidWinner,
    #[msg("No active players remaining")]
    NoActivePlayersRemaining,
    #[msg("Player has already posted blind this hand")]
    AlreadyPostedBlind,
    #[msg("Betting round is not complete")]
    BettingRoundNotComplete,
}
