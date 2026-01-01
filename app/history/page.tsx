'use client';

import { useState } from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import Icon from '@/components/ui/Icon';

interface HistoryItem {
    id: string;
    type: 'create' | 'join' | 'withdraw' | 'cancel';
    escrowCode: string;
    amount: string;
    timestamp: number;
    status: 'Open' | 'Complete' | 'Cancelled';
}

// Sample data
const sampleHistory: HistoryItem[] = [
    {
        id: '1',
        type: 'withdraw',
        escrowCode: 'MYTRIP',
        amount: '1050000000000',
        timestamp: Date.now() - 86400000,
        status: 'Complete'
    },
    {
        id: '2',
        type: 'create',
        escrowCode: 'PARTY',
        amount: '1500000000000',
        timestamp: Date.now() - 86400000 * 2,
        status: 'Open'
    },
    {
        id: '3',
        type: 'join',
        escrowCode: 'TRIP2024',
        amount: '1000000000000',
        timestamp: Date.now() - 86400000 * 3,
        status: 'Open'
    }
];

export default function History() {
    const [history] = useState(sampleHistory);
    const [walletConnected] = useState(true);

    const formatCSPR = (motes: string) => {
        return (Number(motes) / 1e9).toFixed(2);
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

    if (!walletConnected) {
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

            {history.length > 0 ? (
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
