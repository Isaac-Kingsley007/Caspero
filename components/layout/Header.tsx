'use client';

import { usePathname } from 'next/navigation';
import WalletConnect from '@/components/wallet/WalletConnect';

// Breadcrumb mapping
const breadcrumbMap: Record<string, string[]> = {
    '/': ['Browse Groups'],
    '/my-escrows': ['My Escrows'],
    '/history': ['History'],
    '/create': ['Create Escrow'],
    '/join': ['Join Escrow'],
};

export default function Header() {
    const pathname = usePathname();

    // Get breadcrumbs for current path
    const breadcrumbs = breadcrumbMap[pathname] || ['Dashboard'];

    return (
        <header className="sticky top-0 z-30 bg-gray-900 border-b border-gray-800">
            <div className="flex items-center justify-between px-8 py-4">
                {/* Breadcrumb Navigation */}
                <div className="flex items-center space-x-2">
                    <span className="text-gray-400 text-sm">🏠</span>
                    {breadcrumbs.map((crumb, index) => (
                        <div key={index} className="flex items-center space-x-2">
                            {index > 0 && (
                                <span className="text-gray-400">/</span>
                            )}
                            <span className={`
                text-sm font-medium
                ${index === breadcrumbs.length - 1
                                    ? 'text-gray-100'
                                    : 'text-gray-400'
                                }
              `}>
                                {crumb}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center space-x-4">
                    {/* Network Indicator */}
                    <div className="hidden md:flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-sm text-gray-300">Testnet</span>
                    </div>

                    {/* Wallet Connect Button */}
                    <WalletConnect />
                </div>
            </div>
        </header>
    );
}