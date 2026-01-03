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
  const { isConnected, activeKey, signTransaction } = useCsprClick();
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
      const openEscrows = await EscrowService.getOpenEscrows();
      
      // Transform Supabase escrow data to component format
      const transformedEscrows: EscrowData[] = openEscrows.map((escrow: Escrow) => ({
        escrowCode: escrow.escrow_code,
        creator: escrow.creator,
        totalAmount: escrow.total_amount.toString(),
        splitAmount: escrow.split_amount.toString(),
        joinedCount: escrow.joined_count,
        totalParticipants: escrow.num_friends,
        status: escrow.status,
        hasPassword: escrow.has_password,
        createdAt: new Date(escrow.created_at).getTime(),
        isCreator: activeKey ? escrow.creator === activeKey : false
      }));

      setEscrows(transformedEscrows);
    } catch (error) {
      console.error('Failed to load escrows:', error);
      // Fallback to empty array on error
      setEscrows([]);
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

  const handleJoinClick = () => {
    setShowDetailsModal(false);
    setShowJoinModal(true);
  };

  const handleJoinSubmit = async (escrowCode: string, amount: string, password?: string) => {
    if (!activeKey || !signTransaction) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      const result = await EscrowService.joinEscrow(
        { escrowCode, amount, password },
        activeKey,
        signTransaction
      );

      if (result.success) {
        alert(`Join transaction submitted successfully! Deploy hash: ${result.deployHash}`);
        
        // Close modals
        setShowJoinModal(false);
        setSelectedEscrow(null);
        
        // Refresh escrows list
        loadEscrows();
      } else {
        alert(`Failed to join escrow: ${result.error}`);
      }
    } catch (error) {
      console.error('Error joining escrow:', error);
      alert(`Error joining escrow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
            isParticipant={participants.some(p => p.address === activeKey)}
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
