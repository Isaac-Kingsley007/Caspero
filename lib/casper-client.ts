/**
 * Casper Client Utilities
 * 
 * Helper functions for Casper blockchain interactions
 */

import { PublicKey } from 'casper-js-sdk';

export { CONTRACT_HASH, CHAIN_NAME, NODE_URL, getEscrowInfo } from './casper-contract';

const NODE_URL = process.env.NEXT_PUBLIC_CASPER_NODE_URL || 'https://rpc.testnet.casperlabs.io/rpc';

// Mock casper client for compatibility (used in pages that aren't updated yet)
export const casperClient = {
    async getEscrowInfo(escrowCode: string) {
        // This is a placeholder - real implementation is in casper-contract.ts
        console.log('Query escrow info:', escrowCode);
        return null;
    }
};

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

// Get account balance from Casper RPC
export async function getAccountBalance(publicKeyHex: string): Promise<bigint> {
    try {
        const publicKey = PublicKey.fromHex(publicKeyHex);

        // Get state root hash
        const stateResponse = await fetch(NODE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'chain_get_state_root_hash',
                params: {},
                id: 1
            })
        });

        const stateData = await stateResponse.json();
        const stateRootHash = stateData.result.state_root_hash;

        // Get account balance URef
        const accountHashBytes = publicKey.accountHash();
        const accountHash = `account-hash-${Buffer.from(accountHashBytes.toBytes()).toString('hex')}`;

        const balanceResponse = await fetch(NODE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'state_get_balance',
                params: {
                    state_root_hash: stateRootHash,
                    purse_uref: accountHash
                },
                id: 1
            })
        });

        const balanceData = await balanceResponse.json();

        if (balanceData.result && balanceData.result.balance_value) {
            return BigInt(balanceData.result.balance_value);
        }

        return BigInt(0);
    } catch (err) {
        console.error('Error fetching balance:', err);
        return BigInt(0);
    }
}
