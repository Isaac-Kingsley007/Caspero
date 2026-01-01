'use client';

import StatusBadge from '@/components/ui/StatusBadge';
import ProgressBar from '@/components/ui/ProgressBar';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';

interface Participant {
    address: string;
    amount: string;
    joinedAt: number;
    withdrawn: boolean;
}

interface EscrowDetailsProps {
    escrowCode: string;
    creator: string;
    totalAmount: string;
    splitAmount: string;
    joinedCount: number;
    totalParticipants: number;
    status: 'Open' | 'Complete' | 'Cancelled';
    hasPassword: boolean;
    createdAt: number;
    completedAt?: number;
    totalYield?: string;
    participants: Participant[];
    isCreator: boolean;
    isParticipant: boolean;
    canWithdraw: boolean;
    onJoin?: () => void;
    onWithdraw?: () => void;
    onCancel?: () => void;
}

export default function EscrowDetails({
    escrowCode,
    creator,
    totalAmount,
    splitAmount,
    joinedCount,
    totalParticipants,
    status,
    hasPassword,
    createdAt,
    completedAt,
    totalYield = '0',
    participants,
    isCreator,
    isParticipant,
    canWithdraw,
    onJoin,
    onWithdraw,
    onCancel
}: EscrowDetailsProps) {
    const formatCSPR = (motes: string) => {
        return (Number(motes) / 1e9).toFixed(2);
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatAddress = (address: string) => {
        return `${address.slice(0, 8)}...${address.slice(-6)}`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-100 mb-2">{escrowCode}</h2>
                    <p className="text-sm text-gray-400">
                        Created {formatDate(createdAt)}
                        {completedAt && ` • Completed ${formatDate(completedAt)}`}
                    </p>
                </div>
                <StatusBadge status={status} />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">Total Pool</p>
                    <p className="text-xl font-bold text-gray-100">
                        {formatCSPR(totalAmount)} CSPR
                    </p>
                </div>
                <div className="p-4 bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">Per Person</p>
                    <p className="text-xl font-bold text-gray-100">
                        {formatCSPR(splitAmount)} CSPR
                    </p>
                </div>
                <div className="p-4 bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">Participants</p>
                    <p className="text-xl font-bold text-gray-100">
                        {joinedCount}/{totalParticipants}
                    </p>
                </div>
                <div className="p-4 bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">Total Yield</p>
                    <p className="text-xl font-bold text-green-400">
                        {formatCSPR(totalYield)} CSPR
                    </p>
                </div>
            </div>

            {/* Progress */}
            {status === 'Open' && (
                <ProgressBar current={joinedCount} total={totalParticipants} />
            )}

            {/* Details */}
            <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-800">
                    <span className="text-gray-400">Creator</span>
                    <span className="text-gray-100 font-mono">
                        {formatAddress(creator)}
                        {isCreator && <span className="ml-2 text-green-400">(You)</span>}
                    </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-800">
                    <span className="text-gray-400">Password Protected</span>
                    <span className="text-gray-100 flex items-center gap-2">
                        {hasPassword ? (
                            <>
                                <Icon name="lock" size="sm" />
                                Yes
                            </>
                        ) : (
                            <>
                                <Icon name="lock_open" size="sm" />
                                No
                            </>
                        )}
                    </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-800">
                    <span className="text-gray-400">Status</span>
                    <StatusBadge status={status} size="sm" />
                </div>
            </div>

            {/* Participants List */}
            <div>
                <h3 className="text-lg font-semibold text-gray-100 mb-4">Participants</h3>
                <div className="space-y-2">
                    {participants.map((participant, index) => (
                        <div
                            key={participant.address}
                            className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 font-bold">
                                    {index + 1}
                                </div>
                                <div>
                                    <p className="text-sm font-mono text-gray-100">
                                        {formatAddress(participant.address)}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        Joined {formatDate(participant.joinedAt)}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-gray-100">
                                    {formatCSPR(participant.amount)} CSPR
                                </p>
                                {participant.withdrawn && (
                                    <p className="text-xs text-green-400 flex items-center gap-1">
                                        <Icon name="check" size="sm" />
                                        Withdrawn
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-800">
                {status === 'Open' && !isParticipant && onJoin && (
                    <Button variant="primary" onClick={onJoin} fullWidth>
                        Join Escrow
                    </Button>
                )}
                {status === 'Complete' && isParticipant && canWithdraw && onWithdraw && (
                    <Button variant="primary" onClick={onWithdraw} fullWidth>
                        Withdraw Funds + Yield
                    </Button>
                )}
                {status === 'Open' && isCreator && onCancel && (
                    <Button variant="outline" onClick={onCancel} fullWidth>
                        Cancel Escrow
                    </Button>
                )}
            </div>
        </div>
    );
}
