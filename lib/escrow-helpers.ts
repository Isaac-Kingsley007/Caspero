/**
 * Gas-Optimized Escrow Contract Helpers
 * 
 * These functions replace expensive on-chain operations with efficient
 * client-side aggregation using multiple cheap contract calls.
 */

import { CasperClient, CLPublicKey } from 'casper-js-sdk';

// Types
export interface EscrowInfo {
    escrow_code: string;
    is_creator: boolean;
    creator: string;
    total_amount: string;
    split_amount: string;
    num_friends: number;
    joined_count: number;
    status: 'Open' | 'Complete' | 'Cancelled';
    status_code: number;
    accumulated_scspr: string;
    current_yield: string;
    created_timestamp: number;
    has_password: boolean;
}

export interface ParticipantStatus {
    cspr_contributed: string;
    scspr_received: string;
    withdrawn: boolean;
}

export interface EscrowStats {
    total_escrows: number;
    open_escrows: number;
    complete_escrows: number;
    cancelled_escrows: number;
    total_cspr_pooled: string;
    total_yield_earned: string;
}

/**
 * Get detailed user escrows with filtering (replaces get_user_escrows_detailed)
 * 
 * Gas Cost: ~2,000 gas (list) + ~2,000 gas per escrow = ~10,000 gas for 5 escrows
 * vs. ~20,000+ gas for single expensive contract call
 */
export async function getUserEscrowsDetailed(
    contractClient: any,
    userAccount: string,
    statusFilter?: 'Open' | 'Complete' | 'Cancelled'
): Promise<EscrowInfo[]> {
    // Step 1: Get simple list (cheap - ~2,000 gas)
    const escrowList = await contractClient.listUserEscrows(userAccount);

    if (!escrowList || escrowList.length === 0) {
        return [];
    }

    // Step 2: Parse escrow codes
    const escrowEntries = escrowList.map((entry: string) => {
        const [code, isCreatorFlag] = entry.split(':');
        return {
            escrow_code: code,
            is_creator: isCreatorFlag === '1'
        };
    });

    // Step 3: Get details for each escrow (cheap - ~2,000 gas each)
    const detailedEscrows = await Promise.all(
        escrowEntries.map(async (entry) => {
            try {
                const info = await contractClient.getEscrowInfo(entry.escrow_code);

                // Parse status
                const statusCode = parseInt(info.status);
                const statusName = statusCode === 0 ? 'Open' : statusCode === 1 ? 'Complete' : 'Cancelled';

                // Calculate yield (client-side)
                const currentYield = calculateYield(info);

                return {
                    escrow_code: entry.escrow_code,
                    is_creator: entry.is_creator,
                    creator: info.creator,
                    total_amount: info.total_amount,
                    split_amount: info.split_amount,
                    num_friends: parseInt(info.num_friends),
                    joined_count: parseInt(info.joined_count),
                    status: statusName as 'Open' | 'Complete' | 'Cancelled',
                    status_code: statusCode,
                    accumulated_scspr: info.accumulated_scspr,
                    current_yield: currentYield,
                    created_timestamp: parseInt(info.created_timestamp),
                    has_password: info.password_hash !== '0'.repeat(64) // Check if not zero hash
                };
            } catch (error) {
                console.error(`Failed to get info for ${entry.escrow_code}:`, error);
                return null;
            }
        })
    );

    // Step 4: Filter and clean results
    let results = detailedEscrows.filter((e): e is EscrowInfo => e !== null);

    if (statusFilter) {
        results = results.filter(e => e.status === statusFilter);
    }

    return results;
}

/**
 * Calculate yield for an escrow (client-side calculation)
 */
function calculateYield(escrowInfo: any): string {
    // If escrow is complete and has initial sCSPR
    if (escrowInfo.status === '1' && escrowInfo.initial_scspr !== '0') {
        const accumulated = BigInt(escrowInfo.accumulated_scspr);
        const initial = BigInt(escrowInfo.initial_scspr);

        if (accumulated > initial) {
            return (accumulated - initial).toString();
        }
    }

    return '0';
}

/**
 * Get all escrows with pagination (replaces get_all_escrows)
 * 
 * Note: This requires event indexing or backend service since we removed
 * the global escrow list to save gas. Use event listener instead.
 */
export async function getAllEscrowsFromEvents(
    eventIndexer: any,
    page: number = 0,
    pageSize: number = 20,
    statusFilter?: 'Open' | 'Complete' | 'Cancelled'
): Promise<EscrowInfo[]> {
    // Get escrow codes from event indexer
    const escrowCodes = await eventIndexer.getEscrowCodes({
        page,
        pageSize,
        status: statusFilter
    });

    // Get details for each
    const escrows = await Promise.all(
        escrowCodes.map(async (code: string) => {
            try {
                const info = await contractClient.getEscrowInfo(code);
                const statusCode = parseInt(info.status);
                const statusName = statusCode === 0 ? 'Open' : statusCode === 1 ? 'Complete' : 'Cancelled';

                return {
                    escrow_code: code,
                    total_amount: info.total_amount,
                    split_amount: info.split_amount,
                    num_friends: parseInt(info.num_friends),
                    joined_count: parseInt(info.joined_count),
                    status: statusName,
                    created_timestamp: parseInt(info.created_timestamp),
                    has_password: info.password_hash !== '0'.repeat(64)
                };
            } catch (error) {
                return null;
            }
        })
    );

    return escrows.filter((e): e is any => e !== null);
}

/**
 * Get platform statistics (replaces get_escrow_stats)
 * 
 * This should be calculated by a backend indexer service that listens
 * to contract events and maintains aggregated statistics.
 */
export async function getEscrowStats(
    eventIndexer: any
): Promise<EscrowStats> {
    // Get stats from event indexer (free - no gas cost)
    return await eventIndexer.getStats();
}

/**
 * Event listener for real-time updates
 */
export class EscrowEventListener {
    private contractHash: string;
    private casperClient: CasperClient;
    private listeners: Map<string, Function[]> = new Map();

    constructor(contractHash: string, casperClient: CasperClient) {
        this.contractHash = contractHash;
        this.casperClient = casperClient;
    }

    /**
     * Listen for EscrowCreated events
     */
    onEscrowCreated(callback: (event: any) => void) {
        this.addListener('EscrowCreated', callback);
    }

    /**
     * Listen for ParticipantJoined events
     */
    onParticipantJoined(callback: (event: any) => void) {
        this.addListener('ParticipantJoined', callback);
    }

    /**
     * Listen for EscrowCompleted events
     */
    onEscrowCompleted(callback: (event: any) => void) {
        this.addListener('EscrowCompleted', callback);
    }

    /**
     * Listen for WithdrawalMade events
     */
    onWithdrawalMade(callback: (event: any) => void) {
        this.addListener('WithdrawalMade', callback);
    }

    /**
     * Listen for EscrowCancelled events
     */
    onEscrowCancelled(callback: (event: any) => void) {
        this.addListener('EscrowCancelled', callback);
    }

    private addListener(eventName: string, callback: Function) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }
        this.listeners.get(eventName)!.push(callback);
    }

    /**
     * Start listening for events
     */
    async start() {
        // Poll for new events every 10 seconds
        setInterval(async () => {
            await this.pollEvents();
        }, 10000);
    }

    private async pollEvents() {
        // Implementation depends on Casper event system
        // This is a placeholder for the actual event polling logic
    }
}

/**
 * Simple in-memory cache for escrow data
 */
export class EscrowCache {
    private cache: Map<string, { data: any; timestamp: number }> = new Map();
    private ttl: number = 60000; // 1 minute TTL

    get(key: string): any | null {
        const cached = this.cache.get(key);
        if (!cached) return null;

        if (Date.now() - cached.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    set(key: string, data: any) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    clear() {
        this.cache.clear();
    }
}

/**
 * Helper to format CSPR amounts
 */
export function formatCSPR(amount: string): string {
    const cspr = BigInt(amount) / BigInt(1e9); // Convert motes to CSPR
    return cspr.toString();
}

/**
 * Helper to calculate percentage complete
 */
export function getCompletionPercentage(joinedCount: number, totalFriends: number): number {
    return Math.round((joinedCount / totalFriends) * 100);
}

/**
 * Helper to check if escrow needs participants
 */
export function needsParticipants(escrow: EscrowInfo): boolean {
    return escrow.status === 'Open' && escrow.joined_count < escrow.num_friends;
}

/**
 * Helper to check if user can withdraw
 */
export async function canWithdraw(
    contractClient: any,
    escrowCode: string,
    userAccount: string
): Promise<boolean> {
    try {
        const status = await contractClient.getParticipantStatus(escrowCode, userAccount);

        if (status === 'not_joined') return false;

        return !status.withdrawn;
    } catch {
        return false;
    }
}
