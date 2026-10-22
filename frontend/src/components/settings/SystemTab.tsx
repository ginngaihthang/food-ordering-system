import {  useEffect, useState, type ReactNode } from 'react';
import { SettingsCard } from './SettingsCard';
import { useSocketStatus } from '@/hooks/useSocketStatus';
import { fetchSystemStatus, type SystemStatus } from '@/api/settings';

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <span className="text-base font-semibold">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}

function StatusValue({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-semibold ${
        ok ? 'text-emerald-600' : 'text-red-600'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {label}
    </span>
  );
}

function formatUptime(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function SystemTab() {
  const feedConnected = useSocketStatus();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [unreachable, setUnreachable] = useState(false);
  const [loading, setLoading] = useState(true);

 

  useEffect(() => {
    let cancelled = false;
    async function load() {
    try {
      const data = await fetchSystemStatus();
      if (cancelled) return;
        setStatus(data);
        setUnreachable(false);
      } catch {
        if (!cancelled) setUnreachable(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const timer = setInterval(load, 30000); // refresh every 30 seconds
    return () => {
      cancelled = true;
      clearInterval(timer);
    }
  }, []);

  return (
    <SettingsCard title="System status">
      <InfoRow label="Database">
        {loading ? (
          <span className="text-muted-foreground">Checking...</span>
        ) : unreachable ? (
          <StatusValue ok={false} label="Server unreachable" />
        ) : (
          <StatusValue
            ok={status?.database === 'connected'}
            label={status?.database === 'connected' ? 'Connected' : 'Disconnected'}
          />
        )}
      </InfoRow>

      <InfoRow label="Order feed">
        <StatusValue ok={feedConnected} label={feedConnected ? 'Receiving' : 'Disconnected'} />
      </InfoRow>

      {status && (
        <>
          <InfoRow label="Server timezone">
            <p className="font-medium">{status.timezone}</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Daily totals and pickup numbers restart at midnight in this timezone. Set the TZ
              environment variable on your server to change it.
            </p>
          </InfoRow>

          <InfoRow label="Server time">
            <p className="font-medium">{new Date(status.serverTime).toLocaleString()}</p>
          </InfoRow>

          <InfoRow label="Uptime">
            <p className="font-medium">{formatUptime(status.uptimeSeconds)}</p>
          </InfoRow>

          <InfoRow label="Application version">
            <p className="font-medium">v{status.version}</p>
          </InfoRow>
          <InfoRow label="Online payments">
            <StatusValue
              ok={status.onlinePayments}
              label={status.onlinePayments ? 'Stripe connected' : 'Not set up'}
            />
          </InfoRow>
        </>
      )}
    </SettingsCard>
  );
}