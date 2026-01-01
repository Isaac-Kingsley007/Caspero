'use client';

import { useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { InfoIcon } from '@/components/ui/Icon';

interface JoinEscrowFormProps {
    escrowCode: string;
    splitAmount: string;
    hasPassword: boolean;
    onSubmit: (password?: string) => void;
    onCancel: () => void;
}

export default function JoinEscrowForm({
    escrowCode,
    splitAmount,
    hasPassword,
    onSubmit,
    onCancel
}: JoinEscrowFormProps) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const formatCSPR = (motes: string) => {
        return (Number(motes) / 1e9).toFixed(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (hasPassword && !password) {
            setError('Password is required');
            return;
        }

        setLoading(true);
        try {
            await onSubmit(hasPassword ? password : undefined);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
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
                    error={error}
                    helperText="This escrow is password protected"
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
                    fullWidth
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    variant="primary"
                    loading={loading}
                    fullWidth
                >
                    Join & Stake {formatCSPR(splitAmount)} CSPR
                </Button>
            </div>
        </form>
    );
}
