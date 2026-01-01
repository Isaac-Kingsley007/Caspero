import { ReactNode } from 'react';
import Button from './Button';

interface EmptyStateProps {
    icon?: string | ReactNode;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
}

export default function EmptyState({
    icon = '📭',
    title,
    description,
    actionLabel,
    onAction
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="mb-4">
                {typeof icon === 'string' ? (
                    <div className="text-6xl">{icon}</div>
                ) : (
                    icon
                )}
            </div>
            <h3 className="text-xl font-semibold text-gray-100 mb-2">{title}</h3>
            <p className="text-gray-400 mb-6 max-w-md">{description}</p>
            {actionLabel && onAction && (
                <Button onClick={onAction} variant="primary">
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}