'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { useClickRef } from '@make-software/csprclick-ui';
import type { 
  SendResult, 
  SignResult, 
  AccountType 
} from '@make-software/csprclick-core-types';

interface CsprClickContextType {
  isConnected: boolean;
  activeAccount: AccountType | null;
  activeKey: string | null;
  balance: string;
  loading: boolean;
  error: string | null;
  connect: (provider?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  signTransaction: (deploy: any) => Promise<SendResult>;
  signMessage: (message: string) => Promise<SignResult>;
  refreshBalance: () => Promise<void>;
}

const CsprClickContext = createContext<CsprClickContextType | null>(null);

export function CsprClickProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [activeAccount, setActiveAccount] = useState<AccountType | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [balance, setBalance] = useState('0');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clickRef = useClickRef();

  // Initialize connection state
  useEffect(() => {
    const initializeConnection = async () => {
      if (!clickRef) return;
      
      try {
        setLoading(true);
        
        // Check if there's an active account
        const account = clickRef.getActiveAccount();
        const publicKey = await clickRef.getActivePublicKey();
        
        if (account && publicKey) {
          setConnected(true);
          setActiveAccount(account);
          setActiveKey(publicKey);
          
          // Get balance if available
          if (account.balance) {
            setBalance(account.balance.toString());
          }
        } else {
          setConnected(false);
          setActiveAccount(null);
          setActiveKey(null);
          setBalance('0');
        }
      } catch (err) {
        console.error('Failed to initialize CSPR.click connection:', err);
        setError(err instanceof Error ? err.message : 'Connection failed');
        setConnected(false);
      } finally {
        setLoading(false);
      }
    };

    initializeConnection();
  }, [clickRef]);

  // Listen for CSPR.click events
  useEffect(() => {
    if (!clickRef) return;

    const handleSignedIn = async (evt: any) => {
      console.log('Signed in event:', evt);
      const account = clickRef.getActiveAccount();
      const publicKey = await clickRef.getActivePublicKey();
      
      setConnected(true);
      setActiveAccount(account);
      setActiveKey(publicKey || null);
      setError(null);
      
      if (account?.balance) {
        setBalance(account.balance.toString());
      }
    };

    const handleSignedOut = () => {
      console.log('Signed out event');
      setConnected(false);
      setActiveAccount(null);
      setActiveKey(null);
      setBalance('0');
      setError(null);
    };

    const handleSwitchedAccount = async (evt: any) => {
      console.log('Switched account event:', evt);
      const account = clickRef.getActiveAccount();
      const publicKey = await clickRef.getActivePublicKey();
      
      setActiveAccount(account);
      setActiveKey(publicKey || null);
      
      if (account?.balance) {
        setBalance(account.balance.toString());
      }
    };

    const handleDisconnected = (evt: any) => {
      console.log('Disconnected event:', evt);
      setConnected(false);
      setActiveAccount(null);
      setActiveKey(null);
      setBalance('0');
    };

    // Bind event listeners
    clickRef.on('csprclick:signed_in', handleSignedIn);
    clickRef.on('csprclick:signed_out', handleSignedOut);
    clickRef.on('csprclick:switched_account', handleSwitchedAccount);
    clickRef.on('csprclick:disconnected', handleDisconnected);

    // Cleanup function
    return () => {
      clickRef.off('csprclick:signed_in', handleSignedIn);
      clickRef.off('csprclick:signed_out', handleSignedOut);
      clickRef.off('csprclick:switched_account', handleSwitchedAccount);
      clickRef.off('csprclick:disconnected', handleDisconnected);
    };
  }, [clickRef]);

  const handleConnect = useCallback(async (provider?: string) => {
    if (!clickRef) {
      setError('CSPR.click not initialized');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Use signIn to show the wallet selector
      await clickRef.signIn();
      
      // The event handlers will update the state when connection is successful
    } catch (err) {
      console.error('Failed to connect wallet:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  }, [clickRef]);

  const handleDisconnect = useCallback(async () => {
    if (!clickRef) return;

    try {
      clickRef.signOut();
      // The event handlers will update the state
    } catch (err) {
      console.error('Failed to disconnect wallet:', err);
      setError(err instanceof Error ? err.message : 'Disconnect failed');
    }
  }, [clickRef]);

  const handleSignTransaction = useCallback(async (deploy: any): Promise<SendResult> => {
    if (!clickRef || !activeKey) {
      throw new Error('No active account');
    }

    try {
      setError(null);
      
      // Use the send method with proper parameters
      const result = await clickRef.send(
        {
          deploy,
          signingPublicKey: activeKey,
        },
        '', // targetPublicKey (empty string for default)
        (statusUpdate: any) => {
          console.log('Transaction status:', statusUpdate);
        }
      );
      
      if (!result) {
        throw new Error('Transaction failed - no result returned');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMessage);
      throw err;
    }
  }, [clickRef, activeKey]);

  const handleSignMessage = useCallback(async (message: string): Promise<SignResult> => {
    if (!clickRef || !activeKey) {
      throw new Error('No active account');
    }

    try {
      setError(null);
      
      const result = await clickRef.signMessage(message, activeKey);
      
      if (!result) {
        throw new Error('Message signing failed - no result returned');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Message signing failed';
      setError(errorMessage);
      throw err;
    }
  }, [clickRef, activeKey]);

  const refreshBalance = useCallback(async () => {
    if (!clickRef || !activeKey) return;

    try {
      // Get fresh account data
      const account = clickRef.getActiveAccount();
      if (account?.balance) {
        setBalance(account.balance.toString());
      }
    } catch (err) {
      console.error('Failed to refresh balance:', err);
    }
  }, [clickRef, activeKey]);

  const contextValue: CsprClickContextType = {
    isConnected: connected,
    activeAccount,
    activeKey,
    balance,
    loading,
    error,
    connect: handleConnect,
    disconnect: handleDisconnect,
    signTransaction: handleSignTransaction,
    signMessage: handleSignMessage,
    refreshBalance,
  };

  return (
    <CsprClickContext.Provider value={contextValue}>
      {children}
    </CsprClickContext.Provider>
  );
}

export function useCsprClick() {
  const context = useContext(CsprClickContext);
  if (!context) {
    throw new Error('useCsprClick must be used within a CsprClickProvider');
  }
  return context;
}

// Utility functions for CSPR formatting
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