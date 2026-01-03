'use client';

import { useState, useEffect } from 'react';
import { useCsprClick } from '@/hooks/useCsprClick';
import { supabase } from '@/lib/supabase';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import Icon from '@/components/ui/Icon';
import { formatCSPR } from '@/hooks/useCsprClick';

interface HistoryItem {
    id: string;
    type: 'create' | 'join' | 'withdraw' | 'cancel';
    escrowCode: string;
    amount: string;
    timestamp: number;
    status: 'Open' | 'Complete' | 'Cancelled';
    deployHash?: string;
}

export default function History() {
    const { isConnected, activeKey } = useCsprClick();
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Load user's transaction history
    useEffect(() => {
        if (isConnected && activeKey) {
            loadHistory();
        }
    }, [isConnected, activeKey]);

    const loadHistory = async () => {
        if (!activeKey) return;
        
        setLoading(true);
        try {
            // Get events related to this user
            const { data: events, error } = await supabase
                .from('events')
                .select('*')
                .or(`data->>creator.eq.${activeKey},data->>participant.eq.${activeKey}`)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error('Error loading history:', error);
                setHistory([]);
                return;
            }

            // Transform events to history items
            const historyItems: HistoryItem[] = events.map(event => {
                const eventData = event.data as any;
                let type: HistoryItem['type'] = 'join';
                let amount = '0';

                switch (event.event_type) {
                    case 'EscrowCreated':
                        type = 'create';
                        amount = eventData.total_amount || '0';
                        break;
                    case 'ParticipantJoined':
                        type = 'join';
                        amount = eventData.amount || '0';
                        break;
                    case 'WithdrawalMade':
                        type = 'withdraw';
                        amount = eventData.amount || '0';
                        break;
                    case 'EscrowCancelled':
                        type = 'cancel';
                        amount = eventData.total_amount || '0';
                        break;
                }

                return {
                    id: event.id,
                    type,
                    escrowCode: event.escrow_code || 'Unknown',
                    amount,
                    timestamp: new Date(event.created_at).getTime(),
                    status: eventData.status || 'Open',
                    deployHash: event.transaction_hash
                };
            });

            setHistory(historyItems);
        } catch (error) {
            console.error('Failed to load history:', error);
            setHistory([]);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getActionLabel = (type: string) => {
        const labels = {
            create: 'Created Escrow',
            join: 'Joined Escrow',
            withdraw: 'Withdrew Funds',
            cancel: 'Cancelled Escrow'
        };
        return labels[type as keyof typeof labels] || type;
    };

    const getActionIcon = (type: string) => {
        const icons = {
            create: 'add_circle',
            join: 'group_add',
            withdraw: 'account_balance_wallet',
            cancel: 'cancel'
        };
        return icons[type as keyof typeof icons] || 'description';
    };

    if (!isConnected) {
        return (
            <div>
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-100 mb-2">
                        History
                    </h1>
                    <p className="text-gray-400">
                        View your past transactions and escrow activity
                    </p>
                </div>
                <EmptyState
                    icon={<Icon name="account_balance_wallet" size="xl" className="text-gray-500" />}
                    title="Wallet not connected"
                    description="Connect your wallet to view your transaction history."
                />
            </div>
        );
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-100 mb-2">
                    History
                </h1>
                <p className="text-gray-400">
                    View your past transactions and escrow activity
                </p>
            </div>

            {loading ? (
                <div className="card">
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="animate-pulse">
                                <div className="flex items-center justify-between py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
                                        <div>
                                            <div className="h-4 bg-gray-700 rounded w-32 mb-2"></div>
                                            <div className="h-3 bg-gray-700 rounded w-24"></div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="h-4 bg-gray-700 rounded w-20 mb-2"></div>
                                        <div className="h-3 bg-gray-700 rounded w-16"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : history.length > 0 ? (
                <div className="card">
                    <div className="space-y-4">
                        {history.map((item, index) => (
                            <div key={item.id}>
                                <div className="flex items-center justify-between py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
                                            <Icon name={getActionIcon(item.type)} className="text-gray-400" />
                                        </div>
                                        <div>
                                            <p className="text-base font-medium text-gray-100">
                                                {getActionLabel(item.type)}
                                            </p>
                                            <p className="text-sm text-gray-400">
                                                {item.escrowCode} • {formatDate(item.timestamp)}
                                            </p>
                                            {item.deployHash && (
                                                <p className="text-xs text-gray-500 font-mono">
                                                    {item.deployHash.slice(0, 16)}...
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-4">
                                        <div>
                                            <p className="text-base font-bold text-gray-100">
                                                {formatCSPR(item.amount)} CSPR
                                            </p>
                                            <StatusBadge status={item.status} size="sm" />
                                        </div>
                                    </div>
                                </div>
                                {index < history.length - 1 && (
                                    <div className="border-t border-gray-800" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <EmptyState
                    icon={<Icon name="history" size="xl" className="text-gray-500" />}
                    title="No history yet"
                    description="Your transaction history will appear here once you start using escrows."
                />
            )}
        </div>
    );
}
