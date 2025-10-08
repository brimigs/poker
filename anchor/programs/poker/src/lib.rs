use anchor_lang::prelude::*;

declare_id!("Enihiu6yscwrmgi3Ew3JFoPqTFqW7E1eJdE2hmBvMkkN");

pub const MAX_PLAYERS: usize = 9;
pub const SMALL_BLIND_DEFAULT: u64 = 10;
pub const BIG_BLIND_DEFAULT: u64 = 20;
pub const MIN_BUY_IN_DEFAULT: u64 = 1000;
pub const MAX_BUY_IN_DEFAULT: u64 = 10000;

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

        table.hand_number += 1;
        table.game_state = GameState::PreFlop;
        table.pot = 0;
        table.current_bet = table.big_blind;
        table.street_bet_count = 0;
        table.community_cards = [0; 5];

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
                require!(
                    raise_amount >= table.big_blind,
                    PokerError::RaiseTooSmall
                );

                player_state.stack -= amount_to_add;
                player_state.current_bet = total_bet;
                table.current_bet = total_bet;
                table.pot += amount_to_add;
                table.street_bet_count += 1;

                msg!("Player raised to {}", total_bet);
            }
        }

        player_state.has_acted_this_street = true;

        // Move to next active player
        let mut next_player = (table.current_player_index + 1) % MAX_PLAYERS as u8;
        while table.players[next_player as usize] == Pubkey::default() {
            next_player = (next_player + 1) % MAX_PLAYERS as u8;
        }
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
}
