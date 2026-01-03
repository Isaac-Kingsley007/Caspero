#![no_std]
#![no_main]

extern crate alloc;

use alloc::{
    string::{String, ToString},
    vec,
    vec::Vec,
    format,
    boxed::Box,
};

use casper_contract::{
    contract_api::{runtime, storage, system},
    unwrap_or_revert::UnwrapOrRevert,
};

use casper_types::{
    CLType, CLValue, U512,
    EntryPointAccess, EntryPointType, EntryPoints,
    Parameter,
    contracts::{EntryPoint, NamedKeys},
    account::AccountHash,
};

/// ================= CONSTANTS =================

const CONTRACT_KEY: &str = "group_escrow_contract";
const CONTRACT_PACKAGE_KEY: &str = "group_escrow_package";
const CONTRACT_ACCESS_KEY: &str = "group_escrow_access";
const CONTRACT_VERSION_KEY: &str = "contract_version";
const CONTRACT_PURSE_KEY: &str = "contract_purse";

const EP_CREATE_ESCROW: &str = "create_escrow";
const EP_JOIN_ESCROW: &str = "join_escrow";
const EP_STAKE: &str = "stake";
const EP_REFUND: &str = "refund";
const EP_GET_PARTICIPANTS: &str = "get_participants";
const EP_GET_STAKE: &str = "get_stake";
const EP_COMPLETE_ESCROW: &str = "complete_escrow";
const EP_WITHDRAW: &str = "withdraw";
const EP_GET_LIQUID_BALANCE: &str = "get_liquid_balance";
const EP_GET_YIELD: &str = "get_yield";
const EP_DEPOSIT_YIELD: &str = "deposit_yield";
const EP_GET_ESCROW_BALANCE: &str = "get_escrow_balance";
const EP_GET_PARTICIPANT_YIELD: &str = "get_participant_yield";
const EP_GET_CONTRACT_PURSE: &str = "get_contract_purse";

const ARG_ESCROW_ID: &str = "escrow_id";
const ARG_AMOUNT: &str = "amount";
const ARG_PARTICIPANT: &str = "participant";
const ARG_TARGET_AMOUNT: &str = "target_amount";
const ARG_PURSE: &str = "purse";

/// ================= HELPERS =================

fn escrow_key(id: u64) -> String {
    format!("escrow_{}", id)
}

fn escrow_joined_key(id: u64) -> String {
    format!("escrow_{}_joined", id)
}

fn escrow_participants_key(id: u64) -> String {
    format!("escrow_{}_participants", id)
}

fn escrow_stake_key(id: u64, participant: AccountHash) -> String {
    format!("escrow_{}_stake_{}", id, participant)
}

fn escrow_total_staked_key(id: u64) -> String {
    format!("escrow_{}_total_staked", id)
}

fn escrow_liquid_balance_key(id: u64, participant: AccountHash) -> String {
    format!("escrow_{}_liquid_{}", id, participant)
}

fn escrow_total_yield_key(id: u64) -> String {
    format!("escrow_{}_total_yield", id)
}

fn escrow_participant_yield_key(id: u64, participant: AccountHash) -> String {
    format!("escrow_{}_yield_{}", id, participant)
}

fn escrow_completed_key(id: u64) -> String {
    format!("escrow_{}_completed", id)
}

fn escrow_withdrawn_key(id: u64, participant: AccountHash) -> String {
    format!("escrow_{}_withdrawn_{}", id, participant)
}

fn escrow_purse_key(id: u64) -> String {
    format!("escrow_{}_purse", id)
}

fn escrow_target_key(id: u64) -> String {
    format!("escrow_{}_target", id)
}

fn escrow_yield_purse_key(id: u64) -> String {
    format!("escrow_{}_yield_purse", id)
}

fn escrow_event_counter_key(id: u64) -> String {
    format!("escrow_{}_event_counter", id)
}

fn emit_event(event_name: &str, escrow_id: u64, data: &str) {
    let counter_key = escrow_event_counter_key(escrow_id);
    let counter = match runtime::get_key(&counter_key) {
        Some(key) => {
            let uref = key.into_uref().unwrap_or_revert();
            let current: u64 = storage::read(uref)
                .unwrap_or_revert()
                .unwrap_or_revert();
            storage::write(uref, current + 1);
            current + 1
        }
        None => {
            let uref = storage::new_uref(1u64);
            runtime::put_key(&counter_key, uref.into());
            1u64
        }
    };

    let event_key = format!("event_{}_{}", event_name, counter);
    let event_uref = storage::new_uref(data.to_string());
    runtime::put_key(&event_key, event_uref.into());
}

fn get_main_purse() -> casper_types::URef {
    let key = runtime::get_key(CONTRACT_PURSE_KEY).unwrap_or_revert();
    key.into_uref().unwrap_or_revert()
}

/// ================= ENTRY POINTS =================

#[no_mangle]
pub extern "C" fn create_escrow() {
    let escrow_id: u64 = runtime::get_named_arg(ARG_ESCROW_ID);
    let amount: u64 = runtime::get_named_arg(ARG_AMOUNT);
    let target_amount: u64 = runtime::get_named_arg(ARG_TARGET_AMOUNT);

    let key = escrow_key(escrow_id);
    let amount_uref = storage::new_uref(amount);
    runtime::put_key(&key, amount_uref.into());

    let target_key = escrow_target_key(escrow_id);
    let target_uref = storage::new_uref(target_amount);
    runtime::put_key(&target_key, target_uref.into());

    let joined_key = escrow_joined_key(escrow_id);
    let joined_uref = storage::new_uref(false);
    runtime::put_key(&joined_key, joined_uref.into());

    let participants_key = escrow_participants_key(escrow_id);
    let participants: Vec<AccountHash> = vec![];
    let participants_uref = storage::new_uref(participants);
    runtime::put_key(&participants_key, participants_uref.into());

    let total_staked_key = escrow_total_staked_key(escrow_id);
    let total_staked_uref = storage::new_uref(0u64);
    runtime::put_key(&total_staked_key, total_staked_uref.into());

    let total_yield_key = escrow_total_yield_key(escrow_id);
    let total_yield_uref = storage::new_uref(0u64);
    runtime::put_key(&total_yield_key, total_yield_uref.into());

    let completed_key = escrow_completed_key(escrow_id);
    let completed_uref = storage::new_uref(false);
    runtime::put_key(&completed_key, completed_uref.into());

    let escrow_purse = system::create_purse();
    let escrow_purse_key = escrow_purse_key(escrow_id);
    runtime::put_key(&escrow_purse_key, escrow_purse.into());

    let yield_purse = system::create_purse();
    let yield_purse_key = escrow_yield_purse_key(escrow_id);
    runtime::put_key(&yield_purse_key, yield_purse.into());

    emit_event("escrow_created", escrow_id, &format!("amount:{},target:{}", amount, target_amount));

    runtime::ret(
        CLValue::from_t(format!("Escrow {} created with target {}", escrow_id, target_amount))
            .unwrap_or_revert(),
    );
}

#[no_mangle]
pub extern "C" fn join_escrow() {
    let escrow_id: u64 = runtime::get_named_arg(ARG_ESCROW_ID);

    let joined_key = escrow_joined_key(escrow_id);

    match runtime::get_key(&joined_key) {
        Some(key) => {
            let uref = key.into_uref().unwrap_or_revert();
            storage::write(uref, true);
        }
        None => {
            let uref = storage::new_uref(true);
            runtime::put_key(&joined_key, uref.into());
        }
    }

    let caller = runtime::get_caller();

    let participants_key = escrow_participants_key(escrow_id);
    match runtime::get_key(&participants_key) {
        Some(key) => {
            let participants_uref = key.into_uref().unwrap_or_revert();
            let mut participants: Vec<AccountHash> = storage::read(participants_uref)
                .unwrap_or_revert()
                .unwrap_or_revert();

            if !participants.contains(&caller) {
                participants.push(caller);
                storage::write(participants_uref, participants);

                let liquid_balance_key = escrow_liquid_balance_key(escrow_id, caller);
                let liquid_balance_uref = storage::new_uref(0u64);
                runtime::put_key(&liquid_balance_key, liquid_balance_uref.into());

                emit_event("liquid_staking_enabled", escrow_id, &format!("participant:{}", caller));
            }
        }
        None => {}
    }

    emit_event("escrow_joined", escrow_id, &format!("participant:{}", caller));
}

#[no_mangle]
pub extern "C" fn stake() {
    let escrow_id: u64 = runtime::get_named_arg(ARG_ESCROW_ID);
    let amount: u64 = runtime::get_named_arg(ARG_AMOUNT);
    let participant: AccountHash = runtime::get_named_arg(ARG_PARTICIPANT);

    let completed_key = escrow_completed_key(escrow_id);
    let completed_storage_key = runtime::get_key(&completed_key).unwrap_or_revert();
    let completed_uref = completed_storage_key.into_uref().unwrap_or_revert();
    let is_completed: bool = storage::read(completed_uref)
        .unwrap_or_revert()
        .unwrap_or_revert();

    if is_completed {
        runtime::revert(casper_types::ApiError::User(103));
    }

    let source_purse = runtime::get_named_arg::<casper_types::URef>(ARG_PURSE);
    
    let escrow_purse_key = escrow_purse_key(escrow_id);
    let escrow_purse_storage_key = runtime::get_key(&escrow_purse_key).unwrap_or_revert();
    let escrow_purse = escrow_purse_storage_key.into_uref().unwrap_or_revert();

    system::transfer_from_purse_to_purse(
        source_purse,
        escrow_purse,
        U512::from(amount),
        None
    ).unwrap_or_revert();

    let participants_key = escrow_participants_key(escrow_id);
    let participants_storage_key = runtime::get_key(&participants_key).unwrap_or_revert();
    let participants_uref = participants_storage_key.into_uref().unwrap_or_revert();
    let mut participants: Vec<AccountHash> = storage::read(participants_uref)
        .unwrap_or_revert()
        .unwrap_or_revert();

    if !participants.contains(&participant) {
        participants.push(participant);
        storage::write(participants_uref, participants);
    }

    let stake_key = escrow_stake_key(escrow_id, participant);
    match runtime::get_key(&stake_key) {
        Some(key) => {
            let uref = key.into_uref().unwrap_or_revert();
            let current_stake: u64 = storage::read(uref)
                .unwrap_or_revert()
                .unwrap_or_revert();
            storage::write(uref, current_stake + amount);
        }
        None => {
            let uref = storage::new_uref(amount);
            runtime::put_key(&stake_key, uref.into());
        }
    }

    let liquid_balance_key = escrow_liquid_balance_key(escrow_id, participant);
    match runtime::get_key(&liquid_balance_key) {
        Some(key) => {
            let uref = key.into_uref().unwrap_or_revert();
            let current_liquid: u64 = storage::read(uref)
                .unwrap_or_revert()
                .unwrap_or_revert();
            storage::write(uref, current_liquid + amount);
        }
        None => {
            let uref = storage::new_uref(amount);
            runtime::put_key(&liquid_balance_key, uref.into());
        }
    }

    let total_staked_key = escrow_total_staked_key(escrow_id);
    let total_staked_storage_key = runtime::get_key(&total_staked_key).unwrap_or_revert();
    let total_staked_uref = total_staked_storage_key.into_uref().unwrap_or_revert();
    let current_total: u64 = storage::read(total_staked_uref)
        .unwrap_or_revert()
        .unwrap_or_revert();
    storage::write(total_staked_uref, current_total + amount);

    emit_event("staked", escrow_id, &format!("participant:{},amount:{},liquid_issued:{}", participant, amount, amount));

    runtime::ret(
        CLValue::from_t(format!("Staked {} to escrow {} with liquid tokens", amount, escrow_id))
            .unwrap_or_revert(),
    );
}

#[no_mangle]
pub extern "C" fn refund() {
    let escrow_id: u64 = runtime::get_named_arg(ARG_ESCROW_ID);
    let participant: AccountHash = runtime::get_named_arg(ARG_PARTICIPANT);

    let completed_key = escrow_completed_key(escrow_id);
    let completed_storage_key = runtime::get_key(&completed_key).unwrap_or_revert();
    let completed_uref = completed_storage_key.into_uref().unwrap_or_revert();
    let is_completed: bool = storage::read(completed_uref)
        .unwrap_or_revert()
        .unwrap_or_revert();

    if is_completed {
        runtime::revert(casper_types::ApiError::User(100));
    }

    let stake_key = escrow_stake_key(escrow_id, participant);
    let stake_storage_key = runtime::get_key(&stake_key).unwrap_or_revert();
    let stake_uref = stake_storage_key.into_uref().unwrap_or_revert();
    let staked_amount: u64 = storage::read(stake_uref)
        .unwrap_or_revert()
        .unwrap_or_revert();

    if staked_amount == 0 {
        runtime::revert(casper_types::ApiError::User(104));
    }

    let escrow_purse_key = escrow_purse_key(escrow_id);
    let escrow_purse_storage_key = runtime::get_key(&escrow_purse_key).unwrap_or_revert();
    let escrow_purse = escrow_purse_storage_key.into_uref().unwrap_or_revert();

    let target_purse = runtime::get_named_arg::<casper_types::URef>(ARG_PURSE);

    system::transfer_from_purse_to_purse(
        escrow_purse,
        target_purse,
        U512::from(staked_amount),
        None
    ).unwrap_or_revert();

    storage::write(stake_uref, 0u64);

    let liquid_balance_key = escrow_liquid_balance_key(escrow_id, participant);
    match runtime::get_key(&liquid_balance_key) {
        Some(key) => {
            let uref = key.into_uref().unwrap_or_revert();
            let current_liquid: u64 = storage::read(uref)
                .unwrap_or_revert()
                .unwrap_or_revert();
            if current_liquid >= staked_amount {
                storage::write(uref, current_liquid - staked_amount);
            } else {
                storage::write(uref, 0u64);
            }
        }
        None => {}
    }

    let total_staked_key = escrow_total_staked_key(escrow_id);
    let total_staked_storage_key = runtime::get_key(&total_staked_key).unwrap_or_revert();
    let total_staked_uref = total_staked_storage_key.into_uref().unwrap_or_revert();
    let current_total: u64 = storage::read(total_staked_uref)
        .unwrap_or_revert()
        .unwrap_or_revert();
    storage::write(total_staked_uref, current_total - staked_amount);

    emit_event("refunded", escrow_id, &format!("participant:{},amount:{}", participant, staked_amount));

    runtime::ret(
        CLValue::from_t(format!("Refunded {} from escrow {}", staked_amount, escrow_id))
            .unwrap_or_revert(),
    );
}

#[no_mangle]
pub extern "C" fn deposit_yield() {
    let escrow_id: u64 = runtime::get_named_arg(ARG_ESCROW_ID);
    let amount: u64 = runtime::get_named_arg(ARG_AMOUNT);

    let source_purse = runtime::get_named_arg::<casper_types::URef>(ARG_PURSE);

    let yield_purse_key = escrow_yield_purse_key(escrow_id);
    let yield_purse_storage_key = runtime::get_key(&yield_purse_key).unwrap_or_revert();
    let yield_purse = yield_purse_storage_key.into_uref().unwrap_or_revert();

    system::transfer_from_purse_to_purse(
        source_purse,
        yield_purse,
        U512::from(amount),
        None
    ).unwrap_or_revert();

    let total_yield_key = escrow_total_yield_key(escrow_id);
    let total_yield_storage_key = runtime::get_key(&total_yield_key).unwrap_or_revert();
    let total_yield_uref = total_yield_storage_key.into_uref().unwrap_or_revert();
    let current_yield: u64 = storage::read(total_yield_uref)
        .unwrap_or_revert()
        .unwrap_or_revert();
    storage::write(total_yield_uref, current_yield + amount);

    emit_event("yield_deposited", escrow_id, &format!("amount:{}", amount));

    runtime::ret(
        CLValue::from_t(format!("Deposited {} yield to escrow {}", amount, escrow_id))
            .unwrap_or_revert(),
    );
}

#[no_mangle]
pub extern "C" fn complete_escrow() {
    let escrow_id: u64 = runtime::get_named_arg(ARG_ESCROW_ID);

    let total_staked_key = escrow_total_staked_key(escrow_id);
    let total_staked_storage_key = runtime::get_key(&total_staked_key).unwrap_or_revert();
    let total_staked_uref = total_staked_storage_key.into_uref().unwrap_or_revert();
    let total_staked: u64 = storage::read(total_staked_uref)
        .unwrap_or_revert()
        .unwrap_or_revert();

    let target_key = escrow_target_key(escrow_id);
    let target_storage_key = runtime::get_key(&target_key).unwrap_or_revert();
    let target_uref = target_storage_key.into_uref().unwrap_or_revert();
    let target_amount: u64 = storage::read(target_uref)
        .unwrap_or_revert()
        .unwrap_or_revert();

    if total_staked < target_amount {
        runtime::revert(casper_types::ApiError::User(105));
    }

    let completed_key = escrow_completed_key(escrow_id);
    let completed_storage_key = runtime::get_key(&completed_key).unwrap_or_revert();
    let completed_uref = completed_storage_key.into_uref().unwrap_or_revert();
    storage::write(completed_uref, true);

    let total_yield_key = escrow_total_yield_key(escrow_id);
    let total_yield_storage_key = runtime::get_key(&total_yield_key).unwrap_or_revert();
    let total_yield_uref = total_yield_storage_key.into_uref().unwrap_or_revert();
    let total_yield: u64 = storage::read(total_yield_uref)
        .unwrap_or_revert()
        .unwrap_or_revert();

    emit_event("escrow_completed", escrow_id, &format!("total_staked:{},total_yield:{}", total_staked, total_yield));

    runtime::ret(
        CLValue::from_t(format!("Escrow {} completed with {} staked and {} yield", escrow_id, total_staked, total_yield))
            .unwrap_or_revert(),
    );
}

#[no_mangle]
pub extern "C" fn withdraw() {
    let escrow_id: u64 = runtime::get_named_arg(ARG_ESCROW_ID);
    let participant: AccountHash = runtime::get_named_arg(ARG_PARTICIPANT);

    let completed_key = escrow_completed_key(escrow_id);
    let completed_storage_key = runtime::get_key(&completed_key).unwrap_or_revert();
    let completed_uref = completed_storage_key.into_uref().unwrap_or_revert();
    let is_completed: bool = storage::read(completed_uref)
        .unwrap_or_revert()
        .unwrap_or_revert();

    if !is_completed {
        runtime::revert(casper_types::ApiError::User(101));
    }

    let withdrawn_key = escrow_withdrawn_key(escrow_id, participant);
    match runtime::get_key(&withdrawn_key) {
        Some(key) => {
            let uref = key.into_uref().unwrap_or_revert();
            let already_withdrawn: bool = storage::read(uref)
                .unwrap_or_revert()
                .unwrap_or_revert();
            if already_withdrawn {
                runtime::revert(casper_types::ApiError::User(102));
            }
        }
        None => {}
    }

    let stake_key = escrow_stake_key(escrow_id, participant);
    let stake_storage_key = runtime::get_key(&stake_key).unwrap_or_revert();
    let stake_uref = stake_storage_key.into_uref().unwrap_or_revert();
    let staked_amount: u64 = storage::read(stake_uref)
        .unwrap_or_revert()
        .unwrap_or_revert();

    if staked_amount == 0 {
        runtime::revert(casper_types::ApiError::User(106));
    }

    let total_staked_key = escrow_total_staked_key(escrow_id);
    let total_staked_storage_key = runtime::get_key(&total_staked_key).unwrap_or_revert();
    let total_staked_uref = total_staked_storage_key.into_uref().unwrap_or_revert();
    let total_staked: u64 = storage::read(total_staked_uref)
        .unwrap_or_revert()
        .unwrap_or_revert();

    let total_yield_key = escrow_total_yield_key(escrow_id);
    let total_yield_storage_key = runtime::get_key(&total_yield_key).unwrap_or_revert();
    let total_yield_uref = total_yield_storage_key.into_uref().unwrap_or_revert();
    let total_yield: u64 = storage::read(total_yield_uref)
        .unwrap_or_revert()
        .unwrap_or_revert();

    let participant_yield = if total_staked > 0 {
        (staked_amount * total_yield) / total_staked
    } else {
        0u64
    };

    let participant_yield_key = escrow_participant_yield_key(escrow_id, participant);
    let participant_yield_uref = storage::new_uref(participant_yield);
    runtime::put_key(&participant_yield_key, participant_yield_uref.into());

    let target_purse = runtime::get_named_arg::<casper_types::URef>(ARG_PURSE);

    let escrow_purse_key = escrow_purse_key(escrow_id);
    let escrow_purse_storage_key = runtime::get_key(&escrow_purse_key).unwrap_or_revert();
    let escrow_purse = escrow_purse_storage_key.into_uref().unwrap_or_revert();

    system::transfer_from_purse_to_purse(
        escrow_purse,
        target_purse,
        U512::from(staked_amount),
        None
    ).unwrap_or_revert();

    if participant_yield > 0 {
        let yield_purse_key = escrow_yield_purse_key(escrow_id);
        let yield_purse_storage_key = runtime::get_key(&yield_purse_key).unwrap_or_revert();
        let yield_purse = yield_purse_storage_key.into_uref().unwrap_or_revert();

        system::transfer_from_purse_to_purse(
            yield_purse,
            target_purse,
            U512::from(participant_yield),
            None
        ).unwrap_or_revert();
    }

    let withdrawn_uref = storage::new_uref(true);
    runtime::put_key(&withdrawn_key, withdrawn_uref.into());

    let liquid_balance_key = escrow_liquid_balance_key(escrow_id, participant);
    match runtime::get_key(&liquid_balance_key) {
        Some(key) => {
            let uref = key.into_uref().unwrap_or_revert();
            storage::write(uref, 0u64);
        }
        None => {}
    }

    let total_withdrawal = staked_amount + participant_yield;

    emit_event("withdrawn", escrow_id, &format!("participant:{},principal:{},yield:{},total:{}", participant, staked_amount, participant_yield, total_withdrawal));

    runtime::ret(
        CLValue::from_t(format!("Withdrawn {} (principal: {}, yield: {}) from escrow {}", total_withdrawal, staked_amount, participant_yield, escrow_id))
            .unwrap_or_revert(),
    );
}

#[no_mangle]
pub extern "C" fn get_participants() {
    let escrow_id: u64 = runtime::get_named_arg(ARG_ESCROW_ID);

    let participants_key = escrow_participants_key(escrow_id);
    let participants_storage_key = runtime::get_key(&participants_key).unwrap_or_revert();
    let participants_uref = participants_storage_key.into_uref().unwrap_or_revert();
    let participants: Vec<AccountHash> = storage::read(participants_uref)
        .unwrap_or_revert()
        .unwrap_or_revert();

    runtime::ret(
        CLValue::from_t(participants)
            .unwrap_or_revert(),
    );
}

#[no_mangle]
pub extern "C" fn get_stake() {
    let escrow_id: u64 = runtime::get_named_arg(ARG_ESCROW_ID);
    let participant: AccountHash = runtime::get_named_arg(ARG_PARTICIPANT);

    let stake_key = escrow_stake_key(escrow_id, participant);
    let stake_storage_key = runtime::get_key(&stake_key).unwrap_or_revert();
    let stake_uref = stake_storage_key.into_uref().unwrap_or_revert();
    let staked_amount: u64 = storage::read(stake_uref)
        .unwrap_or_revert()
        .unwrap_or_revert();

    runtime::ret(
        CLValue::from_t(staked_amount)
            .unwrap_or_revert(),
    );
}

#[no_mangle]
pub extern "C" fn get_liquid_balance() {
    let escrow_id: u64 = runtime::get_named_arg(ARG_ESCROW_ID);
    let participant: AccountHash = runtime::get_named_arg(ARG_PARTICIPANT);

    let liquid_balance_key = escrow_liquid_balance_key(escrow_id, participant);
    let liquid_storage_key = runtime::get_key(&liquid_balance_key).unwrap_or_revert();
    let liquid_uref = liquid_storage_key.into_uref().unwrap_or_revert();
    let liquid_amount: u64 = storage::read(liquid_uref)
        .unwrap_or_revert()
        .unwrap_or_revert();

    runtime::ret(
        CLValue::from_t(liquid_amount)
            .unwrap_or_revert(),
    );
}

#[no_mangle]
pub extern "C" fn get_yield() {
    let escrow_id: u64 = runtime::get_named_arg(ARG_ESCROW_ID);
    let participant: AccountHash = runtime::get_named_arg(ARG_PARTICIPANT);

    let stake_key = escrow_stake_key(escrow_id, participant);
    let stake_storage_key = runtime::get_key(&stake_key).unwrap_or_revert();
    let stake_uref = stake_storage_key.into_uref().unwrap_or_revert();
    let staked_amount: u64 = storage::read(stake_uref)
.unwrap_or_revert()
.unwrap_or_revert();
let total_staked_key = escrow_total_staked_key(escrow_id);
let total_staked_storage_key = runtime::get_key(&total_staked_key).unwrap_or_revert();
let total_staked_uref = total_staked_storage_key.into_uref().unwrap_or_revert();
let total_staked: u64 = storage::read(total_staked_uref)
    .unwrap_or_revert()
    .unwrap_or_revert();

let total_yield_key = escrow_total_yield_key(escrow_id);
let total_yield_storage_key = runtime::get_key(&total_yield_key).unwrap_or_revert();
let total_yield_uref = total_yield_storage_key.into_uref().unwrap_or_revert();
let total_yield: u64 = storage::read(total_yield_uref)
    .unwrap_or_revert()
    .unwrap_or_revert();

let participant_yield = if total_staked > 0 {
    (staked_amount * total_yield) / total_staked
} else {
    0u64
};

runtime::ret(
    CLValue::from_t(participant_yield)
        .unwrap_or_revert(),
);
}
#[no_mangle]
pub extern "C" fn get_escrow_balance() {
let escrow_id: u64 = runtime::get_named_arg(ARG_ESCROW_ID);
let escrow_purse_key = escrow_purse_key(escrow_id);
let escrow_purse_storage_key = runtime::get_key(&escrow_purse_key).unwrap_or_revert();
let escrow_purse = escrow_purse_storage_key.into_uref().unwrap_or_revert();
let balance = system::get_purse_balance(escrow_purse).unwrap_or_revert();
let balance_u64: u64 = balance.as_u64();

runtime::ret(
    CLValue::from_t(balance_u64)
        .unwrap_or_revert(),
);
}
#[no_mangle]
pub extern "C" fn get_participant_yield() {
let escrow_id: u64 = runtime::get_named_arg(ARG_ESCROW_ID);
let participant: AccountHash = runtime::get_named_arg(ARG_PARTICIPANT);
let participant_yield_key = escrow_participant_yield_key(escrow_id, participant);

match runtime::get_key(&participant_yield_key) {
    Some(key) => {
        let uref = key.into_uref().unwrap_or_revert();
        let yield_amount: u64 = storage::read(uref)
            .unwrap_or_revert()
            .unwrap_or_revert();
        
        runtime::ret(
            CLValue::from_t(yield_amount)
                .unwrap_or_revert(),
        );
    }
    None => {
        runtime::ret(
            CLValue::from_t(0u64)
                .unwrap_or_revert(),
        );
    }
}
}
#[no_mangle]
pub extern "C" fn get_contract_purse() {
let purse = get_main_purse();
runtime::ret(
    CLValue::from_t(purse)
        .unwrap_or_revert(),
);
}
/// ================= INSTALL CONTRACT =================
#[no_mangle]
pub extern "C" fn call() {
let mut entry_points = EntryPoints::new();
entry_points.add_entry_point(
    EntryPoint::new(
        EP_CREATE_ESCROW,
        vec![
            Parameter::new(ARG_ESCROW_ID, CLType::U64),
            Parameter::new(ARG_AMOUNT, CLType::U64),
            Parameter::new(ARG_TARGET_AMOUNT, CLType::U64),
        ],
        CLType::String,
        EntryPointAccess::Public,
        EntryPointType::Called,
    )
    .into(),
);

entry_points.add_entry_point(
    EntryPoint::new(
        EP_JOIN_ESCROW,
        vec![
            Parameter::new(ARG_ESCROW_ID, CLType::U64),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
    )
    .into(),
);

entry_points.add_entry_point(
    EntryPoint::new(
        EP_STAKE,
        vec![
            Parameter::new(ARG_ESCROW_ID, CLType::U64),
            Parameter::new(ARG_AMOUNT, CLType::U64),
            Parameter::new(ARG_PARTICIPANT, CLType::Key),
            Parameter::new(ARG_PURSE, CLType::URef),
        ],
        CLType::String,
        EntryPointAccess::Public,
        EntryPointType::Called,
    )
    .into(),
);

entry_points.add_entry_point(
    EntryPoint::new(
        EP_REFUND,
        vec![
            Parameter::new(ARG_ESCROW_ID, CLType::U64),
            Parameter::new(ARG_PARTICIPANT, CLType::Key),
            Parameter::new(ARG_PURSE, CLType::URef),
        ],
        CLType::String,
        EntryPointAccess::Public,
        EntryPointType::Called,
    )
    .into(),
);

entry_points.add_entry_point(
    EntryPoint::new(
        EP_DEPOSIT_YIELD,
        vec![
            Parameter::new(ARG_ESCROW_ID, CLType::U64),
            Parameter::new(ARG_AMOUNT, CLType::U64),
            Parameter::new(ARG_PURSE, CLType::URef),
        ],
        CLType::String,
        EntryPointAccess::Public,
        EntryPointType::Called,
    )
    .into(),
);

entry_points.add_entry_point(
    EntryPoint::new(
        EP_COMPLETE_ESCROW,
        vec![
            Parameter::new(ARG_ESCROW_ID, CLType::U64),
        ],
        CLType::String,
        EntryPointAccess::Public,
        EntryPointType::Called,
    )
    .into(),
);

entry_points.add_entry_point(
    EntryPoint::new(
        EP_WITHDRAW,
        vec![
            Parameter::new(ARG_ESCROW_ID, CLType::U64),
            Parameter::new(ARG_PARTICIPANT, CLType::Key),
            Parameter::new(ARG_PURSE, CLType::URef),
        ],
        CLType::String,
        EntryPointAccess::Public,
        EntryPointType::Called,
    )
    .into(),
);

entry_points.add_entry_point(
    EntryPoint::new(
        EP_GET_PARTICIPANTS,
        vec![
            Parameter::new(ARG_ESCROW_ID, CLType::U64),
        ],
        CLType::List(Box::new(CLType::Key)),
        EntryPointAccess::Public,
        EntryPointType::Called,
    )
    .into(),
);

entry_points.add_entry_point(
    EntryPoint::new(
        EP_GET_STAKE,
        vec![
            Parameter::new(ARG_ESCROW_ID, CLType::U64),
            Parameter::new(ARG_PARTICIPANT, CLType::Key),
        ],
        CLType::U64,
        EntryPointAccess::Public,
        EntryPointType::Called,
    )
    .into(),
);

entry_points.add_entry_point(
    EntryPoint::new(
        EP_GET_LIQUID_BALANCE,
        vec![
            Parameter::new(ARG_ESCROW_ID, CLType::U64),
            Parameter::new(ARG_PARTICIPANT, CLType::Key),
        ],
        CLType::U64,
        EntryPointAccess::Public,
        EntryPointType::Called,
    )
    .into(),
);

entry_points.add_entry_point(
    EntryPoint::new(
        EP_GET_YIELD,
        vec![
            Parameter::new(ARG_ESCROW_ID, CLType::U64),
            Parameter::new(ARG_PARTICIPANT, CLType::Key),
        ],
        CLType::U64,
        EntryPointAccess::Public,
        EntryPointType::Called,
    )
    .into(),
);

entry_points.add_entry_point(
    EntryPoint::new(
        EP_GET_ESCROW_BALANCE,
        vec![
            Parameter::new(ARG_ESCROW_ID, CLType::U64),
        ],
        CLType::U64,
        EntryPointAccess::Public,
        EntryPointType::Called,
    )
    .into(),
);

entry_points.add_entry_point(
    EntryPoint::new(
        EP_GET_PARTICIPANT_YIELD,
        vec![
            Parameter::new(ARG_ESCROW_ID, CLType::U64),
            Parameter::new(ARG_PARTICIPANT, CLType::Key),
        ],
        CLType::U64,
        EntryPointAccess::Public,
        EntryPointType::Called,
    )
    .into(),
);

entry_points.add_entry_point(
    EntryPoint::new(
        EP_GET_CONTRACT_PURSE,
        vec![],
        CLType::URef,
        EntryPointAccess::Public,
        EntryPointType::Called,
    )
    .into(),
);

let named_keys = NamedKeys::new();

let (contract_hash, contract_version) = storage::new_contract(
    entry_points,
    Some(named_keys),
    Some(CONTRACT_PACKAGE_KEY.to_string()),
    Some(CONTRACT_ACCESS_KEY.to_string()),
    None,
);

runtime::put_key(CONTRACT_KEY, contract_hash.into());

let version_uref = storage::new_uref(contract_version);
runtime::put_key(CONTRACT_VERSION_KEY, version_uref.into());

let main_purse = system::create_purse();
runtime::put_key(CONTRACT_PURSE_KEY, main_purse.into());
}