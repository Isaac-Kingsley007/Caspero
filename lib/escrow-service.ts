/**
 * Escrow Service
 * Integrates smart contract calls with Supabase database
 */

import { 
  getEscrowInfo, 
  getParticipantStatus, 
  getUserEscrows,
  createEscrowDeployParams,
  joinEscrowDeployParams,
  withdrawDeployParams,
  cancelEscrowDeployParams,
  waitForDeploy,
  EscrowInfo,
  ParticipantStatus,
  DeployParams
} from './casper-client';
import { 
  supabase, 
  Escrow, 
  Participant,
  getOpenEscrows as getOpenEscrowsFromDB,
  getEscrowByCode as getEscrowByCodeFromDB,
  getUserEscrows as getUserEscrowsFromDB,
  getEscrowParticipants
} from './supabase';
import { SendResult } from '@make-software/csprclick-core-client';

// Types for the service layer
export interface CreateEscrowParams {
  escrowCode: string;
  totalAmount: string;
  splitAmount: string;
  numFriends: number;
  password?: string;
}

export interface JoinEscrowParams {
  escrowCode: string;
  amount: string;
  password?: string;
}

export interface EscrowWithParticipants extends Escrow {
  participants: Participant[];
  completionPercentage: number;
}

// Service class for escrow operations
export class EscrowService {
  
  /**
   * Create a new escrow
   */
  static async createEscrow(
    params: CreateEscrowParams,
    publicKey: string,
    signTransaction: (deployParams: DeployParams) => Promise<SendResult>
  ): Promise<{ success: boolean; deployHash?: string; error?: string }> {
    try {
      // Create the deploy parameters
      const deployParams = createEscrowDeployParams(
        publicKey,
        params.escrowCode,
        params.totalAmount,
        params.splitAmount,
        params.numFriends,
        params.password
      );

      // Sign and send the transaction
      const result = await signTransaction(deployParams);
      
      if (result.deployHash) {
        // Wait for the transaction to be processed
        const deployResult = await waitForDeploy(result.deployHash);
        
        if (deployResult.success) {
          // Sync with database (the event indexer should handle this, but we can also do it manually)
          await this.syncEscrowFromContract(params.escrowCode);
          
          return { success: true, deployHash: result.deployHash };
        } else {
          return { success: false, error: deployResult.error };
        }
      } else {
        return { success: false, error: 'Transaction was not sent' };
      }
    } catch (error) {
      console.error('Error creating escrow:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Join an existing escrow
   */
  static async joinEscrow(
    params: JoinEscrowParams,
    publicKey: string,
    signTransaction: (deployParams: DeployParams) => Promise<SendResult>
  ): Promise<{ success: boolean; deployHash?: string; error?: string }> {
    try {
      // Create the deploy parameters
      const deployParams = joinEscrowDeployParams(
        publicKey,
        params.escrowCode,
        params.amount,
        params.password
      );

      // Sign and send the transaction
      const result = await signTransaction(deployParams);
      
      if (result.deployHash) {
        // Wait for the transaction to be processed
        const deployResult = await waitForDeploy(result.deployHash);
        
        if (deployResult.success) {
          // Sync with database
          await this.syncEscrowFromContract(params.escrowCode);
          await this.syncParticipantFromContract(params.escrowCode, publicKey);
          
          return { success: true, deployHash: result.deployHash };
        } else {
          return { success: false, error: deployResult.error };
        }
      } else {
        return { success: false, error: 'Transaction was not sent' };
      }
    } catch (error) {
      console.error('Error joining escrow:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Withdraw from an escrow
   */
  static async withdrawFromEscrow(
    escrowCode: string,
    publicKey: string,
    signTransaction: (deployParams: DeployParams) => Promise<SendResult>
  ): Promise<{ success: boolean; deployHash?: string; error?: string }> {
    try {
      // Create the deploy parameters
      const deployParams = withdrawDeployParams(publicKey, escrowCode);

      // Sign and send the transaction
      const result = await signTransaction(deployParams);
      
      if (result.deployHash) {
        // Wait for the transaction to be processed
        const deployResult = await waitForDeploy(result.deployHash);
        
        if (deployResult.success) {
          // Sync with database
          await this.syncParticipantFromContract(escrowCode, publicKey);
          
          return { success: true, deployHash: result.deployHash };
        } else {
          return { success: false, error: deployResult.error };
        }
      } else {
        return { success: false, error: 'Transaction was not sent' };
      }
    } catch (error) {
      console.error('Error withdrawing from escrow:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Cancel an escrow (creator only)
   */
  static async cancelEscrow(
    escrowCode: string,
    publicKey: string,
    signTransaction: (deployParams: DeployParams) => Promise<SendResult>
  ): Promise<{ success: boolean; deployHash?: string; error?: string }> {
    try {
      // Create the deploy parameters
      const deployParams = cancelEscrowDeployParams(publicKey, escrowCode);

      // Sign and send the transaction
      const result = await signTransaction(deployParams);
      
      if (result.deployHash) {
        // Wait for the transaction to be processed
        const deployResult = await waitForDeploy(result.deployHash);
        
        if (deployResult.success) {
          // Sync with database
          await this.syncEscrowFromContract(escrowCode);
          
          return { success: true, deployHash: result.deployHash };
        } else {
          return { success: false, error: deployResult.error };
        }
      } else {
        return { success: false, error: 'Transaction was not sent' };
      }
    } catch (error) {
      console.error('Error cancelling escrow:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get all open escrows (from database with fallback to contract)
   */
  static async getOpenEscrows(): Promise<Escrow[]> {
    try {
      // First try to get from database
      const escrows = await getOpenEscrowsFromDB();
      return escrows;
    } catch (error) {
      console.error('Error fetching open escrows:', error);
      return [];
    }
  }

  /**
   * Get escrow details with participants
   */
  static async getEscrowDetails(escrowCode: string): Promise<EscrowWithParticipants | null> {
    try {
      // Get escrow from database
      const escrow = await getEscrowByCodeFromDB(escrowCode);
      if (!escrow) {
        // Try to sync from contract and retry
        await this.syncEscrowFromContract(escrowCode);
        const retryEscrow = await getEscrowByCodeFromDB(escrowCode);
        if (!retryEscrow) return null;
        return this.addParticipantsToEscrow(retryEscrow);
      }

      return this.addParticipantsToEscrow(escrow);
    } catch (error) {
      console.error('Error fetching escrow details:', error);
      return null;
    }
  }

  /**
   * Get user's escrows
   */
  static async getUserEscrows(userKey: string): Promise<Escrow[]> {
    try {
      // Get from database
      const escrows = await getUserEscrowsFromDB(userKey);
      return escrows;
    } catch (error) {
      console.error('Error fetching user escrows:', error);
      return [];
    }
  }

  /**
   * Sync escrow data from contract to database
   */
  private static async syncEscrowFromContract(escrowCode: string): Promise<void> {
    try {
      const contractData = await getEscrowInfo(escrowCode);
      if (!contractData) return;

      // Update or insert escrow in database
      const { error } = await supabase
        .from('escrows')
        .upsert({
          escrow_code: escrowCode,
          creator: contractData.creator,
          total_amount: parseInt(contractData.totalAmount),
          split_amount: parseInt(contractData.splitAmount),
          num_friends: contractData.numFriends,
          joined_count: contractData.joinedCount,
          status: contractData.status,
          accumulated_scspr: parseInt(contractData.accumulatedScspr),
          initial_scspr: parseInt(contractData.initialScspr),
          has_password: contractData.hasPassword,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'escrow_code'
        });

      if (error) {
        console.error('Error syncing escrow to database:', error);
      }
    } catch (error) {
      console.error('Error syncing escrow from contract:', error);
    }
  }

  /**
   * Sync participant data from contract to database
   */
  private static async syncParticipantFromContract(
    escrowCode: string, 
    participantKey: string
  ): Promise<void> {
    try {
      const contractData = await getParticipantStatus(escrowCode, participantKey);
      if (!contractData) return;

      // Update or insert participant in database
      const { error } = await supabase
        .from('participants')
        .upsert({
          escrow_code: escrowCode,
          participant: contractData.account,
          cspr_contributed: parseInt(contractData.csprContributed),
          scspr_received: parseInt(contractData.scsprReceived),
          withdrawn: contractData.withdrawn
        }, {
          onConflict: 'escrow_code,participant'
        });

      if (error) {
        console.error('Error syncing participant to database:', error);
      }
    } catch (error) {
      console.error('Error syncing participant from contract:', error);
    }
  }

  /**
   * Add participants data to escrow
   */
  private static async addParticipantsToEscrow(escrow: Escrow): Promise<EscrowWithParticipants> {
    try {
      const participants = await getEscrowParticipants(escrow.escrow_code);
      const completionPercentage = escrow.num_friends > 0 
        ? (escrow.joined_count / escrow.num_friends) * 100 
        : 0;

      return {
        ...escrow,
        participants,
        completionPercentage
      };
    } catch (error) {
      console.error('Error adding participants to escrow:', error);
      return {
        ...escrow,
        participants: [],
        completionPercentage: 0
      };
    }
  }

  /**
   * Generate a unique escrow code
   */
  static generateEscrowCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Validate escrow code format
   */
  static isValidEscrowCode(code: string): boolean {
    return /^[A-Z0-9]{4,12}$/.test(code);
  }
}