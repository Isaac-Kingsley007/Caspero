/**
 * Casper Client Utilities
 * 
 * Helper functions for Casper blockchain interactions
 */

export { casperClient, CONTRACT_HASH, CHAIN_NAME, NODE_URL } from './casper-contract';

// Format motes to CSPR string (1 CSPR = 1,000,000,000 motes)
export function formatCSPR(motes: bigint, decimals: number = 2): string {
    const cspr = Number(motes) / 1_000_000_000;
    return cspr.toFixed(decimals);
}

// Parse CSPR string to motes
export function parseCSPR(cspr: string): bigint {
    const amount = parseFloat(cspr);
    return BigInt(Math.floor(amount * 1_000_000_000));
}

// Convert CSPR to motes (1 CSPR = 1e9 motes)
export function cspr2motes(cspr: string): string {
    return (BigInt(Math.floor(parseFloat(cspr) * 1e9))).toString();
}

// Convert motes to CSPR
export function motes2cspr(motes: string): string {
    return (Number(motes) / 1e9).toFixed(9);
}

// Format account hash for display
export function formatAccountHash(accountHash: string): string {
    if (accountHash.length <= 20) return accountHash;
    return `${accountHash.slice(0, 10)}...${accountHash.slice(-8)}`;
}

// Gas costs (in motes, 1 CSPR = 1,000,000,000 motes)
export const GAS_COSTS = {
    CREATE_ESCROW: BigInt('5000000000'), // 5 CSPR
    JOIN_ESCROW: BigInt('5000000000'), // 5 CSPR
    WITHDRAW: BigInt('3000000000'), // 3 CSPR
    CANCEL_ESCROW: BigInt('3000000000'), // 3 CSPR
} as const;

// Mock balance function (replace with real RPC call if needed)
export async function getAccountBalance(publicKey: string): Promise<bigint> {
    try {
        // TODO: Implement real balance fetching from Casper RPC
        console.log('Fetching balance for:', publicKey);
        return BigInt('100000000000'); // 100 CSPR mock
    } catch (err) {
        console.error('Error fetching balance:', err);
        return BigInt(0);
    }
}
