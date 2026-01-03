'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCsprClick } from '@/hooks/useCsprClick';
import { EscrowService } from '@/lib/escrow-service';
import { Escrow } from '@/lib/supabase';
import EscrowCard from '@/components/ui/EscrowCard';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import EscrowDetails from '@/components/escrow/EscrowDetails';
import { WalletIcon, AddIcon } from '@/components/ui/Icon';

interface EscrowData {
    escrowCode: string;
    creator: string;
    totalAmount: string;
    splitAmount: string;
    joinedCount: number;
    totalParticipants: number;
    status: 'Open' | 'Complete' | 'Cancelled';
    hasPassword: boolean;
    createdAt: number;
    isCreator: boolean;
}

interface ParticipantData {
    address: string;
    amount: string;
    joinedAt: number;
    withdrawn: boolean;
}

export default function MyEscrows() {
    const router = useRouter();
    const { isConnected, activeKey, signTransaction } = useCsprClick();
    const [escrows, setEscrows] = useState<EscrowData[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'created' | 'joined'>('all');
    const [selectedEscrow, setSelectedEscrow] = useState<EscrowData | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [participants, setParticipants] = useState<ParticipantData[]>([]);

    // Load user's escrows
    useEffect(() => {
        if (isConnected && activeKey) {
            loadUserEscrows();
        }
    }, [isConnected, activeKey]);

    const loadUserEscrows = async () => {
        if (!activeKey) return;
        
        setLoading(true);
        try {
            const userEscrows = await EscrowService.getUserEscrows(activeKey);
            
            // Transform Supabase escrow data to component format
            const transformedEscrows: EscrowData[] = userEscrows.map((escrow: Escrow) => ({
                escrowCode: escrow.escrow_code,
                creator: escrow.creator,
                totalAmount: escrow.total_amount.toString(),
                splitAmount: escrow.split_amount.toString(),
                joinedCount: escrow.joined_count,
                totalParticipants: escrow.num_friends,
                status: escrow.status,
                hasPassword: escrow.has_password,
                createdAt: new Date(escrow.created_at).getTime(),
                isCreator: escrow.creator === activeKey
            }));

            setEscrows(transformedEscrows);
        } catch (error) {
            console.error('Failed to load user escrows:', error);
            setEscrows([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredEscrows = escrows.filter(escrow => {
        if (filter === 'created') return escrow.isCreator;
        if (filter === 'joined') return !escrow.isCreator;
        return true;
    });

    const handleEscrowClick = async (escrow: EscrowData) => {
        setSelectedEscrow(escrow);

        // Load escrow details with participants
        try {
            const escrowDetails = await EscrowService.getEscrowDetails(escrow.escrowCode);
            
            if (escrowDetails) {
                // Transform participants data
                const transformedParticipants: ParticipantData[] = escrowDetails.participants.map(p => ({
                    address: p.participant,
                    amount: p.cspr_contributed.toString(),
                    joinedAt: new Date(p.joined_at).getTime(),
                    withdrawn: p.withdrawn
                }));

                setParticipants(transformedParticipants);
            } else {
                setParticipants([]);
            }
        } catch (error) {
            console.error('Failed to load escrow details:', error);
            setParticipants([]);
        }

        setShowDetailsModal(true);
    };

    const handleWithdraw = async () => {
        if (!selectedEscrow || !activeKey || !signTransaction) {
            alert('Please connect your wallet first');
            return;
        }

        try {
            const result = await EscrowService.withdrawFromEscrow(
                selectedEscrow.escrowCode,
                activeKey,
                signTransaction
            );

            if (result.success) {
                alert(`Withdrawal successful! Deploy hash: ${result.deployHash}`);
                setShowDetailsModal(false);
                loadUserEscrows(); // Refresh the list
            } else {
                alert(`Failed to withdraw: ${result.error}`);
            }
        } catch (error) {
            console.error('Error withdrawing from escrow:', error);
            alert(`Error withdrawing: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleCancel = async () => {
        if (!selectedEscrow || !activeKey || !signTransaction) {
            alert('Please connect your wallet first');
            return;
        }

        try {
            const result = await EscrowService.cancelEscrow(
                selectedEscrow.escrowCode,
                activeKey,
                signTransaction
            );

            if (result.success) {
                alert(`Escrow cancelled successfully! Deploy hash: ${result.deployHash}`);
                setShowDetailsModal(false);
                loadUserEscrows(); // Refresh the list
            } else {
                alert(`Failed to cancel escrow: ${result.error}`);
            }
        } catch (error) {
            console.error('Error cancelling escrow:', error);
            alert(`Error cancelling escrow: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    if (!isConnected) {
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

            {/* Loading State */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                            <div className="bg-gray-800 rounded-lg h-48"></div>
                        </div>
                    ))}
                </div>
            ) : (
                <>
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
                </>
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
                        participants={participants}
                        isParticipant={participants.some(p => p.address === activeKey)}
                        canWithdraw={selectedEscrow.status === 'Complete' && participants.some(p => p.address === activeKey && !p.withdrawn)}
                        onWithdraw={selectedEscrow.status === 'Complete' ? handleWithdraw : undefined}
                        onCancel={selectedEscrow.status === 'Open' && selectedEscrow.isCreator ? handleCancel : undefined}
                    />
                </Modal>
            )}
        </div>
    );
}
