'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { casperClient } from '@/lib/casper-client';
import EscrowCard from '@/components/ui/EscrowCard';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

import JoinEscrowForm from '@/components/forms/JoinEscrowForm';
import EscrowDetails from '@/components/escrow/EscrowDetails';

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

export default function Home() {
  const router = useRouter();
  const { isConnected, activeKey } = useWallet();
  const [escrows, setEscrows] = useState<EscrowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'password' | 'open'>('all');
  const [selectedEscrow, setSelectedEscrow] = useState<EscrowData | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [participants, setParticipants] = useState<ParticipantData[]>([]);

  // Load escrows on component mount
  useEffect(() => {
    loadEscrows();
  }, []);

  const loadEscrows = async () => {
    setLoading(true);
    try {
      // For now, we'll use mock data since we don't have a global escrow list
      // In production, this would come from an event indexer or backend service
      const mockEscrows: EscrowData[] = [
        {
          escrowCode: 'ESCROW-1234-ABCD',
          creator: 'account-hash-creator1234567890abcdef',
          totalAmount: '1000000000000', // 1000 CSPR
          splitAmount: '250000000000',   // 250 CSPR
          joinedCount: 2,
          totalParticipants: 4,
          status: 'Open',
          hasPassword: true,
          createdAt: Date.now() - 86400000 * 2,
          isCreator: false
        },
        {
          escrowCode: 'ESCROW-5678-EFGH',
          creator: 'account-hash-creator5678901234567890',
          totalAmount: '500000000000',  // 500 CSPR
          splitAmount: '100000000000',  // 100 CSPR
          joinedCount: 4,
          totalParticipants: 5,
          status: 'Open',
          hasPassword: false,
          createdAt: Date.now() - 86400000,
          isCreator: false
        }
      ];

      setEscrows(mockEscrows);
    } catch (error) {
      console.error('Failed to load escrows:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEscrows = escrows.filter(escrow => {
    if (filter === 'password') return escrow.hasPassword;
    if (filter === 'open') return escrow.joinedCount < escrow.totalParticipants;
    return true;
  });

  const handleEscrowClick = async (escrow: EscrowData) => {
    setSelectedEscrow(escrow);

    // Load escrow details from contract
    try {
      const escrowInfo = await casperClient.getEscrowInfo(escrow.escrowCode);

      // Mock participants for now
      const mockParticipants: ParticipantData[] = [
        {
          address: 'account-hash-participant1234567890',
          amount: escrow.splitAmount,
          joinedAt: Date.now() - 86400000,
          withdrawn: false
        }
      ];

      setParticipants(mockParticipants);
    } catch (error) {
      console.error('Failed to load escrow details:', error);
      setParticipants([]);
    }

    setShowDetailsModal(true);
  };

  const handleJoinClick = () => {
    setShowDetailsModal(false);
    setShowJoinModal(true);
  };

  const handleJoinSubmit = async (deployHash: string) => {
    console.log('Join transaction submitted:', deployHash);

    // Show success message
    alert(`Join transaction submitted! Deploy hash: ${deployHash}`);

    // Close modals
    setShowJoinModal(false);
    setSelectedEscrow(null);

    // Refresh escrows list
    loadEscrows();
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold dark:text-gray-100 mb-2">
          Browse Groups
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Discover and join open group escrows
        </p>
      </div>

      {/* Wallet Connection Notice */}
      {!isConnected && (
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-sm text-blue-400">
            Connect your wallet to view and join escrows
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <Button
          variant={filter === 'all' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All Escrows
        </Button>
        <Button
          variant={filter === 'open' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setFilter('open')}
        >
          Open Spots
        </Button>
        <Button
          variant={filter === 'password' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setFilter('password')}
        >
          Password Protected
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
              icon={<span className="text-4xl text-gray-500">🔍</span>}
              title="No escrows found"
              description="Try adjusting your filters or check back later for new group escrows."
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
            totalYield="50000000000"
            participants={participants}
            isParticipant={false}
            canWithdraw={false}
            onJoin={handleJoinClick}
          />
        </Modal>
      )}

      {/* Join Escrow Modal */}
      {selectedEscrow && (
        <Modal
          isOpen={showJoinModal}
          onClose={() => setShowJoinModal(false)}
          title="Join Escrow"
        >
          <JoinEscrowForm
            escrowCode={selectedEscrow.escrowCode}
            splitAmount={selectedEscrow.splitAmount}
            hasPassword={selectedEscrow.hasPassword}
            onSubmit={handleJoinSubmit}
            onCancel={() => setShowJoinModal(false)}
          />
        </Modal>
      )}
    </div>
  );
}
