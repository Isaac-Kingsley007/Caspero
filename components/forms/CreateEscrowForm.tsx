'use client';

import { useState } from 'react';
import { useCsprClick, parseCSPR } from '@/hooks/useCsprClick';
import { EscrowService } from '@/lib/escrow-service';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Icon from '../ui/Icon';

interface CreateEscrowFormProps {
    onSubmit: (escrowCode: string) => void;
    onCancel: () => void;
}

export interface CreateEscrowData {
    totalAmount: string;
    numParticipants: number;
    password?: string;
}

export default function CreateEscrowForm({ onSubmit, onCancel }: CreateEscrowFormProps) {
    const { isConnected, activeKey, signTransaction } = useCsprClick();
    const [formData, setFormData] = useState<CreateEscrowData>({
        totalAmount: '',
        numParticipants: 2,
        password: ''
    });
    const [usePassword, setUsePassword] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!isConnected) {
            newErrors.wallet = 'Please connect your wallet first';
        }

        if (!formData.totalAmount) {
            newErrors.totalAmount = 'Total amount is required';
        } else if (Number(formData.totalAmount) <= 0) {
            newErrors.totalAmount = 'Amount must be greater than 0';
        } else if (Number(formData.totalAmount) < 10) {
            newErrors.totalAmount = 'Minimum amount is 10 CSPR';
        }

        if (formData.numParticipants < 2) {
            newErrors.numParticipants = 'Must have at least 2 participants';
        } else if (formData.numParticipants > 100) {
            newErrors.numParticipants = 'Maximum 100 participants';
        }

        if (usePassword && !formData.password) {
            newErrors.password = 'Password is required when protection is enabled';
        } else if (usePassword && formData.password && formData.password.length < 4) {
            newErrors.password = 'Password must be at least 4 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        if (!activeKey || !signTransaction) {
            setErrors({ wallet: 'Wallet not connected or no active key' });
            return;
        }

        setLoading(true);

        try {
            // Generate a unique escrow code
            const escrowCode = EscrowService.generateEscrowCode();
            
            // Convert CSPR to motes for the contract
            const totalAmountMotes = parseCSPR(formData.totalAmount);
            const splitAmountMotes = parseCSPR((Number(formData.totalAmount) / formData.numParticipants).toString());

            // Create escrow using the service
            const result = await EscrowService.createEscrow(
                {
                    escrowCode,
                    totalAmount: totalAmountMotes,
                    splitAmount: splitAmountMotes,
                    numFriends: formData.numParticipants,
                    password: usePassword ? formData.password : undefined
                },
                activeKey,
                signTransaction
            );

            if (result.success) {
                onSubmit(escrowCode);
            } else {
                throw new Error(result.error || 'Failed to create escrow');
            }

        } catch (error) {
            console.error('Failed to create escrow:', error);
            setErrors({
                submit: error instanceof Error ? error.message : 'Failed to create escrow. Please try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    const splitAmount = formData.totalAmount
        ? (Number(formData.totalAmount) / formData.numParticipants).toFixed(2)
        : '0.00';

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Wallet Connection Check */}
            {!isConnected && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-sm text-yellow-400 flex items-center gap-2">
                        <Icon name="warning" size="sm" />
                        Please connect your wallet to create an escrow
                    </p>
                </div>
            )}

            {/* Deploy Status */}
            {loading && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-sm text-blue-400">Creating escrow...</p>
                </div>
            )}

            {/* Error Display */}
            {errors.submit && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-400">{errors.submit}</p>
                </div>
            )}

            {/* Total Amount */}
            <Input
                label="Total Amount (CSPR)"
                type="number"
                step="0.01"
                min="10"
                placeholder="1000"
                value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                error={errors.totalAmount}
                helperText="Total CSPR to be pooled for the group expense (minimum 10 CSPR)"
                disabled={loading}
            />

            {/* Number of Participants */}
            <Input
                label="Number of Participants"
                type="number"
                min="2"
                max="100"
                value={formData.numParticipants}
                onChange={(e) => setFormData({ ...formData, numParticipants: Number(e.target.value) })}
                error={errors.numParticipants}
                helperText="Total number of people splitting the expense (including you)"
                disabled={loading}
            />

            {/* Split Amount Display */}
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Amount per person</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{splitAmount} CSPR</p>
            </div>

            {/* Password Protection */}
            <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={usePassword}
                        onChange={(e) => setUsePassword(e.target.checked)}
                        disabled={loading}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-green-500 focus:ring-green-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Icon name="lock" size="sm" />
                        Password protect this escrow
                    </span>
                </label>

                {usePassword && (
                    <Input
                        label="Password"
                        type="password"
                        placeholder="Enter password (min 4 characters)"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        error={errors.password}
                        helperText="Only people with this password can join"
                        disabled={loading}
                    />
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
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
                    {loading ? 'Creating Escrow...' : 'Create Escrow'}
                </Button>
            </div>
        </form>
    );
}
