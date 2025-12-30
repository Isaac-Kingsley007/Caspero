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
};

// ============================================================================
// CONSTANTS
// ============================================================================

const CONTRACT_PACKAGE_NAME: &str = "group_escrow_package";
const CONTRACT_VERSION_KEY: &str = "version";
const ESCROW_DICT: &str = "escrows";
const PARTICIPANT_DICT: &str = "participants";
const ESCROW_COUNTER: &str = "escrow_counter";

// Liquid staking contract hash (placeholder - replace with actual deployed contract)
const LIQUID_STAKING_CONTRACT: &str = "liquid_staking_contract_hash";

// ============================================================================
// DATA STRUCTURES
// ============================================================================

/// Status of an escrow
#[repr(u8)]
#[derive(Clone, Copy)]
pub enum EscrowStatus {
    Open = 0,
    Complete = 1,
}

/// Escrow state stored on-chain
/// Storage format: Dictionary keyed by escrow_code
pub struct Escrow {
    pub creator: AccountHash,
    pub total_amount: U256,
    pub split_amount: U256,
    pub num_friends: u8,
    pub joined_count: u8,
    pub status: EscrowStatus,
    pub accumulated_scspr: U512, // Total sCSPR locked in escrow
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

/// Generate unique escrow code from counter
fn generate_escrow_code(counter: u64, creator: AccountHash) -> String {
    use alloc::format;
    // Simple deterministic code: counter + first 8 bytes of creator hash
    let creator_bytes = creator.as_bytes();
    format!(
        "ESCROW-{}-{:02X}{:02X}{:02X}{:02X}",
        counter, creator_bytes[0], creator_bytes[1], creator_bytes[2], creator_bytes[3]
    )
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
    
    let status = if bytes[offset] == 0 {
        EscrowStatus::Open
    } else {
        EscrowStatus::Complete
    };
    offset += 1;
    
    let accumulated_scspr = U512::from_little_endian(&bytes[offset..]);
    
    Escrow {
        creator,
        total_amount,
        split_amount,
        num_friends,
        joined_count,
        status,
        accumulated_scspr,
    }
}

// ============================================================================
// ENTRY POINT: CREATE_ESCROW
// ============================================================================

/// Creates a new group escrow
/// 
/// # Parameters
/// - `total_amount`: Total CSPR required for the group expense (U256)
/// - `num_friends`: Number of participants including creator (u8)
/// 
/// # Returns
/// - Emits event with escrow_code for friends to join
#[no_mangle]
pub extern "C" fn create_escrow() {
    // Get caller (creator)
    let creator: AccountHash = runtime::get_caller();
    
    // Get parameters
    let total_amount: U256 = runtime::get_named_arg("total_amount");
    let num_friends: u8 = runtime::get_named_arg("num_friends");
    
    // Validation
    if num_friends < 2 {
        runtime::revert(casper_types::ApiError::User(100)); // Need at least 2 participants
    }
    
    // Calculate split amount (equal division)
    let split_amount = total_amount / U256::from(num_friends);
    
    // Get and increment counter
    let counter: u64 = match runtime::get_key(ESCROW_COUNTER) {
        Some(key) => {
            let uref = key.into_uref().unwrap_or_revert();
            storage::read(uref).unwrap_or_revert().unwrap_or(0u64)
        }
        None => 0u64,
    };
    
    let new_counter = counter + 1;
    
    // Generate unique escrow code
    let escrow_code = generate_escrow_code(new_counter, creator);
    
    // Create escrow object
    let escrow = Escrow {
        creator,
        total_amount,
        split_amount,
        num_friends,
        joined_count: 0, // Creator joins separately via join_escrow
        status: EscrowStatus::Open,
        accumulated_scspr: U512::zero(),
    };
    
    // Store escrow
    let escrow_dict = get_or_create_dict(ESCROW_DICT);
    storage::dictionary_put(escrow_dict, &escrow_code, serialize_escrow(&escrow));
    
    // Update counter
    let counter_uref = match runtime::get_key(ESCROW_COUNTER) {
        Some(key) => key.into_uref().unwrap_or_revert(),
        None => storage::new_uref(new_counter).into(),
    };
    storage::write(counter_uref, new_counter);
    runtime::put_key(ESCROW_COUNTER, counter_uref.into());
    
    // Return escrow code (store as runtime return value)
    runtime::ret(CLValue::from_t(escrow_code).unwrap_or_revert());
}

// ============================================================================
// ENTRY POINT: JOIN_ESCROW
// ============================================================================

/// Join an existing escrow and stake CSPR
/// 
/// # Parameters
/// - `escrow_code`: Unique code for the escrow (String)
/// - `amount`: Amount of CSPR to stake (must equal split_amount) (U512)
/// 
/// # Process
/// 1. Validates participant hasn't joined yet
/// 2. Validates amount matches split_amount
/// 3. Transfers CSPR from caller to contract
/// 4. Stakes CSPR → sCSPR via liquid staking
/// 5. Updates escrow state
/// 6. If all joined, triggers settlement
#[no_mangle]
pub extern "C" fn join_escrow() {
    let caller: AccountHash = runtime::get_caller();
    let escrow_code: String = runtime::get_named_arg("escrow_code");
    let amount: U512 = runtime::get_named_arg("amount");
    
    // Load escrow
    let escrow_dict = get_or_create_dict(ESCROW_DICT);
    let escrow_bytes: Vec<u8> = storage::dictionary_get(escrow_dict, &escrow_code)
        .unwrap_or_revert()
        .unwrap_or_revert();
    
    let mut escrow = deserialize_escrow(&escrow_bytes);
    
    // Validate escrow is still open
    if matches!(escrow.status, EscrowStatus::Complete) {
        runtime::revert(casper_types::ApiError::User(101)); // Escrow already complete
    }
    
    // Check if caller already joined
    let participant_dict = get_or_create_dict(PARTICIPANT_DICT);
    let participant_key = alloc::format!("{}:{}", escrow_code, caller);
    
    let already_joined: Option<bool> = storage::dictionary_get(participant_dict, &participant_key)
        .unwrap_or_revert();
    
    if already_joined.is_some() {
        runtime::revert(casper_types::ApiError::User(102)); // Already joined
    }
    
    // Validate amount matches split_amount
    let split_u512 = U512::from_dec_str(&escrow.split_amount.to_string()).unwrap_or_revert();
    if amount != split_u512 {
        runtime::revert(casper_types::ApiError::User(103)); // Incorrect amount
    }
    
    // Transfer CSPR from caller to contract
    let contract_purse = system::get_purse_id();
    system::transfer_from_purse_to_purse(
        runtime::get_account(),
        contract_purse,
        amount,
        None,
    )
    .unwrap_or_revert();
    
    // Stake CSPR → sCSPR via liquid staking contract
    // NOTE: This is a placeholder - actual implementation would call the liquid staking contract
    let scspr_received = stake_cspr_to_scspr(amount);
    
    // Update escrow state
    escrow.joined_count += 1;
    escrow.accumulated_scspr += scspr_received;
    
    // Mark participant as joined
    storage::dictionary_put(participant_dict, &participant_key, true);
    
    // Check if all participants have joined
    if escrow.joined_count >= escrow.num_friends {
        escrow.status = EscrowStatus::Complete;
        
        // Transfer all sCSPR to creator
        transfer_scspr_to_creator(&escrow);
    }
    
    // Save updated escrow
    storage::dictionary_put(escrow_dict, &escrow_code, serialize_escrow(&escrow));
}

// ============================================================================
// LIQUID STAKING INTEGRATION
// ============================================================================

/// Stake CSPR to receive sCSPR via Casper Liquid Staking
/// 
/// This is a placeholder implementation. In production:
/// 1. Get liquid staking contract hash from storage
/// 2. Call the staking contract's `stake` entry point
/// 3. Receive sCSPR tokens in return
fn stake_cspr_to_scspr(cspr_amount: U512) -> U512 {
    // Placeholder: In real implementation, call liquid staking contract
    // 
    // Example call structure:
    // let staking_contract = get_liquid_staking_contract_hash();
    // let result: U512 = runtime::call_contract(
    //     staking_contract,
    //     "stake",
    //     runtime_args! {
    //         "amount" => cspr_amount,
    //     },
    // );
    // return result;
    
    // For hackathon MVP, assume 1:1 ratio (in reality there's a conversion rate)
    cspr_amount
}

/// Transfer accumulated sCSPR to the creator
fn transfer_scspr_to_creator(escrow: &Escrow) {
    // Placeholder: In real implementation, transfer sCSPR tokens
    // 
    // Example call structure:
    // let scspr_contract = get_scspr_token_contract_hash();
    // runtime::call_contract(
    //     scspr_contract,
    //     "transfer",
    //     runtime_args! {
    //         "recipient" => escrow.creator,
    //         "amount" => escrow.accumulated_scspr,
    //     },
    // );
    
    // For hackathon, we assume the transfer succeeds
}

/// Get liquid staking contract hash from storage
fn get_liquid_staking_contract_hash() -> casper_types::ContractHash {
    // Placeholder: retrieve from storage or named key
    runtime::get_key(LIQUID_STAKING_CONTRACT)
        .unwrap_or_revert()
        .into_hash()
        .unwrap_or_revert()
        .into()
}

// ============================================================================
// CONTRACT INSTALLATION
// ============================================================================

#[no_mangle]
pub extern "C" fn call() {
    // Define entry points
    let mut entry_points = EntryPoints::new();
    
    // create_escrow entry point
    entry_points.add_entry_point(EntryPoint::new(
        "create_escrow",
        vec![
            Parameter::new("total_amount", CLType::U256),
            Parameter::new("num_friends", CLType::U8),
        ],
        CLType::String, // Returns escrow_code
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));
    
    // join_escrow entry point
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
    
    // Create named keys for storage
    let mut named_keys = NamedKeys::new();
    
    // Install contract
    let (contract_hash, contract_version) = storage::new_contract(
        entry_points,
        Some(named_keys),
        Some(CONTRACT_PACKAGE_NAME.to_string()),
        Some(CONTRACT_VERSION_KEY.to_string()),
    );
    
    // Store contract hash for future reference
    runtime::put_key("group_escrow_contract", contract_hash.into());
    runtime::put_key("group_escrow_contract_version", storage::new_uref(contract_version).into());
}