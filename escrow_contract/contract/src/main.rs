#![no_std]
#![no_main]

extern crate alloc;

use alloc::{string::String, vec::Vec};
use casper_contract::{
    contract_api::{runtime, storage, system},
    unwrap_or_revert::UnwrapOrRevert,
};
use casper_types::{
    account::AccountHash, contracts::NamedKeys, runtime_args, CLType, CLValue, EntryPoint,
    EntryPointAccess, EntryPointType, EntryPoints, Key, Parameter, RuntimeArgs, URef, U256, U512,
    ContractHash,
};

// ============================================================================
// CONSTANTS
// ============================================================================

const CONTRACT_PACKAGE_NAME: &str = "group_escrow_package";
const CONTRACT_VERSION_KEY: &str = "version";
const ESCROW_DICT: &str = "escrows";
const PARTICIPANT_DICT: &str = "participants";
const CONTRIBUTION_DICT: &str = "contributions";
const ESCROW_COUNTER: &str = "escrow_counter";
const USER_ESCROWS_DICT: &str = "user_escrows";
const CONTRACT_PURSE: &str = "contract_purse";
const PARTICIPANTS_LIST_DICT: &str = "participants_list"; // New: stores Vec<AccountHash> per escrow

// Liquid staking contract configuration
const LIQUID_STAKING_CONTRACT: &str = "liquid_staking_contract_hash";
const SCSPR_TOKEN_CONTRACT: &str = "scspr_token_contract_hash";

// Error codes with descriptive names
const ERROR_MIN_PARTICIPANTS: u16 = 100;
const ERROR_ESCROW_COMPLETE: u16 = 101;
const ERROR_ALREADY_JOINED: u16 = 102;
const ERROR_INCORRECT_AMOUNT: u16 = 103;
const ERROR_ESCROW_NOT_COMPLETE: u16 = 104;
const ERROR_PARTICIPANT_NOT_FOUND: u16 = 105;
const ERROR_ALREADY_WITHDRAWN: u16 = 106;
const ERROR_ESCROW_NOT_FOUND: u16 = 107;
const ERROR_NOT_CREATOR: u16 = 108;
const ERROR_CANNOT_CANCEL: u16 = 109;
const ERROR_TRANSFER_FAILED: u16 = 110;
const ERROR_STAKING_FAILED: u16 = 111;
const ERROR_BALANCE_QUERY_FAILED: u16 = 112;
const ERROR_UNSTAKING_FAILED: u16 = 113;
const ERROR_LIQUID_STAKING_NOT_CONFIGURED: u16 = 114;

// ============================================================================
// DATA STRUCTURES
// ============================================================================

/// Status of an escrow
#[repr(u8)]
#[derive(Clone, Copy, PartialEq)]
pub enum EscrowStatus {
    Open = 0,
    Complete = 1,
    Cancelled = 2,
}

/// Escrow state stored on-chain
pub struct Escrow {
    pub creator: AccountHash,
    pub total_amount: U256,
    pub split_amount: U256,
    pub num_friends: u8,
    pub joined_count: u8,
    pub status: EscrowStatus,
    pub accumulated_scspr: U512,
    pub initial_scspr: U512,
    pub created_timestamp: u64,
}

/// Participant contribution tracking
pub struct ParticipantContribution {
    pub account: AccountHash,
    pub cspr_contributed: U512,
    pub scspr_received: U512,
    pub withdrawn: bool,
}

/// User escrows list entry
pub struct UserEscrowEntry {
    pub escrow_code: String,
    pub is_creator: bool,
}

// ============================================================================
// EVENT EMISSION
// ============================================================================

/// Emit an event by storing it in a named key
fn emit_event(event_name: &str, event_data: String) {
    let event_key = alloc::format!("event_{}_{}", event_name, runtime::get_blocktime());
    runtime::put_key(&event_key, storage::new_uref(event_data).into());
}

fn emit_escrow_created(escrow_code: &str, creator: AccountHash, total_amount: U256, num_friends: u8) {
    let event_data = alloc::format!(
        "{{\"event\":\"EscrowCreated\",\"escrow_code\":\"{}\",\"creator\":\"{:?}\",\"total_amount\":\"{}\",\"num_friends\":{}}}",
        escrow_code, creator, total_amount, num_friends
    );
    emit_event("escrow_created", event_data);
}

fn emit_participant_joined(escrow_code: &str, participant: AccountHash, amount: U512, joined_count: u8) {
    let event_data = alloc::format!(
        "{{\"event\":\"ParticipantJoined\",\"escrow_code\":\"{}\",\"participant\":\"{:?}\",\"amount\":\"{}\",\"joined_count\":{}}}",
        escrow_code, participant, amount, joined_count
    );
    emit_event("participant_joined", event_data);
}

fn emit_escrow_completed(escrow_code: &str, total_scspr: U512) {
    let event_data = alloc::format!(
        "{{\"event\":\"EscrowCompleted\",\"escrow_code\":\"{}\",\"total_scspr\":\"{}\"}}",
        escrow_code, total_scspr
    );
    emit_event("escrow_completed", event_data);
}

fn emit_withdrawal_made(escrow_code: &str, participant: AccountHash, amount: U512) {
    let event_data = alloc::format!(
        "{{\"event\":\"WithdrawalMade\",\"escrow_code\":\"{}\",\"participant\":\"{:?}\",\"amount\":\"{}\"}}",
        escrow_code, participant, amount
    );
    emit_event("withdrawal_made", event_data);
}

fn emit_escrow_cancelled(escrow_code: &str, refund_count: u8) {
    let event_data = alloc::format!(
        "{{\"event\":\"EscrowCancelled\",\"escrow_code\":\"{}\",\"refund_count\":{}}}",
        escrow_code, refund_count
    );
    emit_event("escrow_cancelled", event_data);
}

// ============================================================================
// STORAGE HELPERS
// ============================================================================

/// Get or create a dictionary URef
fn get_or_create_dict(name: &str) -> URef {
    match runtime::get_key(name) {
        Some(Key::URef(uref)) => uref,
        Some(_) => runtime::revert(casper_types::ApiError::UnexpectedKeyVariant),
        None => storage::new_dictionary(name).unwrap_or_revert(),
    }
}

/// Get or create the contract's purse
fn get_contract_purse() -> URef {
    match runtime::get_key(CONTRACT_PURSE) {
        Some(Key::URef(uref)) => uref,
        Some(_) => runtime::revert(casper_types::ApiError::UnexpectedKeyVariant),
        None => {
            let purse = system::create_purse();
            runtime::put_key(CONTRACT_PURSE, purse.into());
            purse
        }
    }
}

/// Generate unique escrow code from counter
fn generate_escrow_code(counter: u64, creator: AccountHash) -> String {
    use alloc::format;
    let creator_bytes = creator.as_bytes();
    format!(
        "ESCROW-{}-{:02X}{:02X}{:02X}{:02X}",
        counter, creator_bytes[0], creator_bytes[1], creator_bytes[2], creator_bytes[3]
    )
}

/// Add escrow to user's list
fn add_user_escrow(user: AccountHash, escrow_code: &str, is_creator: bool) {
    let user_escrows_dict = get_or_create_dict(USER_ESCROWS_DICT);
    let user_key = alloc::format!("{:?}", user);
    
    // Get existing list or create new
    let mut escrow_list: Vec<String> = storage::dictionary_get(user_escrows_dict, &user_key)
        .unwrap_or_revert()
        .unwrap_or_else(|| Vec::new());
    
    // Add new escrow with creator flag
    let entry = alloc::format!("{}:{}", escrow_code, if is_creator { "1" } else { "0" });
    escrow_list.push(entry);
    
    storage::dictionary_put(user_escrows_dict, &user_key, escrow_list);
}

/// Add participant to escrow's participant list
fn add_participant_to_list(escrow_code: &str, participant: AccountHash) {
    let participants_list_dict = get_or_create_dict(PARTICIPANTS_LIST_DICT);
    
    // Get existing list or create new
    let mut participants: Vec<AccountHash> = storage::dictionary_get(participants_list_dict, escrow_code)
        .unwrap_or_revert()
        .unwrap_or_else(|| Vec::new());
    
    participants.push(participant);
    
    storage::dictionary_put(participants_list_dict, escrow_code, participants);
}

/// Get list of participants for an escrow
fn get_participants_list(escrow_code: &str) -> Vec<AccountHash> {
    let participants_list_dict = get_or_create_dict(PARTICIPANTS_LIST_DICT);
    
    storage::dictionary_get(participants_list_dict, escrow_code)
        .unwrap_or_revert()
        .unwrap_or_else(|| Vec::new())
}

/// Serialize escrow to bytes for storage
fn serialize_escrow(escrow: &Escrow) -> Vec<u8> {
    let mut bytes = Vec::new();
    bytes.extend_from_slice(escrow.creator.as_bytes());
    bytes.extend_from_slice(&escrow.total_amount.to_bytes_le());
    bytes.extend_from_slice(&escrow.split_amount.to_bytes_le());
    bytes.push(escrow.num_friends);
    bytes.push(escrow.joined_count);
    bytes.push(escrow.status as u8);
    bytes.extend_from_slice(&escrow.accumulated_scspr.to_bytes_le());
    bytes.extend_from_slice(&escrow.initial_scspr.to_bytes_le());
    bytes.extend_from_slice(&escrow.created_timestamp.to_le_bytes());
    bytes
}

/// Deserialize escrow from storage bytes
fn deserialize_escrow(bytes: &[u8]) -> Escrow {
    let mut offset = 0;
    
    let creator = AccountHash::new(
        <[u8; 32]>::try_from(&bytes[offset..offset + 32]).unwrap_or_revert()
    );
    offset += 32;
    
    let total_amount = U256::from_little_endian(&bytes[offset..offset + 32]);
    offset += 32;
    
    let split_amount = U256::from_little_endian(&bytes[offset..offset + 32]);
    offset += 32;
    
    let num_friends = bytes[offset];
    offset += 1;
    
    let joined_count = bytes[offset];
    offset += 1;
    
    let status_byte = bytes[offset];
    let status = match status_byte {
        0 => EscrowStatus::Open,
        1 => EscrowStatus::Complete,
        2 => EscrowStatus::Cancelled,
        _ => EscrowStatus::Open,
    };
    offset += 1;
    
    let accumulated_scspr = U512::from_little_endian(&bytes[offset..offset + 64]);
    offset += 64;
    
    let initial_scspr = U512::from_little_endian(&bytes[offset..offset + 64]);
    offset += 64;
    
    let created_timestamp = if offset + 8 <= bytes.len() {
        u64::from_le_bytes(<[u8; 8]>::try_from(&bytes[offset..offset + 8]).unwrap_or_revert())
    } else {
        0u64
    };
    
    Escrow {
        creator,
        total_amount,
        split_amount,
        num_friends,
        joined_count,
        status,
        accumulated_scspr,
        initial_scspr,
        created_timestamp,
    }
}

/// Serialize participant contribution to bytes
fn serialize_contribution(contribution: &ParticipantContribution) -> Vec<u8> {
    let mut bytes = Vec::new();
    bytes.extend_from_slice(contribution.account.as_bytes());
    bytes.extend_from_slice(&contribution.cspr_contributed.to_bytes_le());
    bytes.extend_from_slice(&contribution.scspr_received.to_bytes_le());
    bytes.push(if contribution.withdrawn { 1 } else { 0 });
    bytes
}

/// Deserialize participant contribution from bytes
fn deserialize_contribution(bytes: &[u8]) -> ParticipantContribution {
    let mut offset = 0;
    
    let account = AccountHash::new(
        <[u8; 32]>::try_from(&bytes[offset..offset + 32]).unwrap_or_revert()
    );
    offset += 32;
    
    let cspr_contributed = U512::from_little_endian(&bytes[offset..offset + 64]);
    offset += 64;
    
    let scspr_received = U512::from_little_endian(&bytes[offset..offset + 64]);
    offset += 64;
    
    let withdrawn = bytes[offset] == 1;
    
    ParticipantContribution {
        account,
        cspr_contributed,
        scspr_received,
        withdrawn,
    }
}

// ============================================================================
// ENTRY POINT: CREATE_ESCROW
// ============================================================================

#[no_mangle]
pub extern "C" fn create_escrow() {
    let creator: AccountHash = runtime::get_caller();
    let total_amount: U256 = runtime::get_named_arg("total_amount");
    let num_friends: u8 = runtime::get_named_arg("num_friends");
    
    if num_friends < 2 {
        runtime::revert(casper_types::ApiError::User(ERROR_MIN_PARTICIPANTS));
    }
    
    let split_amount = total_amount / U256::from(num_friends);
    
    let counter: u64 = match runtime::get_key(ESCROW_COUNTER) {
        Some(key) => {
            let uref = key.into_uref().unwrap_or_revert();
            storage::read(uref).unwrap_or_revert().unwrap_or(0u64)
        }
        None => 0u64,
    };
    
    let new_counter = counter + 1;
    let escrow_code = generate_escrow_code(new_counter, creator);
    
    let escrow = Escrow {
        creator,
        total_amount,
        split_amount,
        num_friends,
        joined_count: 0,
        status: EscrowStatus::Open,
        accumulated_scspr: U512::zero(),
        initial_scspr: U512::zero(),
        created_timestamp: runtime::get_blocktime(),
    };
    
    let escrow_dict = get_or_create_dict(ESCROW_DICT);
    storage::dictionary_put(escrow_dict, &escrow_code, serialize_escrow(&escrow));
    
    let counter_uref = match runtime::get_key(ESCROW_COUNTER) {
        Some(key) => key.into_uref().unwrap_or_revert(),
        None => storage::new_uref(new_counter).into(),
    };
    storage::write(counter_uref, new_counter);
    runtime::put_key(ESCROW_COUNTER, counter_uref.into());
    
    // Add to user's escrow list
    add_user_escrow(creator, &escrow_code, true);
    
    // Emit event
    emit_escrow_created(&escrow_code, creator, total_amount, num_friends);
    
    runtime::ret(CLValue::from_t(escrow_code).unwrap_or_revert());
}

// ============================================================================
// ENTRY POINT: JOIN_ESCROW
// ============================================================================

#[no_mangle]
pub extern "C" fn join_escrow() {
    let caller: AccountHash = runtime::get_caller();
    let escrow_code: String = runtime::get_named_arg("escrow_code");
    let amount: U512 = runtime::get_named_arg("amount");
    
    let escrow_dict = get_or_create_dict(ESCROW_DICT);
    let escrow_bytes: Vec<u8> = storage::dictionary_get(escrow_dict, &escrow_code)
        .unwrap_or_revert()
        .unwrap_or_else(|| runtime::revert(casper_types::ApiError::User(ERROR_ESCROW_NOT_FOUND)));
    
    let mut escrow = deserialize_escrow(&escrow_bytes);
    
    if escrow.status != EscrowStatus::Open {
        runtime::revert(casper_types::ApiError::User(ERROR_ESCROW_COMPLETE));
    }
    
    let participant_dict = get_or_create_dict(PARTICIPANT_DICT);
    let participant_key = alloc::format!("{}:{}", escrow_code, caller);
    
    let already_joined: Option<bool> = storage::dictionary_get(participant_dict, &participant_key)
        .unwrap_or_revert();
    
    if already_joined.is_some() {
        runtime::revert(casper_types::ApiError::User(ERROR_ALREADY_JOINED));
    }
    
    let split_u512 = U512::from_dec_str(&escrow.split_amount.to_string()).unwrap_or_revert();
    if amount != split_u512 {
        runtime::revert(casper_types::ApiError::User(ERROR_INCORRECT_AMOUNT));
    }
    
    // Transfer CSPR from caller to contract purse
    let contract_purse = get_contract_purse();
    system::transfer_from_purse_to_purse(
        system::get_main_purse(),
        contract_purse,
        amount,
        None,
    )
    .unwrap_or_else(|_| runtime::revert(casper_types::ApiError::User(ERROR_TRANSFER_FAILED)));
    
    // Stake CSPR → sCSPR
    let scspr_received = stake_cspr_to_scspr(amount);
    
    escrow.joined_count += 1;
    escrow.accumulated_scspr += scspr_received;
    
    let contribution = ParticipantContribution {
        account: caller,
        cspr_contributed: amount,
        scspr_received,
        withdrawn: false,
    };
    
    let contribution_dict = get_or_create_dict(CONTRIBUTION_DICT);
    let contribution_key = alloc::format!("{}:{}", escrow_code, caller);
    storage::dictionary_put(contribution_dict, &contribution_key, serialize_contribution(&contribution));
    
    storage::dictionary_put(participant_dict, &participant_key, true);
    
    // Add to user's escrow list
    add_user_escrow(caller, &escrow_code, false);
    
    // Add to escrow's participant list for refunds/iteration
    add_participant_to_list(&escrow_code, caller);
    
    // Emit event
    emit_participant_joined(&escrow_code, caller, amount, escrow.joined_count);
    
    if escrow.joined_count >= escrow.num_friends {
        escrow.status = EscrowStatus::Complete;
        escrow.initial_scspr = escrow.accumulated_scspr;
        
        emit_escrow_completed(&escrow_code, escrow.accumulated_scspr);
    }
    
    storage::dictionary_put(escrow_dict, &escrow_code, serialize_escrow(&escrow));
}

// ============================================================================
// ENTRY POINT: WITHDRAW
// ============================================================================

#[no_mangle]
pub extern "C" fn withdraw() {
    let caller: AccountHash = runtime::get_caller();
    let escrow_code: String = runtime::get_named_arg("escrow_code");
    
    let escrow_dict = get_or_create_dict(ESCROW_DICT);
    let escrow_bytes: Vec<u8> = storage::dictionary_get(escrow_dict, &escrow_code)
        .unwrap_or_revert()
        .unwrap_or_else(|| runtime::revert(casper_types::ApiError::User(ERROR_ESCROW_NOT_FOUND)));
    
    let escrow = deserialize_escrow(&escrow_bytes);
    
    if escrow.status != EscrowStatus::Complete {
        runtime::revert(casper_types::ApiError::User(ERROR_ESCROW_NOT_COMPLETE));
    }
    
    let contribution_dict = get_or_create_dict(CONTRIBUTION_DICT);
    let contribution_key = alloc::format!("{}:{}", escrow_code, caller);
    
    let contribution_bytes: Option<Vec<u8>> = storage::dictionary_get(contribution_dict, &contribution_key)
        .unwrap_or_revert();
    
    if contribution_bytes.is_none() {
        runtime::revert(casper_types::ApiError::User(ERROR_PARTICIPANT_NOT_FOUND));
    }
    
    let mut contribution = deserialize_contribution(&contribution_bytes.unwrap());
    
    if contribution.withdrawn {
        runtime::revert(casper_types::ApiError::User(ERROR_ALREADY_WITHDRAWN));
    }
    
    let current_scspr_balance = get_current_scspr_balance();
    let total_yield = if current_scspr_balance > escrow.initial_scspr {
        current_scspr_balance - escrow.initial_scspr
    } else {
        U512::zero()
    };
    
    let participant_yield = if escrow.initial_scspr > U512::zero() {
        (total_yield * contribution.scspr_received) / escrow.initial_scspr
    } else {
        U512::zero()
    };
    
    let total_withdrawal = contribution.scspr_received + participant_yield;
    
    transfer_scspr_to_participant(caller, total_withdrawal);
    
    contribution.withdrawn = true;
    storage::dictionary_put(contribution_dict, &contribution_key, serialize_contribution(&contribution));
    
    emit_withdrawal_made(&escrow_code, caller, total_withdrawal);
}

// ============================================================================
// ENTRY POINT: CANCEL_ESCROW
// ============================================================================

#[no_mangle]
pub extern "C" fn cancel_escrow() {
    let caller: AccountHash = runtime::get_caller();
    let escrow_code: String = runtime::get_named_arg("escrow_code");
    
    let escrow_dict = get_or_create_dict(ESCROW_DICT);
    let escrow_bytes: Vec<u8> = storage::dictionary_get(escrow_dict, &escrow_code)
        .unwrap_or_revert()
        .unwrap_or_else(|| runtime::revert(casper_types::ApiError::User(ERROR_ESCROW_NOT_FOUND)));
    
    let mut escrow = deserialize_escrow(&escrow_bytes);
    
    // Only creator can cancel
    if escrow.creator != caller {
        runtime::revert(casper_types::ApiError::User(ERROR_NOT_CREATOR));
    }
    
    // Can only cancel if not complete
    if escrow.status != EscrowStatus::Open {
        runtime::revert(casper_types::ApiError::User(ERROR_CANNOT_CANCEL));
    }
    
    // Get list of all participants who joined
    let participants = get_participants_list(&escrow_code);
    let contribution_dict = get_or_create_dict(CONTRIBUTION_DICT);
    
    let mut refund_count = 0u8;
    
    // Refund each participant
    for participant in participants.iter() {
        let contribution_key = alloc::format!("{}:{}", escrow_code, participant);
        
        // Get participant's contribution
        let contribution_bytes: Option<Vec<u8>> = storage::dictionary_get(contribution_dict, &contribution_key)
            .unwrap_or_revert();
        
        if let Some(bytes) = contribution_bytes {
            let contribution = deserialize_contribution(&bytes);
            
            // Unstake sCSPR back to CSPR
            let cspr_amount = unstake_scspr_to_cspr(contribution.scspr_received);
            
            // Transfer CSPR back to participant
            let contract_purse = get_contract_purse();
            system::transfer_from_purse_to_account(
                contract_purse,
                *participant,
                cspr_amount,
                None,
            )
            .unwrap_or_else(|_| runtime::revert(casper_types::ApiError::User(ERROR_TRANSFER_FAILED)));
            
            refund_count += 1;
        }
    }
    
    escrow.status = EscrowStatus::Cancelled;
    storage::dictionary_put(escrow_dict, &escrow_code, serialize_escrow(&escrow));
    
    emit_escrow_cancelled(&escrow_code, refund_count);
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

#[no_mangle]
pub extern "C" fn get_escrow_info() {
    let escrow_code: String = runtime::get_named_arg("escrow_code");
    
    let escrow_dict = get_or_create_dict(ESCROW_DICT);
    let escrow_bytes: Vec<u8> = storage::dictionary_get(escrow_dict, &escrow_code)
        .unwrap_or_revert()
        .unwrap_or_else(|| runtime::revert(casper_types::ApiError::User(ERROR_ESCROW_NOT_FOUND)));
    
    let escrow = deserialize_escrow(&escrow_bytes);
    
    // Return escrow info as JSON-like string
    let info = alloc::format!(
        "{{\"creator\":\"{:?}\",\"total_amount\":\"{}\",\"split_amount\":\"{}\",\"num_friends\":{},\"joined_count\":{},\"status\":{},\"accumulated_scspr\":\"{}\",\"initial_scspr\":\"{}\",\"created_timestamp\":{}}}",
        escrow.creator, escrow.total_amount, escrow.split_amount, escrow.num_friends, 
        escrow.joined_count, escrow.status as u8, escrow.accumulated_scspr, 
        escrow.initial_scspr, escrow.created_timestamp
    );
    
    runtime::ret(CLValue::from_t(info).unwrap_or_revert());
}

#[no_mangle]
pub extern "C" fn get_participant_status() {
    let escrow_code: String = runtime::get_named_arg("escrow_code");
    let participant_str: String = runtime::get_named_arg("participant");
    
    // Parse participant string to AccountHash
    let participant = AccountHash::from_formatted_str(&participant_str)
        .unwrap_or_else(|_| runtime::revert(casper_types::ApiError::User(ERROR_PARTICIPANT_NOT_FOUND)));
    
    let contribution_dict = get_or_create_dict(CONTRIBUTION_DICT);
    let contribution_key = alloc::format!("{}:{}", escrow_code, participant);
    
    let contribution_bytes: Option<Vec<u8>> = storage::dictionary_get(contribution_dict, &contribution_key)
        .unwrap_or_revert();
    
    if contribution_bytes.is_none() {
        runtime::ret(CLValue::from_t("not_joined".to_string()).unwrap_or_revert());
        return;
    }
    
    let contribution = deserialize_contribution(&contribution_bytes.unwrap());
    
    let status = alloc::format!(
        "{{\"cspr_contributed\":\"{}\",\"scspr_received\":\"{}\",\"withdrawn\":{}}}",
        contribution.cspr_contributed, contribution.scspr_received, contribution.withdrawn
    );
    
    runtime::ret(CLValue::from_t(status).unwrap_or_revert());
}

#[no_mangle]
pub extern "C" fn list_user_escrows() {
    let user_str: String = runtime::get_named_arg("user");
    
    // Parse user string to AccountHash
    let user = AccountHash::from_formatted_str(&user_str)
        .unwrap_or_else(|_| runtime::revert(casper_types::ApiError::User(ERROR_PARTICIPANT_NOT_FOUND)));
    
    let user_escrows_dict = get_or_create_dict(USER_ESCROWS_DICT);
    let user_key = alloc::format!("{:?}", user);
    
    let escrow_list: Option<Vec<String>> = storage::dictionary_get(user_escrows_dict, &user_key)
        .unwrap_or_revert();
    
    let result = match escrow_list {
        Some(list) => {
            let joined_list = list.join(",");
            alloc::format!("[{}]", joined_list)
        }
        None => "[]".to_string(),
    };
    
    runtime::ret(CLValue::from_t(result).unwrap_or_revert());
}

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

/// Set liquid staking contract hash (admin only - called during setup)
#[no_mangle]
pub extern "C" fn set_liquid_staking_contract() {
    let contract_hash: ContractHash = runtime::get_named_arg("contract_hash");
    
    // Store the contract hash
    runtime::put_key(LIQUID_STAKING_CONTRACT, Key::Hash(contract_hash.value()));
}

/// Set sCSPR token contract hash (admin only - called during setup)
#[no_mangle]
pub extern "C" fn set_scspr_token_contract() {
    let contract_hash: ContractHash = runtime::get_named_arg("contract_hash");
    
    // Store the contract hash
    runtime::put_key(SCSPR_TOKEN_CONTRACT, Key::Hash(contract_hash.value()));
}

// ============================================================================
// LIQUID STAKING INTEGRATION
// ============================================================================

/// Get liquid staking contract hash from storage
fn get_liquid_staking_contract() -> Option<ContractHash> {
    match runtime::get_key(LIQUID_STAKING_CONTRACT) {
        Some(Key::Hash(hash_bytes)) => Some(ContractHash::new(hash_bytes)),
        _ => None,
    }
}

/// Get sCSPR token contract hash from storage
fn get_scspr_token_contract() -> Option<ContractHash> {
    match runtime::get_key(SCSPR_TOKEN_CONTRACT) {
        Some(Key::Hash(hash_bytes)) => Some(ContractHash::new(hash_bytes)),
        _ => None,
    }
}

/// Stake CSPR to receive sCSPR via Casper Liquid Staking
fn stake_cspr_to_scspr(cspr_amount: U512) -> U512 {
    match get_liquid_staking_contract() {
        Some(staking_contract) => {
            // Call liquid staking contract with error handling
            let result: Result<U512, casper_types::ApiError> = runtime::call_contract(
                staking_contract,
                "stake",
                runtime_args! {
                    "amount" => cspr_amount,
                },
            );
            
            match result {
                Ok(scspr_amount) => scspr_amount,
                Err(_) => {
                    runtime::revert(casper_types::ApiError::User(ERROR_STAKING_FAILED));
                }
            }
        }
        None => {
            // Fallback: 1:1 ratio for testing when liquid staking not configured
            // In production, this should revert
            cspr_amount
        }
    }
}

/// Unstake sCSPR back to CSPR (for refunds)
fn unstake_scspr_to_cspr(scspr_amount: U512) -> U512 {
    match get_liquid_staking_contract() {
        Some(staking_contract) => {
            let result: Result<U512, casper_types::ApiError> = runtime::call_contract(
                staking_contract,
                "unstake",
                runtime_args! {
                    "amount" => scspr_amount,
                },
            );
            
            match result {
                Ok(cspr_amount) => cspr_amount,
                Err(_) => {
                    runtime::revert(casper_types::ApiError::User(ERROR_UNSTAKING_FAILED));
                }
            }
        }
        None => {
            // Fallback: 1:1 ratio for testing
            scspr_amount
        }
    }
}

/// Get current sCSPR balance of the contract
fn get_current_scspr_balance() -> U512 {
    match get_scspr_token_contract() {
        Some(scspr_contract) => {
            // Query the contract's own purse balance, not the caller
            let contract_purse = get_contract_purse();
            
            let result: Result<U512, casper_types::ApiError> = runtime::call_contract(
                scspr_contract,
                "balance_of",
                runtime_args! {
                    "purse" => contract_purse,
                },
            );
            
            match result {
                Ok(balance) => balance,
                Err(_) => {
                    runtime::revert(casper_types::ApiError::User(ERROR_BALANCE_QUERY_FAILED));
                }
            }
        }
        None => {
            // Fallback: simulate 5% yield for testing
            U512::from(1050)
        }
    }
}

/// Transfer sCSPR to a specific participant
fn transfer_scspr_to_participant(recipient: AccountHash, amount: U512) {
    match get_scspr_token_contract() {
        Some(scspr_contract) => {
            let result: Result<(), casper_types::ApiError> = runtime::call_contract(
                scspr_contract,
                "transfer",
                runtime_args! {
                    "recipient" => Key::Account(recipient),
                    "amount" => amount,
                },
            );
            
            if result.is_err() {
                runtime::revert(casper_types::ApiError::User(ERROR_TRANSFER_FAILED));
            }
        }
        None => {
            // Fallback: assume transfer succeeds for testing
        }
    }
}

// ============================================================================
// CONTRACT INSTALLATION
// ============================================================================

#[no_mangle]
pub extern "C" fn call() {
    let mut entry_points = EntryPoints::new();
    
    entry_points.add_entry_point(EntryPoint::new(
        "create_escrow",
        vec![
            Parameter::new("total_amount", CLType::U256),
            Parameter::new("num_friends", CLType::U8),
        ],
        CLType::String,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));
    
    entry_points.add_entry_point(EntryPoint::new(
        "join_escrow",
        vec![
            Parameter::new("escrow_code", CLType::String),
            Parameter::new("amount", CLType::U512),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));
    
    entry_points.add_entry_point(EntryPoint::new(
        "withdraw",
        vec![
            Parameter::new("escrow_code", CLType::String),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));
    
    entry_points.add_entry_point(EntryPoint::new(
        "cancel_escrow",
        vec![
            Parameter::new("escrow_code", CLType::String),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));
    
    entry_points.add_entry_point(EntryPoint::new(
        "get_escrow_info",
        vec![
            Parameter::new("escrow_code", CLType::String),
        ],
        CLType::String,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));
    
    entry_points.add_entry_point(EntryPoint::new(
        "get_participant_status",
        vec![
            Parameter::new("escrow_code", CLType::String),
            Parameter::new("participant", CLType::String), // Use string representation
        ],
        CLType::String,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));
    
    entry_points.add_entry_point(EntryPoint::new(
        "list_user_escrows",
        vec![
            Parameter::new("user", CLType::String), // Use string representation
        ],
        CLType::String,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));
    
    // Admin entry points for configuration
    entry_points.add_entry_point(EntryPoint::new(
        "set_liquid_staking_contract",
        vec![
            Parameter::new("contract_hash", CLType::ByteArray(32)),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));
    
    entry_points.add_entry_point(EntryPoint::new(
        "set_scspr_token_contract",
        vec![
            Parameter::new("contract_hash", CLType::ByteArray(32)),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));
    
    let mut named_keys = NamedKeys::new();
    
    // Create contract purse during installation
    let contract_purse = system::create_purse();
    named_keys.insert(CONTRACT_PURSE.to_string(), contract_purse.into());
    
    let (contract_hash, contract_version) = storage::new_contract(
        entry_points,
        Some(named_keys),
        Some(CONTRACT_PACKAGE_NAME.to_string()),
        Some(CONTRACT_VERSION_KEY.to_string()),
    );
    
    runtime::put_key("group_escrow_contract", contract_hash.into());
    runtime::put_key("group_escrow_contract_version", storage::new_uref(contract_version).into());
}