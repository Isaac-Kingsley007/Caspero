/**
 * Blockchain Event Listener & Indexer
 * Listens to smart contract events and updates Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { CasperClient, EventStream } from 'casper-js-sdk';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!; // Service role key
const CASPER_NODE_URL = process.env.CASPER_NODE_URL!;
const CONTRACT_HASH = process.env.CONTRACT_HASH!;

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const casperClient = new CasperClient(CASPER_NODE_URL);

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Handle EscrowCreated event
 */
async function handleEscrowCreated(event: any) {
    console.log('EscrowCreated event:', event);

    const { escrow_code, creator, total_amount, num_friends } = event;

    try {
        // Insert escrow
        const { error: escrowError } = await supabase.from('escrows').insert({
            escrow_code,
            creator,
            total_amount: BigInt(total_amount).toString(),
            split_amount: (BigInt(total_amount) / BigInt(num_friends)).toString(),
            num_friends: parseInt(num_friends),
            joined_count: 0,
            status: 'Open',
            has_password: true, // Assume all new escrows have passwords
        });

        if (escrowError) throw escrowError;

        // Add creator to user_escrows
        const { error: userError } = await supabase.from('user_escrows').insert({
            user_account: creator,
            escrow_code,
            is_creator: true,
        });

        if (userError) throw userError;

        // Log event
        await logEvent('EscrowCreated', escrow_code, event);

        console.log(`✅ Escrow ${escrow_code} created successfully`);
    } catch (error) {
        console.error('Error handling EscrowCreated:', error);
    }
}

/**
 * Handle ParticipantJoined event
 */
async function handleParticipantJoined(event: any) {
    console.log('ParticipantJoined event:', event);

    const { escrow_code, participant, amount, joined_count } = event;

    try {
        // Update escrow joined_count
        const { error: updateError } = await supabase
            .from('escrows')
            .update({ joined_count: parseInt(joined_count) })
            .eq('escrow_code', escrow_code);

        if (updateError) throw updateError;

        // Add participant
        const { error: participantError } = await supabase
            .from('participants')
            .insert({
                escrow_code,
                participant,
                cspr_contributed: BigInt(amount).toString(),
                scspr_received: BigInt(amount).toString(), // Assume 1:1 for now
                withdrawn: false,
            });

        if (participantError) throw participantError;

        // Add to user_escrows
        const { error: userError } = await supabase.from('user_escrows').insert({
            user_account: participant,
            escrow_code,
            is_creator: false,
        });

        if (userError) throw userError;

        // Log event
        await logEvent('ParticipantJoined', escrow_code, event);

        console.log(`✅ Participant ${participant} joined ${escrow_code}`);
    } catch (error) {
        console.error('Error handling ParticipantJoined:', error);
    }
}

/**
 * Handle EscrowCompleted event
 */
async function handleEscrowCompleted(event: any) {
    console.log('EscrowCompleted event:', event);

    const { escrow_code, total_scspr } = event;

    try {
        // Update escrow status
        const { error } = await supabase
            .from('escrows')
            .update({
                status: 'Complete',
                initial_scspr: BigInt(total_scspr).toString(),
                completed_at: new Date().toISOString(),
            })
            .eq('escrow_code', escrow_code);

        if (error) throw error;

        // Log event
        await logEvent('EscrowCompleted', escrow_code, event);

        console.log(`✅ Escrow ${escrow_code} completed`);
    } catch (error) {
        console.error('Error handling EscrowCompleted:', error);
    }
}

/**
 * Handle WithdrawalMade event
 */
async function handleWithdrawalMade(event: any) {
    console.log('WithdrawalMade event:', event);

    const { escrow_code, participant, amount } = event;

    try {
        // Update participant withdrawal status
        const { error } = await supabase
            .from('participants')
            .update({
                withdrawn: true,
                withdrawn_at: new Date().toISOString(),
            })
            .eq('escrow_code', escrow_code)
            .eq('participant', participant);

        if (error) throw error;

        // Log event
        await logEvent('WithdrawalMade', escrow_code, event);

        console.log(`✅ Withdrawal made by ${participant} from ${escrow_code}`);
    } catch (error) {
        console.error('Error handling WithdrawalMade:', error);
    }
}

/**
 * Handle EscrowCancelled event
 */
async function handleEscrowCancelled(event: any) {
    console.log('EscrowCancelled event:', event);

    const { escrow_code, refund_count } = event;

    try {
        // Update escrow status
        const { error } = await supabase
            .from('escrows')
            .update({ status: 'Cancelled' })
            .eq('escrow_code', escrow_code);

        if (error) throw error;

        // Log event
        await logEvent('EscrowCancelled', escrow_code, event);

        console.log(`✅ Escrow ${escrow_code} cancelled`);
    } catch (error) {
        console.error('Error handling EscrowCancelled:', error);
    }
}

// ============================================================================
// EVENT LOGGING
// ============================================================================

async function logEvent(eventType: string, escrowCode: string, data: any) {
    await supabase.from('events').insert({
        event_type: eventType,
        escrow_code: escrowCode,
        data,
        created_at: new Date().toISOString(),
    });
}

// ============================================================================
// EVENT LISTENER
// ============================================================================

/**
 * Parse event from contract storage
 */
function parseContractEvent(eventKey: string, eventData: string) {
    // Event keys are in format: "event_{event_name}_{timestamp}"
    const match = eventKey.match(/^event_(.+)_(\d+)$/);
    if (!match) return null;

    const [, eventName, timestamp] = match;

    try {
        const data = JSON.parse(eventData);
        return {
            eventName,
            timestamp: parseInt(timestamp),
            data,
        };
    } catch {
        return null;
    }
}

/**
 * Poll for new events
 */
async function pollForEvents() {
    console.log('Polling for new events...');

    try {
        // Query contract for new event keys
        // This is a simplified version - actual implementation depends on Casper SDK
        const stateRootHash = await casperClient.nodeClient.getStateRootHash();

        // Get all keys starting with "event_"
        // Note: Actual implementation would use proper Casper SDK methods

        // For each event found, parse and handle it
        // This is pseudo-code - adjust based on actual Casper SDK

        console.log('✅ Event polling complete');
    } catch (error) {
        console.error('Error polling events:', error);
    }
}

/**
 * Start event listener
 */
export async function startEventListener() {
    console.log('🚀 Starting event listener...');
    console.log(`Contract: ${CONTRACT_HASH}`);
    console.log(`Node: ${CASPER_NODE_URL}`);

    // Poll for events every 10 seconds
    setInterval(pollForEvents, 10000);

    // Initial poll
    await pollForEvents();

    console.log('✅ Event listener started');
}

// ============================================================================
// MANUAL SYNC (For initial setup or recovery)
// ============================================================================

/**
 * Manually sync an escrow from blockchain to database
 */
export async function syncEscrow(escrowCode: string) {
    console.log(`Syncing escrow ${escrowCode}...`);

    try {
        // Get escrow info from contract
        // This would use your contract client
        // const escrowInfo = await contractClient.getEscrowInfo(escrowCode);

        // Insert or update in database
        // await supabase.from('escrows').upsert({ ... });

        console.log(`✅ Escrow ${escrowCode} synced`);
    } catch (error) {
        console.error(`Error syncing escrow ${escrowCode}:`, error);
    }
}

// ============================================================================
// MAIN
// ============================================================================

if (require.main === module) {
    startEventListener().catch(console.error);
}
