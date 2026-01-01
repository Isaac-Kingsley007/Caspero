import StatusBadge from './StatusBadge';
import ProgressBar from './ProgressBar';
import Icon from './Icon';

interface EscrowCardProps {
    escrowCode: string;
    totalAmount: string;
    splitAmount: string;
    joinedCount: number;
    totalParticipants: number;
    status: 'Open' | 'Complete' | 'Cancelled';
    hasPassword: boolean;
    createdAt: number;
    isCreator?: boolean;
    onClick?: () => void;
}

export default function EscrowCard({
    escrowCode,
    totalAmount,
    splitAmount,
    joinedCount,
    totalParticipants,
    status,
    hasPassword,
    createdAt,
    isCreator = false,
    onClick
}: EscrowCardProps) {
    const formatCSPR = (motes: string) => {
        return (Number(motes) / 1e9).toFixed(2);
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div
            className={`
        bg-gray-900 border border-gray-800 rounded-xl p-6 
        shadow-sm hover:shadow-md transition-all duration-200
        ${onClick ? 'cursor-pointer hover:border-green-500/50' : ''}
      `}
            onClick={onClick}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-100 mb-1">
                        {escrowCode}
                    </h3>
                    <p className="text-sm text-gray-400">
                        {formatDate(createdAt)}
                    </p>
                </div>
                <StatusBadge status={status} />
            </div>

            {/* Amount Info */}
            <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Total Pool</span>
                    <span className="text-base font-bold text-gray-100">
                        {formatCSPR(totalAmount)} CSPR
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Per Person</span>
                    <span className="text-base font-medium text-gray-300">
                        {formatCSPR(splitAmount)} CSPR
                    </span>
                </div>
            </div>

            {/* Progress */}
            {status === 'Open' && (
                <div className="mb-4">
                    <ProgressBar
                        current={joinedCount}
                        total={totalParticipants}
                    />
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                <div className="flex items-center gap-3 text-xs text-gray-400">
                    {hasPassword && (
                        <span className="flex items-center gap-1">
                            <Icon name="lock" size="sm" />
                            Password
                        </span>
                    )}
                    {isCreator && (
                        <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded">
                            Creator
                        </span>
                    )}
                </div>
                {status === 'Open' && joinedCount < totalParticipants && (
                    <span className="text-xs text-green-400 font-medium">
                        {totalParticipants - joinedCount} spots left
                    </span>
                )}
            </div>
        </div>
    );
}