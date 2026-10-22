import { useEffect, useState } from "react";

export function useWakeLock(enabled: boolean) {
    const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
    const [active ,setActive] = useState(false);

    useEffect(() => {
        if (!enabled || !supported) return;

        let sentinel: WakeLockSentinel | null = null;
        let cancelled = false ;

        async function acquire() {
            if (sentinel && !sentinel.released) return;
            try {
                const lock = await navigator.wakeLock.request('screen');
                if (cancelled) {
                    void lock.release();
                    return;
                }
                sentinel = lock;
                setActive(true);
                lock.addEventListener('release', () => setActive(false));
            } catch  {
                setActive(false)
            }
        }

        function handleVisibility() {
            if (document.visibilityState === 'visible') void acquire
        }

        void acquire();
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', handleVisibility);
            void sentinel?.release();
            setActive(false)
        }
    }, [enabled, supported])

    return { supported, active}
}