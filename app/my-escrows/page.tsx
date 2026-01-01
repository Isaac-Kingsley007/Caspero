'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import EscrowCard from '@/components/ui/EscrowCard';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import EscrowDetails from '@/components/escrow/EscrowDetails';
import { WalletIcon, AddIcon } from '@/components/ui/Icon';

// Sample data - will be replaced with real data
const sampleMyEscrows = [
    {
        escrowCode: 'MYTRIP',
        creator: '0x1234567890abcdef1234567890abcdef12345678',
        totalAmount: '3000000000000',
        splitAmount: '1000000000000',
        joinedCount: 3,
        totalParticipants: 3,
        status: 'Complete' as const,
        hasPassword: true,
        createdAt: Date.now() - 86400000 * 5,
        isCreator: true
    },
    {
        escrowCode: 'PARTY',
        creator: '0x1234567890abcdef1234567890abcdef12345678',
        totalAmount: '1500000000000',
        splitAmount: '500000000000',
        joinedCount: 2,
        totalParticipants: 3,
        status: 'Open' as const,
        hasPassword: false,
        createdAt: Date.now() - 86400000,
        isCreator: true
    }
];

const sampleParticipants = [
    {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        amount: '1000000000000',
        joinedAt: Date.now() - 86400000,
        withdrawn: false
    },
    {
        address: '0xabcdef1234567890abcdef1234567890abcdef12',
        amount: '1000000000000',
        joinedAt: Date.now() - 43200000,
        withdrawn: false
    }
];

export default function MyEscrows() {
    const router = useRouter();
    const [escrows] = useState(sampleMyEscrows);
    const [filter, setFilter] = useState<'all' | 'created' | 'joined'>('all');
    const [walletConnected] = useState(true);
    const [selectedEscrow, setSelectedEscrow] = useState<typeof sampleMyEscrows[0] | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    const filteredEscrows = escrows.filter(escrow => {
        if (filter === 'created') return escrow.isCreator;
        if (filter === 'joined') return !escrow.isCreator;
        return true;
    });

    const handleEscrowClick = (escrow: typeof sampleMyEscrows[0]) => {
        setSelectedEscrow(escrow);
        setShowDetailsModal(true);
    };

    const handleWithdraw = async () => {
        console.log('Withdrawing from:', selectedEscrow?.escrowCode);
        await new Promise(resolve => setTimeout(resolve, 2000));
        alert('Withdrawal successful!');
        setShowDetailsModal(false);
    };

    const handleCancel = async () => {
        console.log('Cancelling:', selectedEscrow?.escrowCode);
        await new Promise(resolve => setTimeout(resolve, 2000));
        alert('Escrow cancelled!');
        setShowDetailsModal(false);
    };

    if (!walletConnected) {
        return (
            <div>
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-100 mb-2">
                        My Escrows
                    </h1>
                    <p className="text-gray-400">
                        Manage your active and completed escrows
                    </p>
                </div>
                <EmptyState
                    icon={<WalletIcon size="xl" className="text-gray-500" />}
                    title="Wallet not connected"
                    description="Connect your wallet to view and manage your escrows."
                    actionLabel="Connect Wallet"
                    onAction={() => console.log('Connect wallet')}
                />
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-100 mb-2">
                        My Escrows
                    </h1>
                    <p className="text-gray-400">
                        Manage your active and completed escrows
                    </p>
                </div>
                <Button variant="primary" onClick={() => router.push('/create')}>
                    <AddIcon size="sm" className="mr-2" />
                    Create Escrow
                </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-3 mb-6">
                <Button
                    variant={filter === 'all' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('all')}
                >
                    All
                </Button>
                <Button
                    variant={filter === 'created' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('created')}
                >
                    Created by Me
                </Button>
                <Button
                    variant={filter === 'joined' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('joined')}
                >
                    Joined
                </Button>
            </div>

            {/* Escrow Grid */}
            {filteredEscrows.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEscrows.map((escrow) => (
                        <EscrowCard
                            key={escrow.escrowCode}
                            {...escrow}
                            onClick={() => handleEscrowClick(escrow)}
                        />
                    ))}
                </div>
            ) : (
                <EmptyState
                    icon={<AddIcon size="xl" className="text-gray-500" />}
                    title="No escrows yet"
                    description="Create your first group escrow to start pooling funds with friends."
                    actionLabel="Create Escrow"
                    onAction={() => router.push('/create')}
                />
            )}

            {/* Escrow Details Modal */}
            {selectedEscrow && (
                <Modal
                    isOpen={showDetailsModal}
                    onClose={() => {
                        setShowDetailsModal(false);
                        setSelectedEscrow(null);
                    }}
                    title="Escrow Details"
                    size="lg"
                >
                    <EscrowDetails
                        {...selectedEscrow}
                        totalYield="75000000000"
                        participants={sampleParticipants}
                        isParticipant={true}
                        canWithdraw={selectedEscrow.status === 'Complete'}
                        onWithdraw={selectedEscrow.status === 'Complete' ? handleWithdraw : undefined}
                        onCancel={selectedEscrow.status === 'Open' && selectedEscrow.isCreator ? handleCancel : undefined}
                    />
                </Modal>
            )}
        </div>
    );
}
