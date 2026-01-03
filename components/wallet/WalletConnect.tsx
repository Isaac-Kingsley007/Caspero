'use client';

import { useState, useRef, useEffect } from 'react';
import { useCsprClick, formatCSPR, formatAccountHash } from '@/hooks/useCsprClick';
import { CASPER_CONFIG, CURRENT_NETWORK } from '@/lib/casper-client';

export default function WalletConnect() {
    const {
        isConnected,
        activeAccount,
        activeKey,
        balance,
        connect,
        disconnect,
        loading,
        error
    } = useCsprClick();

    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const copyAddress = async () => {
        if (activeKey) {
            await navigator.clipboard.writeText(activeKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDisconnect = () => {
        disconnect();
        setIsOpen(false);
    };

    const formattedBalance = formatCSPR(balance);
    const displayAddress = activeKey ? formatAccountHash(activeKey) : '';

    // Show error if wallet connection failed
    if (error && !isConnected) {
        return (
            <div className="flex flex-col items-end space-y-2">
                <div className="text-sm text-red-400 max-w-xs text-right">
                    {error}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => connect()}
                        className="btn btn-primary text-sm"
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    // Connected state - dropdown button
    if (isConnected && activeKey) {
        return (
            <div className="relative" ref={dropdownRef}>
                {/* Trigger Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 hover:border-green-500/30 transition-all duration-200"
                >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center">
                        <span className="text-black text-sm">💳</span>
                    </div>
                    <span className="text-sm font-medium text-green-300 font-mono">
                        {displayAddress}
                    </span>
                    <span className={`text-green-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                        ⌄
                    </span>
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="absolute right-0 mt-2 w-72 rounded-xl bg-gray-900/95 backdrop-blur-xl border border-green-500/20 shadow-2xl shadow-black/50 overflow-hidden z-50">
                        {/* Balance Section */}
                        <div className="p-4 border-b border-green-500/10">
                            <div className="text-xs text-gray-400 mb-1">Balance</div>
                            <div className="text-xl font-bold text-white">
                                {formattedBalance} <span className="text-green-400 text-sm font-normal">CSPR</span>
                            </div>
                        </div>

                        {/* Account Info */}
                        {activeAccount && (
                            <div className="p-4 border-b border-green-500/10">
                                <div className="text-xs text-gray-400 mb-2">Account</div>
                                <div className="text-sm text-gray-300">
                                    {activeAccount.name || 'Unnamed Account'}
                                </div>
                                {activeAccount.brandName && (
                                    <div className="text-xs text-gray-500 mt-1">
                                        via {activeAccount.brandName}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Address Section */}
                        <div className="p-4 border-b border-green-500/10">
                            <div className="text-xs text-gray-400 mb-2">Public Key</div>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 text-xs text-gray-300 bg-black/30 px-2 py-1.5 rounded font-mono truncate">
                                    {activeKey}
                                </code>
                                <button
                                    onClick={copyAddress}
                                    className="p-1.5 rounded-lg hover:bg-green-500/10 transition-colors"
                                    title="Copy public key"
                                >
                                    {copied ? (
                                        <span className="text-green-400">✓</span>
                                    ) : (
                                        <span className="text-gray-400 hover:text-green-300">📋</span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-2">
                            <a
                                href={`${CASPER_CONFIG[CURRENT_NETWORK].explorerUrl}/account/${activeKey}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-green-500/10 rounded-lg transition-colors"
                            >
                                <span>🔗</span>
                                View on Explorer
                            </a>
                            <button
                                onClick={handleDisconnect}
                                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                                <span>🚪</span>
                                Disconnect
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Disconnected state - connect button
    return (
        <div className="flex flex-col items-end gap-1">
            <button
                onClick={() => connect()}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-black font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/25 hover:shadow-green-500/40"
            >
                <span>💳</span>
                {loading ? 'Connecting...' : 'Connect Wallet'}
            </button>
        </div>
    );
}