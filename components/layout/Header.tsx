'use client';

import WalletConnect from '@/components/wallet/WalletConnect';
import { MenuIcon } from '@/components/ui/Icon';
import { useSidebar } from '@/components/providers/SidebarProvider';

export default function Header() {
    const { isCollapsed, toggleSidebar } = useSidebar();

    return (
        <header className="sticky top-0 z-30 bg-gray-900 border-b border-gray-800">
            <div className="flex items-center justify-between px-4 py-4">
                {/* Left Side - Mobile Menu Button */}
                <div className="flex items-center">
                    {isCollapsed && (
                        <button
                            onClick={toggleSidebar}
                            className="lg:hidden flex items-center justify-center w-10 h-10 text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors"
                            aria-label="Open menu"
                        >
                            <MenuIcon size="md" />
                        </button>
                    )}
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center space-x-4 shrink-0">
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