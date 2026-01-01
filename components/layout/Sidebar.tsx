'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { HomeIcon, WalletIcon, HistoryIcon, MenuIcon, CloseIcon } from '@/components/ui/Icon';
import { useSidebar } from '@/components/providers/SidebarProvider';

const navigation = [
    { name: 'Browse Groups', href: '/', icon: HomeIcon },
    { name: 'My Escrows', href: '/my-escrows', icon: WalletIcon },
    { name: 'History', href: '/history', icon: HistoryIcon },
];

// Breadcrumb mapping


export default function Sidebar() {
    const pathname = usePathname();
    const { isCollapsed, setIsCollapsed } = useSidebar();

    // Auto-collapse sidebar on mobile by default
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) { // lg breakpoint
                setIsCollapsed(true);
            }
        };

        // Set initial state
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [setIsCollapsed]);

    // Close sidebar when navigating on mobile
    useEffect(() => {
        if (window.innerWidth < 1024) {
            setIsCollapsed(true);
        }
    }, [pathname, setIsCollapsed]);

    // Get breadcrumbs for current path


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
                    transition-all duration-300 ease-in-out
                    ${isCollapsed
                        ? '-translate-x-full lg:translate-x-0 lg:w-20'
                        : 'translate-x-0 w-64'
                    }
                `}
            >
                {/* Logo & Brand */}
                <div className="flex items-center justify-between p-6 border-b border-gray-800">
                    <div className="flex items-center space-x-3">
                        <div
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center cursor-pointer hover:bg-green-600 transition-colors"
                        >
                            <WalletIcon className="text-white" size="lg" />
                        </div>
                        {!isCollapsed && (
                            <Link href="/">
                                <div>
                                    <h1 className="text-lg font-bold text-gray-100">Group-Splits</h1>
                                    <p className="text-xs text-gray-400">Split & Stake</p>
                                </div>
                            </Link>
                        )}
                    </div>

                    {/* Collapse Button - Desktop Only */}

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
                                <item.icon className="text-current" />
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

            {/* Mobile Menu Button - Floating Action Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`
                    fixed bottom-6 right-6 lg:hidden z-50 
                    w-14 h-14 rounded-full shadow-lg 
                    flex items-center justify-center 
                    transition-all duration-300
                    ${isCollapsed
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-gray-800 hover:bg-gray-700'
                    }
                `}
                aria-label={isCollapsed ? 'Open menu' : 'Close menu'}
            >
                <div className="text-white transition-transform duration-300">
                    {isCollapsed ? <MenuIcon size="md" /> : <CloseIcon size="md" />}
                </div>
            </button>
        </>
    );
}