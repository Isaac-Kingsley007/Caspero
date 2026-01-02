'use client';

import { useRouter } from 'next/navigation';
import CreateEscrowForm from '@/components/forms/CreateEscrowForm';

export default function CreateEscrow() {
    const router = useRouter();

    const handleSubmit = async (escrowCode: string) => {
        console.log('Escrow created with code:', escrowCode);

        alert(`Escrow ${escrowCode} created successfully!`);
        router.push('/my-escrows');
    };

    const handleCancel = () => {
        router.back();
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-100 mb-2">
                    Create New Escrow
                </h1>
                <p className="text-gray-400">
                    Set up a group escrow to pool funds and earn staking rewards
                </p>
            </div>

            <div className="card">
                <CreateEscrowForm onSubmit={handleSubmit} onCancel={handleCancel} />
            </div>

            {/* Info Section */}
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-400 mb-2">How it works</h3>
                <ul className="text-sm text-blue-300 space-y-1">
                    <li>• You create an escrow with a unique code and total amount</li>
                    <li>• Friends join by contributing their equal share</li>
                    <li>• All funds are automatically staked to earn yield</li>
                    <li>• Once full, everyone can withdraw their share + proportional yield</li>
                </ul>
            </div>
        </div>
    );
}
