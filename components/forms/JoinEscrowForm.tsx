'use client';

import { useState } from 'react';
import { useCsprClick, formatCSPR } from '@/hooks/useCsprClick';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { InfoIcon } from '@/components/ui/Icon';
interface JoinEscrowFormProps {
    escrowCode: string;
    splitAmount: string;
    hasPassword: boolean;
    onSubmit: (escrowCode: string, amount: string, password?: string) => void;
    onCancel: () => void;
}

export default function JoinEscrowForm({
    escrowCode,
    splitAmount,
    hasPassword,
    onSubmit,
    onCancel
}: JoinEscrowFormProps) {
    const { isConnected, activeKey } = useCsprClick();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isConnected) {
            setError('Please connect your wallet first');
            return;
        }

        if (hasPassword && !password) {
            setError('Password is required');
            return;
        }

        if (!activeKey) {
            setError('Wallet not connected or no active key');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Call the parent's onSubmit with the form data
            // The parent will handle the actual transaction
            await onSubmit(escrowCode, splitAmount, hasPassword ? password : undefined);
        } catch (error) {
            console.error('Failed to join escrow:', error);
            setError(error instanceof Error ? error.message : 'Failed to join escrow. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Wallet Connection Check */}
            {!isConnected && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-sm text-yellow-400">Please connect your wallet to join this escrow</p>
                </div>
            )}

            {/* Deploy Status */}
            {loading && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-sm text-blue-400">Processing transaction...</p>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}

            {/* Escrow Info */}
            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                <div className="space-y-3">
                    <div>
                        <p className="text-sm text-gray-400">Escrow Code</p>
                        <p className="text-lg font-bold text-gray-100">{escrowCode}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-400">Your contribution</p>
                        <p className="text-2xl font-bold text-green-400">
                            {formatCSPR(splitAmount)} CSPR
                        </p>
                    </div>
                </div>
            </div>

            {/* Password Input */}
            {hasPassword && (
                <Input
                    label="Password"
                    type="password"
                    placeholder="Enter escrow password"
                    value={password}
                    onChange={(e) => {
                        setPassword(e.target.value);
                        setError('');
                    }}
                    error={error && hasPassword && !password ? error : ''}
                    helperText="This escrow is password protected"
                    disabled={loading}
                />
            )}

            {/* Info Message */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-400 flex items-start gap-2">
                    <InfoIcon size="sm" className="mt-0.5 shrink-0" />
                    Your CSPR will be staked to earn yield while the escrow is active.
                    You can withdraw your share plus proportional yield once the escrow is complete.
                </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={loading}
                    fullWidth
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    variant="primary"
                    loading={loading}
                    disabled={!isConnected}
                    fullWidth
                >
                    {loading ? 'Joining...' : `Join & Stake ${formatCSPR(splitAmount)} CSPR`}
                </Button>
            </div>
        </form>
    );
}
