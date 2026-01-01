'use client';

import { useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';

interface CreateEscrowFormProps {
    onSubmit: (data: CreateEscrowData) => void;
    onCancel: () => void;
}

export interface CreateEscrowData {
    escrowCode: string;
    totalAmount: string;
    numParticipants: number;
    password?: string;
}

export default function CreateEscrowForm({ onSubmit, onCancel }: CreateEscrowFormProps) {
    const [formData, setFormData] = useState<CreateEscrowData>({
        escrowCode: '',
        totalAmount: '',
        numParticipants: 2,
        password: ''
    });
    const [usePassword, setUsePassword] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.escrowCode.trim()) {
            newErrors.escrowCode = 'Escrow code is required';
        } else if (formData.escrowCode.length < 3) {
            newErrors.escrowCode = 'Escrow code must be at least 3 characters';
        } else if (!/^[A-Z0-9]+$/.test(formData.escrowCode)) {
            newErrors.escrowCode = 'Escrow code must be uppercase letters and numbers only';
        }

        if (!formData.totalAmount) {
            newErrors.totalAmount = 'Total amount is required';
        } else if (Number(formData.totalAmount) <= 0) {
            newErrors.totalAmount = 'Amount must be greater than 0';
        }

        if (formData.numParticipants < 2) {
            newErrors.numParticipants = 'Must have at least 2 participants';
        } else if (formData.numParticipants > 100) {
            newErrors.numParticipants = 'Maximum 100 participants';
        }

        if (usePassword && !formData.password) {
            newErrors.password = 'Password is required when protection is enabled';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        setLoading(true);
        try {
            await onSubmit({
                ...formData,
                password: usePassword ? formData.password : undefined
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
            {/* Escrow Code */}
            <Input
                label="Escrow Code"
                placeholder="e.g., TRIP2024"
                value={formData.escrowCode}
                onChange={(e) => setFormData({ ...formData, escrowCode: e.target.value.toUpperCase() })}
                error={errors.escrowCode}
                helperText="Unique identifier for your escrow (uppercase letters and numbers)"
            />

            {/* Total Amount */}
            <Input
                label="Total Amount (CSPR)"
                type="number"
                step="0.01"
                placeholder="1000"
                value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                error={errors.totalAmount}
                helperText="Total CSPR to be pooled for the group expense"
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
                        placeholder="Enter password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        error={errors.password}
                        helperText="Only people with this password can join"
                    />
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
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
                    Create Escrow
                </Button>
            </div>
        </form>
    );
}
