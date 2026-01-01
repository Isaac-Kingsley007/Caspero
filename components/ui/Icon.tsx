interface IconProps {
    name: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    variant?: 'outlined' | 'filled';
}

export default function Icon({
    name,
    className = '',
    size = 'md',
    variant = 'outlined'
}: IconProps) {
    const sizeClasses = {
        sm: 'text-lg',
        md: 'text-xl',
        lg: 'text-2xl',
        xl: 'text-3xl'
    };

    const iconClass = variant === 'filled' ? 'material-icons' : 'material-symbols-outlined';

    return (
        <span className={`${iconClass} ${sizeClasses[size]} ${className}`}>
            {name}
        </span>
    );
}

// Convenience components for common icons
export function HomeIcon({ className = '', size = 'md' }: Omit<IconProps, 'name'>) {
    return <Icon name="home" className={className} size={size} />;
}

export function WalletIcon({ className = '', size = 'md' }: Omit<IconProps, 'name'>) {
    return <Icon name="account_balance_wallet" className={className} size={size} />;
}

export function HistoryIcon({ className = '', size = 'md' }: Omit<IconProps, 'name'>) {
    return <Icon name="history" className={className} size={size} />;
}

export function AddIcon({ className = '', size = 'md' }: Omit<IconProps, 'name'>) {
    return <Icon name="add" className={className} size={size} />;
}

export function GroupIcon({ className = '', size = 'md' }: Omit<IconProps, 'name'>) {
    return <Icon name="group" className={className} size={size} />;
}

export function MenuIcon({ className = '', size = 'md' }: Omit<IconProps, 'name'>) {
    return <Icon name="menu" className={className} size={size} />;
}

export function CloseIcon({ className = '', size = 'md' }: Omit<IconProps, 'name'>) {
    return <Icon name="close" className={className} size={size} />;
}

export function VisibilityIcon({ className = '', size = 'md' }: Omit<IconProps, 'name'>) {
    return <Icon name="visibility" className={className} size={size} />;
}

export function VisibilityOffIcon({ className = '', size = 'md' }: Omit<IconProps, 'name'>) {
    return <Icon name="visibility_off" className={className} size={size} />;
}

export function SearchIcon({ className = '', size = 'md' }: Omit<IconProps, 'name'>) {
    return <Icon name="search" className={className} size={size} />;
}

export function FilterIcon({ className = '', size = 'md' }: Omit<IconProps, 'name'>) {
    return <Icon name="filter_list" className={className} size={size} />;
}

export function MoreVertIcon({ className = '', size = 'md' }: Omit<IconProps, 'name'>) {
    return <Icon name="more_vert" className={className} size={size} />;
}

export function CheckIcon({ className = '', size = 'md' }: Omit<IconProps, 'name'>) {
    return <Icon name="check" className={className} size={size} />;
}

export function ErrorIcon({ className = '', size = 'md' }: Omit<IconProps, 'name'>) {
    return <Icon name="error" className={className} size={size} />;
}

export function WarningIcon({ className = '', size = 'md' }: Omit<IconProps, 'name'>) {
    return <Icon name="warning" className={className} size={size} />;
}

export function InfoIcon({ className = '', size = 'md' }: Omit<IconProps, 'name'>) {
    return <Icon name="info" className={className} size={size} />;
}