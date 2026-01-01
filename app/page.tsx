'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import EscrowCard from '@/components/ui/EscrowCard';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import JoinEscrowForm from '@/components/forms/JoinEscrowForm';
import EscrowDetails from '@/components/escrow/EscrowDetails';
import { SearchIcon } from '@/components/ui/Icon';

// Sample data - will be replaced with real data from contract/database
const sampleEscrows = [
  {
    escrowCode: 'TRIP2024',
    creator: '0x1234567890abcdef1234567890abcdef12345678',
    totalAmount: '5000000000000',
    splitAmount: '1000000000000',
    joinedCount: 3,
    totalParticipants: 5,
    status: 'Open' as const,
    hasPassword: true,
    createdAt: Date.now() - 86400000 * 2,
    isCreator: false
  },
  {
    escrowCode: 'DINNER',
    creator: '0xabcdef1234567890abcdef1234567890abcdef12',
    totalAmount: '500000000000',
    splitAmount: '100000000000',
    joinedCount: 4,
    totalParticipants: 5,
    status: 'Open' as const,
    hasPassword: false,
    createdAt: Date.now() - 86400000,
    isCreator: false
  },
  {
    escrowCode: 'GIFT',
    creator: '0x7890abcdef1234567890abcdef1234567890abcd',
    totalAmount: '2000000000000',
    splitAmount: '500000000000',
    joinedCount: 2,
    totalParticipants: 4,
    status: 'Open' as const,
    hasPassword: true,
    createdAt: Date.now() - 86400000 * 3,
    isCreator: false
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

export default function Home() {
  const router = useRouter();
  const [escrows] = useState(sampleEscrows);
  const [filter, setFilter] = useState<'all' | 'password' | 'open'>('all');
  const [selectedEscrow, setSelectedEscrow] = useState<typeof sampleEscrows[0] | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const filteredEscrows = escrows.filter(escrow => {
    if (filter === 'password') return escrow.hasPassword;
    if (filter === 'open') return escrow.joinedCount < escrow.totalParticipants;
    return true;
  });

  const handleEscrowClick = (escrow: typeof sampleEscrows[0]) => {
    setSelectedEscrow(escrow);
    setShowDetailsModal(true);
  };

  const handleJoinClick = () => {
    setShowDetailsModal(false);
    setShowJoinModal(true);
  };

  const handleJoinSubmit = async (password?: string) => {
    console.log('Joining escrow:', selectedEscrow?.escrowCode, 'with password:', password);

    // TODO: Integrate with smart contract
    await new Promise(resolve => setTimeout(resolve, 2000));

    alert(`Successfully joined ${selectedEscrow?.escrowCode}!`);
    setShowJoinModal(false);
    setSelectedEscrow(null);
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
          icon={<SearchIcon size="xl" className="text-gray-500" />}
          title="No escrows found"
          description="Try adjusting your filters or check back later for new group escrows."
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
            totalYield="50000000000"
            participants={sampleParticipants}
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
