import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface OfflineBannerProps {
  message?: string;
  className?: string;
}

export function OfflineBanner({
  message = "You're offline. Reconnect to place your order.",
  className = 'mt-4',
}: OfflineBannerProps) {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="alert"
      className={`flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ${className}`}
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}