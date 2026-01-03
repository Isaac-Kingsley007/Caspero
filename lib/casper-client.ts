/**
 * Casper Client Library
 * Real implementation for interacting with the escrow smart contract
 */

import { 
  CasperClient, 
  CLPublicKey, 
  CLAccountHash,
  CLString,
  CLU256,
  CLU8,
  CLByteArray,
  DeployUtil,
  RuntimeArgs,
  CLValueBuilder,
  CLMap,
  CLKey,
  CLValue,
  Contracts
} from 'casper-js-sdk';

// Contract configuration
const CONTRACT_HASH = process.env.NEXT_PUBLIC_CONTRACT_HASH || '';
const CONTRACT_PACKAGE_HASH = process.env.NEXT_PUBLIC_CONTRACT_PACKAGE_HASH || '';

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
const casperClient = new CasperClient(CASPER_CONFIG[CURRENT_NETWORK].rpcUrl);

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
    const publicKeyObj = CLPublicKey.fromHex(publicKey);
    const accountHash = publicKeyObj.toAccountHashStr();
    
    const balanceURef = await casperClient.getAccountBalanceUrefByPublicKey(
      publicKeyObj
    );
    
    if (!balanceURef) {
      return '0';
    }
    
    const balance = await casperClient.getAccountBalance(balanceURef);
    return balance.toString();
  } catch (error) {
    console.error('Error fetching balance:', error);
    return '0';
  }
}

// Create escrow deploy
export function createEscrowDeploy(
  publicKey: string,
  escrowCode: string,
  totalAmount: string,
  splitAmount: string,
  numFriends: number,
  password?: string
): DeployUtil.Deploy {
  const publicKeyObj = CLPublicKey.fromHex(publicKey);
  
  const args = RuntimeArgs.fromMap({
    escrow_code: CLValueBuilder.string(escrowCode),
    total_amount: CLValueBuilder.u256(totalAmount),
    split_amount: CLValueBuilder.u256(splitAmount),
    num_friends: CLValueBuilder.u8(numFriends),
    password: password ? CLValueBuilder.string(password) : CLValueBuilder.option(null, CLString)
  });

  const deploy = DeployUtil.makeDeploy(
    new DeployUtil.DeployParams(
      publicKeyObj,
      CASPER_CONFIG[CURRENT_NETWORK].chainName,
      1, // gas price
      1800000, // ttl
      []
    ),
    DeployUtil.ExecutableDeployItem.newStoredContractByHash(
      Uint8Array.from(Buffer.from(CONTRACT_HASH, 'hex')),
      'create_escrow',
      args
    ),
    DeployUtil.standardPayment(GAS_COSTS.CREATE_ESCROW)
  );

  return deploy;
}

// Join escrow deploy
export function joinEscrowDeploy(
  publicKey: string,
  escrowCode: string,
  amount: string,
  password?: string
): DeployUtil.Deploy {
  const publicKeyObj = CLPublicKey.fromHex(publicKey);
  
  const args = RuntimeArgs.fromMap({
    escrow_code: CLValueBuilder.string(escrowCode),
    amount: CLValueBuilder.u512(amount),
    password: password ? CLValueBuilder.string(password) : CLValueBuilder.option(null, CLString)
  });

  const deploy = DeployUtil.makeDeploy(
    new DeployUtil.DeployParams(
      publicKeyObj,
      CASPER_CONFIG[CURRENT_NETWORK].chainName,
      1,
      1800000,
      []
    ),
    DeployUtil.ExecutableDeployItem.newStoredContractByHash(
      Uint8Array.from(Buffer.from(CONTRACT_HASH, 'hex')),
      'join_escrow',
      args
    ),
    DeployUtil.standardPayment(GAS_COSTS.JOIN_ESCROW)
  );

  return deploy;
}

// Withdraw deploy
export function withdrawDeploy(
  publicKey: string,
  escrowCode: string
): DeployUtil.Deploy {
  const publicKeyObj = CLPublicKey.fromHex(publicKey);
  
  const args = RuntimeArgs.fromMap({
    escrow_code: CLValueBuilder.string(escrowCode)
  });

  const deploy = DeployUtil.makeDeploy(
    new DeployUtil.DeployParams(
      publicKeyObj,
      CASPER_CONFIG[CURRENT_NETWORK].chainName,
      1,
      1800000,
      []
    ),
    DeployUtil.ExecutableDeployItem.newStoredContractByHash(
      Uint8Array.from(Buffer.from(CONTRACT_HASH, 'hex')),
      'withdraw',
      args
    ),
    DeployUtil.standardPayment(GAS_COSTS.WITHDRAW)
  );

  return deploy;
}

// Cancel escrow deploy
export function cancelEscrowDeploy(
  publicKey: string,
  escrowCode: string
): DeployUtil.Deploy {
  const publicKeyObj = CLPublicKey.fromHex(publicKey);
  
  const args = RuntimeArgs.fromMap({
    escrow_code: CLValueBuilder.string(escrowCode)
  });

  const deploy = DeployUtil.makeDeploy(
    new DeployUtil.DeployParams(
      publicKeyObj,
      CASPER_CONFIG[CURRENT_NETWORK].chainName,
      1,
      1800000,
      []
    ),
    DeployUtil.ExecutableDeployItem.newStoredContractByHash(
      Uint8Array.from(Buffer.from(CONTRACT_HASH, 'hex')),
      'cancel_escrow',
      args
    ),
    DeployUtil.standardPayment(GAS_COSTS.CANCEL_ESCROW)
  );

  return deploy;
}

// Query escrow information
export async function getEscrowInfo(escrowCode: string): Promise<EscrowInfo | null> {
  try {
    const contractHashKey = `hash-${CONTRACT_HASH}`;
    
    const result = await casperClient.queryContractData([
      contractHashKey,
      'get_escrow_info',
      escrowCode
    ]);

    if (!result || !result.CLValue) {
      return null;
    }

    // Parse the JSON string returned by the contract
    const jsonString = result.CLValue.data;
    const escrowData = JSON.parse(jsonString);

    return {
      creator: escrowData.creator,
      totalAmount: escrowData.total_amount,
      splitAmount: escrowData.split_amount,
      numFriends: escrowData.num_friends,
      joinedCount: escrowData.joined_count,
      status: escrowData.status === 0 ? 'Open' : escrowData.status === 1 ? 'Complete' : 'Cancelled',
      accumulatedScspr: escrowData.accumulated_scspr,
      initialScspr: escrowData.initial_scspr,
      createdTimestamp: escrowData.created_timestamp,
      hasPassword: escrowData.password_hash !== '0000000000000000000000000000000000000000000000000000000000000000'
    };
  } catch (error) {
    console.error('Error querying escrow info:', error);
    return null;
  }
}

// Query participant status
export async function getParticipantStatus(
  escrowCode: string, 
  participantKey: string
): Promise<ParticipantStatus | null> {
  try {
    const contractHashKey = `hash-${CONTRACT_HASH}`;
    
    const result = await casperClient.queryContractData([
      contractHashKey,
      'get_participant_status',
      escrowCode,
      participantKey
    ]);

    if (!result || !result.CLValue) {
      return null;
    }

    const jsonString = result.CLValue.data;
    const participantData = JSON.parse(jsonString);

    return {
      account: participantData.account,
      csprContributed: participantData.cspr_contributed,
      scsprReceived: participantData.scspr_received,
      withdrawn: participantData.withdrawn
    };
  } catch (error) {
    console.error('Error querying participant status:', error);
    return null;
  }
}

// Query user escrows
export async function getUserEscrows(userKey: string): Promise<string[]> {
  try {
    const contractHashKey = `hash-${CONTRACT_HASH}`;
    
    const result = await casperClient.queryContractData([
      contractHashKey,
      'list_user_escrows',
      userKey
    ]);

    if (!result || !result.CLValue) {
      return [];
    }

    const jsonString = result.CLValue.data;
    const escrowList = JSON.parse(jsonString);

    return escrowList.map((item: any) => item.escrow_code);
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
        
        if (deployResult && deployResult[1].execution_results.length > 0) {
          const executionResult = deployResult[1].execution_results[0];
          
          if (executionResult.result.Success) {
            return {
              success: true,
              deployHash,
              result: executionResult.result.Success
            };
          } else if (executionResult.result.Failure) {
            return {
              success: false,
              deployHash,
              error: executionResult.result.Failure.error_message
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
    async getEscrowInfo(escrowCode: string) {
        // Mock implementation - replace with real contract call
        console.log('Mock getEscrowInfo for:', escrowCode);
        return {
            escrowCode,
            creator: '01234567890abcdef',
            totalAmount: BigInt('50000000000'), // 50 CSPR
            currentAmount: BigInt('30000000000'), // 30 CSPR
            targetAmount: BigInt('50000000000'), // 50 CSPR
            deadline: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
            isActive: true,
            participants: 3,
            maxParticipants: 5,
            description: 'Mock escrow for testing'
        };
    },

    async createEscrow(
        wallet: WalletContext,
        totalAmountMotes: string,
        maxParticipants: number,
        deadline: number,
        description: string,
        passwordHash?: string
    ): Promise<string> {
        // Mock implementation - replace with real contract deployment
        console.log('Mock createEscrow:', {
            totalAmountMotes,
            maxParticipants,
            deadline,
            description,
            passwordHash
        });

        // Simulate deploy hash
        return 'mock_deploy_hash_' + Date.now();
    },

    async joinEscrow(
        wallet: WalletContext,
        escrowCode: string,
        amountMotes: string,
        password?: string
    ): Promise<string> {
        // Mock implementation - replace with real contract call
        console.log('Mock joinEscrow:', {
            escrowCode,
            amountMotes,
            password
        });

        // Simulate deploy hash
        return 'mock_join_hash_' + Date.now();
    },

    async waitForDeploy(deployHash: string): Promise<any> {
        // Mock implementation - replace with real deploy monitoring
        console.log('Mock waitForDeploy:', deployHash);

        // Simulate waiting
        await new Promise(resolve => setTimeout(resolve, 1000));

        return {
            deployHash,
            status: 'success',
            result: {
                escrowCode: 'mock_escrow_' + Date.now()
            }
        };
    }
};