import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SettingRow, SettingsCard } from './SettingsCard';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { changePassword } from '@/api/account';
import { getErrorMessage } from '@/lib/error';

export function SecurityTab() {
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const navigate = useNavigate();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (next.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters' });
      return;
    }
    if (next !== confirm) {
      setMessage({ type: 'error', text: "The new passwords don't match" });
      return;
    }

    setSaving(true);
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      setMessage({ type: 'success', text: 'Password updated' });
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err, 'Failed to update password') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <SettingsCard title="My account">
        <SettingRow label="Signed in as" description={user?.role === 'ADMIN' ? 'Admin' : 'Staff'}>
          <p className="font-medium sm:text-right">{user?.username}</p>
        </SettingRow>
      </SettingsCard>

      <section className="rounded-2xl border bg-card p-6">
        <h3 className="text-xl font-bold">Change password</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Password changes aren&apos;t saved automatically. Press the button to confirm.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 max-w-sm space-y-3">
          <Input
            type="password"
            placeholder="Current password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
          <Input
            type="password"
            placeholder="New password (at least 8 characters)"
            autoComplete="new-password"
            maxLength={72}
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Confirm new password"
            autoComplete="new-password"
            maxLength={72}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          {message && (
            <p
              className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}
            >
              {message.text}
            </p>
          )}

          <Button type="submit" disabled={saving || !current || !next || !confirm}>
            {saving ? 'Updating...' : 'Update password'}
          </Button>
        </form>
      </section>

      {isAdmin && (
        <SettingsCard title="Users">
          <SettingRow label="Admin and staff accounts" description="Add, edit or remove accounts.">
            <div className="flex sm:justify-end">
              <Button variant="outline" onClick={() => navigate('/admin/users')}>
                Manage users
              </Button>
            </div>
          </SettingRow>
        </SettingsCard>
      )}
    </div>
  );
}