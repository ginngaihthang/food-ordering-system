import { useSocketStatus } from "@/hooks/useSocketStatus";
import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export function ConnectionBanner() {
    const connected = useSocketStatus();
    const [showOffline, setShowOffline] = useState(false);

    useEffect(() => {
        if (connected) return
        const timer = window.setTimeout(() => setShowOffline(true), 4000);
        return() => {
            window.clearTimeout(timer)
            setShowOffline(false);
        }
    },[connected])

    if (connected || !showOffline)  return null;

    return (
        <div
      role="alert"
      className="sticky top-14 z-20 md:top-0 flex items-center gap-2 border-b border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-800"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      Connection lost. New orders may not appear until it reconnects. Trying again...
    </div>
    )
}