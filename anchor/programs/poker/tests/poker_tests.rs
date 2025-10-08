use anchor_lang::{prelude::*, AnchorDeserialize, AnchorSerialize};
use anchor_litesvm::{LiteSVM, TransactionHelpers};
use solana_sdk::{
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_program,
};

// Import poker program types
use poker::{
    GameState, PlayerActionType, PlayerState, PlayerStatus, PokerTable,
    SMALL_BLIND_DEFAULT, BIG_BLIND_DEFAULT, MIN_BUY_IN_DEFAULT, MAX_BUY_IN_DEFAULT, ID as POKER_PROGRAM_ID,
};

const SOL: u64 = 1_000_000_000;

// HELPERS

/// Derive table PDA
fn derive_table_pda(table_id: u64) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"table", &table_id.to_le_bytes()],
        &POKER_PROGRAM_ID,
    )
}

/// Derive player state PDA
fn derive_player_pda(table: &Pubkey, player: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"player", table.as_ref(), player.as_ref()],
        &POKER_PROGRAM_ID,
    )
}

/// Build initialize_table instruction
fn build_initialize_table_ix(
    table: Pubkey,
    creator: &Keypair,
    table_id: u64,
    small_blind: u64,
    big_blind: u64,
    min_buy_in: u64,
    max_buy_in: u64,
) -> Instruction {
    #[derive(AnchorSerialize)]
    struct InitializeTableArgs {
        table_id: u64,
        small_blind: u64,
        big_blind: u64,
        min_buy_in: u64,
        max_buy_in: u64,
    }

    let discriminator = anchor_lang::solana_program::hash::hash(b"global:initialize_table")
        .to_bytes()[..8]
        .to_vec();

    let args = InitializeTableArgs {
        table_id,
        small_blind,
        big_blind,
        min_buy_in,
        max_buy_in,
    };

    let mut data = discriminator;
    args.serialize(&mut data).unwrap();

    Instruction {
        program_id: POKER_PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(table, false),
            AccountMeta::new(creator.pubkey(), true),
            AccountMeta::new_readonly(system_program::ID, false),
        ],
        data,
    }
}

/// Build join_table instruction
fn build_join_table_ix(
    table: Pubkey,
    player_state: Pubkey,
    player: &Keypair,
    buy_in_amount: u64,
    position: u8,
) -> Instruction {
    #[derive(AnchorSerialize)]
    struct JoinTableArgs {
        buy_in_amount: u64,
        position: u8,
    }

    let discriminator = anchor_lang::solana_program::hash::hash(b"global:join_table")
        .to_bytes()[..8]
        .to_vec();

    let args = JoinTableArgs {
        buy_in_amount,
        position,
    };

    let mut data = discriminator;
    args.serialize(&mut data).unwrap();

    Instruction {
        program_id: POKER_PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(table, false),
            AccountMeta::new(player_state, false),
            AccountMeta::new(player.pubkey(), true),
            AccountMeta::new_readonly(system_program::ID, false),
        ],
        data,
    }
}

/// Build start_hand instruction
fn build_start_hand_ix(table: Pubkey, _signer: &Keypair) -> Instruction {
    let discriminator = anchor_lang::solana_program::hash::hash(b"global:start_hand")
        .to_bytes()[..8]
        .to_vec();

    Instruction {
        program_id: POKER_PROGRAM_ID,
        accounts: vec![AccountMeta::new(table, false)],
        data: discriminator,
    }
}

/// Build player_action instruction
fn build_player_action_ix(
    table: Pubkey,
    player_state: Pubkey,
    player: &Keypair,
    action: PlayerActionType,
    raise_amount: u64,
) -> Instruction {
    #[derive(AnchorSerialize)]
    struct PlayerActionArgs {
        action: PlayerActionType,
        raise_amount: u64,
    }

    let discriminator = anchor_lang::solana_program::hash::hash(b"global:player_action")
        .to_bytes()[..8]
        .to_vec();

    let args = PlayerActionArgs {
        action,
        raise_amount,
    };

    let mut data = discriminator;
    args.serialize(&mut data).unwrap();

    Instruction {
        program_id: POKER_PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(table, false),
            AccountMeta::new(player_state, false),
            AccountMeta::new_readonly(player.pubkey(), true),
        ],
        data,
    }
}

// ========== TABLE MANAGEMENT TESTS ==========

#[test]
fn test_initialize_table() {
    let mut svm = LiteSVM::new();
    svm.add_program_from_file(
        POKER_PROGRAM_ID,
        "../../target/deploy/poker.so",
    ).unwrap();

    // Create funded creator
    let creator = Keypair::new();
    svm.airdrop(&creator.pubkey(), 10 * SOL).unwrap();

    // Derive table PDA
    let table_id = 1u64;
    let (table_pda, _bump) = derive_table_pda(table_id);

    // Build and send instruction
    let ix = build_initialize_table_ix(
        table_pda,
        &creator,
        table_id,
        SMALL_BLIND_DEFAULT,
        BIG_BLIND_DEFAULT,
        MIN_BUY_IN_DEFAULT,
        MAX_BUY_IN_DEFAULT,
    );

    let tx_result = svm.send_instruction(ix, &[&creator]).unwrap();
    tx_result.assert_success();

    // Verify table state
    let table_account = svm.get_account(&table_pda)
        .expect("Table account should exist after initialization");
    let table_data = &table_account.data[8..]; // Skip discriminator
    let table: PokerTable = AnchorDeserialize::deserialize(&mut &table_data[..]).unwrap();

    assert_eq!(table.table_id, table_id);
    assert_eq!(table.creator, creator.pubkey());
    assert_eq!(table.player_count, 0);
    assert_eq!(table.game_state, GameState::WaitingForPlayers);
    assert_eq!(table.small_blind, SMALL_BLIND_DEFAULT);
    assert_eq!(table.big_blind, BIG_BLIND_DEFAULT);
}

#[test]
fn test_join_table_success() {
    let mut svm = anchor_litesvm::LiteSVM::new();
    svm.add_program_from_file(
        POKER_PROGRAM_ID,
        "../../target/deploy/poker.so",
    ).unwrap();

    // Setup: Create table
    let creator = Keypair::new();
    svm.airdrop(&creator.pubkey(), 10 * SOL).unwrap();

    let table_id = 1u64;
    let (table_pda, _) = derive_table_pda(table_id);

    let init_ix = build_initialize_table_ix(
        table_pda,
        &creator,
        table_id,
        SMALL_BLIND_DEFAULT,
        BIG_BLIND_DEFAULT,
        MIN_BUY_IN_DEFAULT,
        MAX_BUY_IN_DEFAULT,
    );
    svm.send_instruction(init_ix, &[&creator]).unwrap();

    // Join table
    let player = Keypair::new();
    svm.airdrop(&player.pubkey(), 10 * SOL).unwrap();

    let (player_pda, _) = derive_player_pda(&table_pda, &player.pubkey());
    let buy_in = 5000u64;
    let position = 0u8;

    let join_ix = build_join_table_ix(table_pda, player_pda, &player, buy_in, position);
    let result = svm.send_instruction(join_ix, &[&player]).unwrap();
    result.assert_success();

    // Verify player state
    let player_account = svm.get_account(&player_pda)
        .expect("Player account should exist after joining");
    let player_data = &player_account.data[8..];
    let player_state: PlayerState = AnchorDeserialize::deserialize(&mut &player_data[..]).unwrap();

    assert_eq!(player_state.player, player.pubkey());
    assert_eq!(player_state.stack, buy_in);
    assert_eq!(player_state.position, position);
    assert_eq!(player_state.status, PlayerStatus::Active);

    // Verify table updated
    let table_account = svm.get_account(&table_pda).unwrap();
    let table_data = &table_account.data[8..];
    let table: PokerTable = AnchorDeserialize::deserialize(&mut &table_data[..]).unwrap();

    assert_eq!(table.player_count, 1);
    assert_eq!(table.players[position as usize], player.pubkey());
}

#[test]
fn test_start_hand_with_two_players() {
    let mut svm = LiteSVM::new();
    svm.add_program_from_file(
        POKER_PROGRAM_ID,
        "../../target/deploy/poker.so",
    ).unwrap();

    // Setup: Create table and add 2 players
    let creator = Keypair::new();
    svm.airdrop(&creator.pubkey(), 10 * SOL).unwrap();

    let table_id = 1u64;
    let (table_pda, _) = derive_table_pda(table_id);

    // Initialize table
    let init_ix = build_initialize_table_ix(
        table_pda,
        &creator,
        table_id,
        SMALL_BLIND_DEFAULT,
        BIG_BLIND_DEFAULT,
        MIN_BUY_IN_DEFAULT,
        MAX_BUY_IN_DEFAULT,
    );
    svm.send_instruction(init_ix, &[&creator]).unwrap();

    // Add two players
    let player1 = Keypair::new();
    let player2 = Keypair::new();
    svm.airdrop(&player1.pubkey(), 10 * SOL).unwrap();
    svm.airdrop(&player2.pubkey(), 10 * SOL).unwrap();

    let (player1_pda, _) = derive_player_pda(&table_pda, &player1.pubkey());
    let (player2_pda, _) = derive_player_pda(&table_pda, &player2.pubkey());

    let join1_ix = build_join_table_ix(table_pda, player1_pda, &player1, 5000, 0);
    let join2_ix = build_join_table_ix(table_pda, player2_pda, &player2, 5000, 1);
    svm.send_instruction(join1_ix, &[&player1]).unwrap();
    svm.send_instruction(join2_ix, &[&player2]).unwrap();

    // Start hand (pass creator as dummy signer for LiteSVM)
    let start_ix = build_start_hand_ix(table_pda, &creator);
    let result = svm.send_instruction(start_ix, &[&creator]).unwrap();
    result.assert_success();

    // Verify game state changed
    let table_account = svm.get_account(&table_pda).unwrap();
    let table_data = &table_account.data[8..];
    let table: PokerTable = AnchorDeserialize::deserialize(&mut &table_data[..]).unwrap();

    assert_eq!(table.game_state, GameState::PreFlop);
    assert_eq!(table.hand_number, 1);
    assert_eq!(table.current_bet, BIG_BLIND_DEFAULT);
}

#[test]
fn test_player_fold() {
    let mut svm = LiteSVM::new();
    svm.add_program_from_file(
        POKER_PROGRAM_ID,
        "../../target/deploy/poker.so",
    ).unwrap();

    // Setup table with 2 players and start hand
    let creator = Keypair::new();
    svm.airdrop(&creator.pubkey(), 10 * SOL).unwrap();

    let table_id = 1u64;
    let (table_pda, _) = derive_table_pda(table_id);

    let init_ix = build_initialize_table_ix(
        table_pda,
        &creator,
        table_id,
        SMALL_BLIND_DEFAULT,
        BIG_BLIND_DEFAULT,
        MIN_BUY_IN_DEFAULT,
        MAX_BUY_IN_DEFAULT,
    );
    svm.send_instruction(init_ix, &[&creator]).unwrap();

    let player1 = Keypair::new();
    let player2 = Keypair::new();
    svm.airdrop(&player1.pubkey(), 10 * SOL).unwrap();
    svm.airdrop(&player2.pubkey(), 10 * SOL).unwrap();

    let (player1_pda, _) = derive_player_pda(&table_pda, &player1.pubkey());
    let (player2_pda, _) = derive_player_pda(&table_pda, &player2.pubkey());

    let join1_ix = build_join_table_ix(table_pda, player1_pda, &player1, 5000, 0);
    let join2_ix = build_join_table_ix(table_pda, player2_pda, &player2, 5000, 1);
    svm.send_instruction(join1_ix, &[&player1]).unwrap();
    svm.send_instruction(join2_ix, &[&player2]).unwrap();

    let start_ix = build_start_hand_ix(table_pda, &creator);
    svm.send_instruction(start_ix, &[&creator]).unwrap();

    // Determine who acts first
    let table_account = svm.get_account(&table_pda).unwrap();
    let table_data = &table_account.data[8..];
    let table: PokerTable = AnchorDeserialize::deserialize(&mut &table_data[..]).unwrap();

    let current_player_pubkey = table.players[table.current_player_index as usize];
    let (acting_player, acting_player_pda) = if current_player_pubkey == player1.pubkey() {
        (&player1, player1_pda)
    } else {
        (&player2, player2_pda)
    };

    // Player folds
    let fold_ix = build_player_action_ix(
        table_pda,
        acting_player_pda,
        acting_player,
        PlayerActionType::Fold,
        0,
    );
    let result = svm.send_instruction(fold_ix, &[acting_player]).unwrap();
    result.assert_success();

    // Verify player status changed
    let player_account = svm.get_account(&acting_player_pda).unwrap();
    let player_data = &player_account.data[8..];
    let player_state: PlayerState = AnchorDeserialize::deserialize(&mut &player_data[..]).unwrap();

    assert_eq!(player_state.status, PlayerStatus::Folded);
}

// Helper function to display test results
#[allow(dead_code)]
fn print_test_summary() {
    println!("\n========== POKER TESTS SUMMARY ==========");
    println!("- Table Management Tests");
    println!("  - Initialize table");
    println!("  - Join table");
    println!("  - Player actions");
    println!(" - Game Flow Tests");
    println!("  - Start hand");
    println!("  - Player fold");
    println!("\nAll basic poker functionality verified!");
}
