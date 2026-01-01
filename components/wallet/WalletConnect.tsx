'use client';

import { useState } from 'react';
import Icon from '@/components/ui/Icon';

export default function WalletConnect() {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);

    const handleConnect = async () => {
        setIsConnecting(true);

        try {
            // TODO: Implement actual Casper wallet connection
            // For now, simulate connection
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Mock wallet address
            const mockAddress = 'account-hash-0123...abcd';
            setWalletAddress(mockAddress);
            setIsConnected(true);
        } catch (error) {
            console.error('Failed to connect wallet:', error);
        } finally {
            setIsConnecting(false);
        }
    };

    const handleDisconnect = () => {
        setIsConnected(false);
        setWalletAddress(null);
    };

    const formatAddress = (address: string) => {
        if (address.length <= 20) return address;
        return `${address.slice(0, 10)}...${address.slice(-8)}`;
    };

    if (isConnected && walletAddress) {
        return (
            <div className="flex items-center space-x-3">
                {/* Wallet Info */}
                <div className="hidden sm:flex items-center space-x-2 px-4 py-2 rounded-lg bg-background-card border border-border">
                    <div className="w-2 h-2 bg-success rounded-full" />
                    <span className="text-sm text-text-primary font-medium">
                        {formatAddress(walletAddress)}
                    </span>
                </div>

                {/* Disconnect Button */}
                <button
                    onClick={handleDisconnect}
                    className="btn btn-ghost text-sm"
                >
                    Disconnect
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="btn btn-primary relative"
        >
            {isConnecting ? (
                <>
                    <span className="spinner w-5 h-5 mr-2" />
                    Connecting...
                </>
            ) : (
                <>
                    <Icon name="link" className="mr-2" size="sm" />
                    Connect Wallet
                </>
            )}
        </button>
    );
}
