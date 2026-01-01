'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navigation = [
    { name: 'Browse Groups', href: '/', icon: '🤝' },
    { name: 'My Escrows', href: '/my-escrows', icon: '💼' },
    { name: 'History', href: '/history', icon: '📜' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <>
            {/* Mobile Overlay */}
            {!isCollapsed && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsCollapsed(true)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed lg:static inset-y-0 left-0 z-50
          flex flex-col
          bg-gray-900 border-r border-gray-800
          transition-all duration-300
          ${isCollapsed ? '-translate-x-full lg:translate-x-0 lg:w-20' : 'w-64'}
        `}
            >
                {/* Logo & Brand */}
                <div className="flex items-center justify-between p-6 border-b border-gray-800">
                    <Link href="/" className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-2xl">
                            💰
                        </div>
                        {!isCollapsed && (
                            <div>
                                <h1 className="text-lg font-bold text-gray-100">GroupEscrow</h1>
                                <p className="text-xs text-gray-400">Split & Stake</p>
                            </div>
                        )}
                    </Link>

                    {/* Collapse Button - Desktop Only */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden lg:block text-gray-400 hover:text-gray-100"
                    >
                        {isCollapsed ? '→' : '←'}
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 p-4 space-y-2">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`
                  flex items-center space-x-3 px-4 py-3 rounded-lg
                  transition-all duration-200
                  ${isActive
                                        ? 'bg-green-500 text-white shadow-md'
                                        : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
                                    }
                `}
                            >
                                <span className="text-xl">{item.icon}</span>
                                {!isCollapsed && (
                                    <span className="font-medium">{item.name}</span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Wallet Status - Bottom */}
                <div className="p-4 border-t border-gray-800">
                    <div className={`
            flex items-center space-x-3 p-3 rounded-lg
            bg-gray-800 border border-gray-700
            ${isCollapsed ? 'justify-center' : ''}
          `}>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        {!isCollapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-400">Wallet Status</p>
                                <p className="text-sm text-gray-100 font-medium truncate">
                                    Not Connected
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="fixed bottom-4 right-4 lg:hidden z-50 w-14 h-14 bg-green-500 rounded-full shadow-lg flex items-center justify-center text-white text-2xl"
            >
                {isCollapsed ? '☰' : '✕'}
            </button>
        </>
    );
}