/**
 * Casper Client Library
 * Real implementation for interacting with the escrow smart contract
 * Updated for casper-js-sdk v5
 */

import { 
  RpcClient,
  PublicKey
} from 'casper-js-sdk';

// Contract configuration
const CONTRACT_HASH = process.env.NEXT_PUBLIC_CONTRACT_HASH || '';

// Network configuration
export const CASPER_CONFIG = {
  testnet: {
    rpcUrl: 'https://rpc.testnet.casperlabs.io/rpc',
    chainName: 'casper-test',
    explorerUrl: 'https://testnet.cspr.live',
  },
  mainnet: {
    rpcUrl: 'https://rpc.mainnet.casperlabs.io/rpc',
    chainName: 'casper',
    explorerUrl: 'https://cspr.live',
  },
} as const;

export const CURRENT_NETWORK: 'testnet' | 'mainnet' = 
  (process.env.NEXT_PUBLIC_CASPER_NETWORK as 'testnet' | 'mainnet') || 'testnet';

// Initialize Casper client
const casperClient = new RpcClient(CASPER_CONFIG[CURRENT_NETWORK].rpcUrl as any);

// Gas costs (in motes)
export const GAS_COSTS = {
  CREATE_ESCROW: '10000000000', // 10 CSPR
  JOIN_ESCROW: '5000000000',    // 5 CSPR
  WITHDRAW: '5000000000',       // 5 CSPR
  CANCEL_ESCROW: '5000000000',  // 5 CSPR
} as const;

// Types
export interface EscrowInfo {
  creator: string;
  totalAmount: string;
  splitAmount: string;
  numFriends: number;
  joinedCount: number;
  status: 'Open' | 'Complete' | 'Cancelled';
  accumulatedScspr: string;
  initialScspr: string;
  createdTimestamp: string;
  hasPassword: boolean;
}

export interface ParticipantStatus {
  account: string;
  csprContributed: string;
  scsprReceived: string;
  withdrawn: boolean;
}

// Utility functions
export function formatCSPR(motes: string | bigint, decimals: number = 2): string {
  const motesNum = typeof motes === 'string' ? BigInt(motes) : motes;
  const cspr = Number(motesNum) / 1_000_000_000;
  return cspr.toFixed(decimals);
}

export function parseCSPR(cspr: string): string {
  const amount = parseFloat(cspr);
  return BigInt(Math.floor(amount * 1_000_000_000)).toString();
}

export function formatAccountHash(accountHash: string): string {
  if (accountHash.length <= 20) return accountHash;
  return `${accountHash.slice(0, 10)}...${accountHash.slice(-8)}`;
}

// Get account balance from network
export async function getAccountBalance(publicKey: string): Promise<string> {
  try {
    const publicKeyObj = PublicKey.fromHex(publicKey);
    
    const balanceResult = await casperClient.getLatestBalance(
      publicKeyObj.toHex()
    );
    
    return balanceResult.balanceValue.toString();
  } catch (error) {
    console.error('Error fetching balance:', error);
    return '0';
  }
}

// Deploy creation functions - simplified for v5 compatibility
// These will be used with CSPR.click SDK for actual deployment

export interface DeployParams {
  publicKey: string;
  contractHash: string;
  entryPoint: string;
  args: Record<string, any>;
  gasAmount: string;
}

export function createEscrowDeployParams(
  publicKey: string,
  escrowCode: string,
  totalAmount: string,
  splitAmount: string,
  numFriends: number,
  password?: string
): DeployParams {
  return {
    publicKey,
    contractHash: CONTRACT_HASH,
    entryPoint: 'create_escrow',
    args: {
      escrow_code: escrowCode,
      total_amount: totalAmount,
      split_amount: splitAmount,
      num_friends: numFriends,
      password: password || null
    },
    gasAmount: GAS_COSTS.CREATE_ESCROW
  };
}

export function joinEscrowDeployParams(
  publicKey: string,
  escrowCode: string,
  amount: string,
  password?: string
): DeployParams {
  return {
    publicKey,
    contractHash: CONTRACT_HASH,
    entryPoint: 'join_escrow',
    args: {
      escrow_code: escrowCode,
      amount: amount,
      password: password || null
    },
    gasAmount: GAS_COSTS.JOIN_ESCROW
  };
}

export function withdrawDeployParams(
  publicKey: string,
  escrowCode: string
): DeployParams {
  return {
    publicKey,
    contractHash: CONTRACT_HASH,
    entryPoint: 'withdraw',
    args: {
      escrow_code: escrowCode
    },
    gasAmount: GAS_COSTS.WITHDRAW
  };
}

export function cancelEscrowDeployParams(
  publicKey: string,
  escrowCode: string
): DeployParams {
  return {
    publicKey,
    contractHash: CONTRACT_HASH,
    entryPoint: 'cancel_escrow',
    args: {
      escrow_code: escrowCode
    },
    gasAmount: GAS_COSTS.CANCEL_ESCROW
  };
}

// Query functions - simplified for v5 compatibility
export async function getEscrowInfo(escrowCode: string): Promise<EscrowInfo | null> {
  try {
    // For now, return null - this will be implemented with proper v5 query methods
    // or through the event indexer/Supabase integration
    console.log('getEscrowInfo called for:', escrowCode);
    return null;
  } catch (error) {
    console.error('Error querying escrow info:', error);
    return null;
  }
}

export async function getParticipantStatus(
  escrowCode: string, 
  participantKey: string
): Promise<ParticipantStatus | null> {
  try {
    console.log('getParticipantStatus called for:', escrowCode, participantKey);
    return null;
  } catch (error) {
    console.error('Error querying participant status:', error);
    return null;
  }
}

export async function getUserEscrows(userKey: string): Promise<string[]> {
  try {
    console.log('getUserEscrows called for:', userKey);
    return [];
  } catch (error) {
    console.error('Error querying user escrows:', error);
    return [];
  }
}

// Wait for deploy to be processed
export async function waitForDeploy(deployHash: string): Promise<any> {
  try {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    
    while (attempts < maxAttempts) {
      try {
        const deployResult = await casperClient.getDeploy(deployHash);
        
        if (deployResult && deployResult.executionResultsV1 && deployResult.executionResultsV1.length > 0) {
          const executionResult = deployResult.executionResultsV1[0];
          
          if (executionResult.result && 'Success' in executionResult.result) {
            return {
              success: true,
              deployHash,
              result: executionResult.result.Success
            };
          } else if (executionResult.result && 'Failure' in executionResult.result) {
            return {
              success: false,
              deployHash,
              error: (executionResult.result.Failure as any).error_message
            };
          }
        }
      } catch (error) {
        // Deploy not found yet, continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }
    
    throw new Error('Deploy timeout - transaction not processed within 5 minutes');
  } catch (error) {
    console.error('Error waiting for deploy:', error);
    throw error;
  }
}