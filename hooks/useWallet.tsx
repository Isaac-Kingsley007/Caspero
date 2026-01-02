'use client';

import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  ReactNode,
} from 'react';
import { getAccountBalance, formatCSPR } from '@/lib/casper-client';

/* =========================================================
   Types
========================================================= */

interface CasperWalletState {
  isConnected: boolean;
  isLocked: boolean;
  activeKey: string | null;
}

interface CasperWalletProvider {
  requestConnection(): Promise<boolean>;
  disconnectFromSite(): Promise<boolean>;
  getActivePublicKey(): Promise<string>;
  isConnected(): Promise<boolean>;
  signMessage(
    message: string,
    signingPublicKeyHex: string
  ): Promise<{
    cancelled: boolean;
    signatureHex: string;
    signature: Uint8Array;
  }>;
}

declare global {
  interface Window {
    CasperWalletProvider?: () => CasperWalletProvider;
    CasperWalletEventTypes?: {
      Connected: string;
      Disconnected: string;
      ActiveKeyChanged: string;
      Locked: string;
      Unlocked: string;
    };
  }
}

interface WalletContextType {
  isConnected: boolean;
  isLocked: boolean;
  activeKey: string | null;
  balance: bigint;
  formattedBalance: string;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<string | null>;
  signDeploy: (deploy: any) => Promise<any>;
  refreshBalance: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | null>(null);

/* =========================================================
   Provider
========================================================= */

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CasperWalletState>({
    isConnected: false,
    isLocked: true,
    activeKey: null,
  });

  const [balance, setBalance] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getProvider = useCallback((): CasperWalletProvider | null => {
    if (typeof window !== 'undefined' && window.CasperWalletProvider) {
      return window.CasperWalletProvider();
    }
    return null;
  }, []);

  const fetchBalance = useCallback(async (publicKey: string) => {
    try {
      const bal = await getAccountBalance(publicKey);
      setBalance(bal);
    } catch (e) {
      console.error('Balance fetch failed:', e);
      setBalance(0n);
    }
  }, []);

  const checkConnection = useCallback(async () => {
    const provider = getProvider();
    if (!provider) return;

    try {
      const connected = await provider.isConnected();
      if (!connected) return;

      const activeKey = await provider.getActivePublicKey();
      setState({
        isConnected: true,
        isLocked: false,
        activeKey,
      });

      await fetchBalance(activeKey);
    } catch (e) {
      console.error('Connection check failed:', e);
    }
  }, [getProvider, fetchBalance]);

  useEffect(() => {
    checkConnection();

    if (!window.CasperWalletEventTypes) return;

    const events = window.CasperWalletEventTypes;

    const onConnected = () => checkConnection();
    const onDisconnected = () => {
      setState({ isConnected: false, isLocked: true, activeKey: null });
      setBalance(0n);
    };

    const onKeyChanged = () => checkConnection();
    const onLocked = () =>
      setState((s) => ({ ...s, isLocked: true }));
    const onUnlocked = () =>
      setState((s) => ({ ...s, isLocked: false }));

    window.addEventListener(events.Connected, onConnected);
    window.addEventListener(events.Disconnected, onDisconnected);
    window.addEventListener(events.ActiveKeyChanged, onKeyChanged);
    window.addEventListener(events.Locked, onLocked);
    window.addEventListener(events.Unlocked, onUnlocked);

    return () => {
      window.removeEventListener(events.Connected, onConnected);
      window.removeEventListener(events.Disconnected, onDisconnected);
      window.removeEventListener(events.ActiveKeyChanged, onKeyChanged);
      window.removeEventListener(events.Locked, onLocked);
      window.removeEventListener(events.Unlocked, onUnlocked);
    };
  }, [checkConnection]);

  const connect = useCallback(async () => {
    const provider = getProvider();
    if (!provider) {
      setError('Casper Wallet not installed');
      window.open('https://www.casperwallet.io/', '_blank');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const ok = await provider.requestConnection();
      if (ok) await checkConnection();
      return ok;
    } catch (e) {
      setError('Wallet connection failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getProvider, checkConnection]);

  const disconnect = useCallback(async () => {
    const provider = getProvider();
    if (!provider) return;

    try {
      await provider.disconnectFromSite();
    } finally {
      setState({ isConnected: false, isLocked: true, activeKey: null });
      setBalance(0n);
    }
  }, [getProvider]);

  const signMessage = useCallback(
    async (message: string): Promise<string | null> => {
      const provider = getProvider();
      if (!provider || !state.activeKey) {
        setError('Wallet not connected');
        return null;
      }

      try {
        const res = await provider.signMessage(
          message,
          state.activeKey
        );

        if (res.cancelled) return null;

        let sig = res.signatureHex;
        const algoPrefix = state.activeKey.startsWith('01') ? '01' : '02';

        if (!sig.startsWith('01') && !sig.startsWith('02')) {
          sig = algoPrefix + sig;
        }

        return sig;
      } catch (e) {
        console.error('Sign failed:', e);
        setError('Message signing failed');
        return null;
      }
    },
    [getProvider, state.activeKey]
  );

  const signDeploy = useCallback(
    async (deploy: any): Promise<any> => {
      const provider = getProvider();
      if (!provider || !state.activeKey) {
        setError('Wallet not connected');
        return null;
      }

      try {
        // For now, this is a mock implementation
        // In a real implementation, this would sign the deploy using the wallet
        console.log('Mock signDeploy:', deploy);
        return {
          signature: 'mock_signature_' + Date.now(),
          deploy
        };
      } catch (e) {
        console.error('Deploy signing failed:', e);
        setError('Deploy signing failed');
        return null;
      }
    },
    [getProvider, state.activeKey]
  );

  const refreshBalance = useCallback(async () => {
    if (state.activeKey) {
      await fetchBalance(state.activeKey);
    }
  }, [state.activeKey, fetchBalance]);

  const value: WalletContextType = {
    ...state,
    balance,
    formattedBalance: formatCSPR(balance),
    connect,
    disconnect,
    signMessage,
    signDeploy,
    refreshBalance,
    isLoading,
    error,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

/* =========================================================
   Hook
========================================================= */

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error('useWallet must be used inside WalletProvider');
  }
  return ctx;
}

/* =========================================================
   Utils
========================================================= */

export const formatAccountHash = (hash: string): string => {
  if (!hash || hash.length < 20) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
};
