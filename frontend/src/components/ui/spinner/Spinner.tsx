interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullHeight?: boolean;
}

export default function Spinner({ size = 'md', fullHeight = false }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const containerClasses = fullHeight
    ? 'flex items-center justify-center h-screen'
    : 'flex items-center justify-center';

  return (
    <div className={containerClasses}>
      <div className={`${sizeClasses[size]} border-4 border-gray-200 border-t-brand-500 rounded-full animate-spin dark:border-gray-700 dark:border-t-brand-400`} />
    </div>
  );
}
