'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import {  
  onAccountChange,
  onConnectionChange,
  SendResult,
  SignResult,
  Account
} from '@make-software/csprclick-core-client';
import { useClickRef } from '@make-software/csprclick-ui';

interface CsprClickContextType {
  isConnected: boolean;
  activeAccount: Account | null;
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
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [balance, setBalance] = useState('0');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {getActiveAccount, getActivePublicKey, signOut, connect, isConnected, send, signMessage} = useClickRef();

  // Initialize connection state
  useEffect(() => {
    const initializeConnection = async () => {
      try {
        setLoading(true);
        const connected = await isConnected();
        setConnected(connected);
        
        if (connected) {
          const account = await getActiveAccount({ withBalance: true });
          const publicKey = await getActivePublicKey();
          
          setActiveAccount(account || null);
          setActiveKey(publicKey || null);
          
          if (account?.balance) {
            setBalance(account.balance.toString());
          }
        }
      } catch (err) {
        console.error('Failed to initialize CSPR.click connection:', err);
        setError(err instanceof Error ? err.message : 'Connection failed');
      } finally {
        setLoading(false);
      }
    };

    initializeConnection();
  }, []);

  // Listen for account changes
  useEffect(() => {
    const unsubscribeAccount = onAccountChange(async (account) => {
      setActiveAccount(account);
      setActiveKey(account?.publicKey || null);
      
      if (account?.balance) {
        setBalance(account.balance.toString());
      } else if (account) {
        await refreshBalance();
      }
    });

    const unsubscribeConnection = onConnectionChange((connected) => {
      setConnected(connected);
      if (!connected) {
        setActiveAccount(null);
        setActiveKey(null);
        setBalance('0');
      }
    });

    return () => {
      unsubscribeAccount();
      unsubscribeConnection();
    };
  }, []);

  const handleConnect = useCallback(async (provider?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await connect(provider || 'casper-wallet');
      
      const account = await getActiveAccount({ withBalance: true });
      const publicKey = await getActivePublicKey();
      
      setConnected(true);
      setActiveAccount(account || null);
      setActiveKey(publicKey || null);
      
      if (account?.balance) {
        setBalance(account.balance.toString());
      }
    } catch (err) {
      console.error('Failed to connect wallet:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    try {
      await signOut();
      setConnected(false);
      setActiveAccount(null);
      setActiveKey(null);
      setBalance('0');
      setError(null);
    } catch (err) {
      console.error('Failed to disconnect wallet:', err);
      setError(err instanceof Error ? err.message : 'Disconnect failed');
    }
  }, []);

  const handleSignTransaction = useCallback(async (deploy: any): Promise<SendResult> => {
    if (!activeKey) {
      throw new Error('No active account');
    }

    try {
      setError(null);
      const result = await sendTransaction({
        deploy,
        signingPublicKey: activeKey,
      });
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMessage);
      throw err;
    }
  }, [activeKey]);

  const handleSignMessage = useCallback(async (message: string): Promise<SignResult> => {
    if (!activeKey) {
      throw new Error('No active account');
    }

    try {
      setError(null);
      const result = await signMessage({
        message,
        signingPublicKey: activeKey,
      });
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Message signing failed';
      setError(errorMessage);
      throw err;
    }
  }, [activeKey]);

  const refreshBalance = useCallback(async () => {
    if (!activeKey) return;

    try {
      const account = await getActiveAccount({ withBalance: true });
      if (account?.balance) {
        setBalance(account.balance.toString());
      }
    } catch (err) {
      console.error('Failed to refresh balance:', err);
    }
  }, [activeKey]);

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