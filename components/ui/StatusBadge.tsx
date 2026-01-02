interface StatusBadgeProps {
    status: 'Open' | 'Complete' | 'Cancelled';
    size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
    const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';

    const statusConfig = {
        Open: {
            className: 'bg-green-500/10 text-green-400 border-green-500/20',
            icon: '✓'
        },
        Complete: {
            className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            icon: '✓'
        },
        Cancelled: {
            className: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
            icon: '✗'
        }
    };

    const config = statusConfig[status];

    return (
        <span className={`inline-flex items-center gap-1 rounded-full border font-medium ${sizeClasses} ${config.className}`}>
            <span>{config.icon}</span>
            {status}
        </span>
    );
}
