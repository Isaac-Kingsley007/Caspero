interface ProgressBarProps {
    current: number;
    total: number;
    showLabel?: boolean;
}

export default function ProgressBar({ current, total, showLabel = true }: ProgressBarProps) {
    const percentage = Math.min(Math.round((current / total) * 100), 100);

    return (
        <div className="w-full">
            {showLabel && (
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-gray-300 font-medium">{current}/{total} joined</span>
                </div>
            )}
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}