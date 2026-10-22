import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { User, UserForm, UserRole } from '@/types/user';

const ROLES: { value: UserRole; label: string; hint: string }[] = [
  { value: 'STAFF', label: 'Staff', hint: 'Orders, menu and tables' },
  { value: 'ADMIN', label: 'Admin', hint: 'Everything, including users' },
];

interface UserDialogProps {
  open: boolean;
  editingUser: User | null;
  form: UserForm;
  saving: boolean;
  error: string;
  roleLocked: boolean;
  onOpenChange: (open: boolean) => void;
  onFormChange: (form: UserForm) => void;
  onCancel: () => void;
  onSave: () => void;
}

export function UserDialog({
  open,
  editingUser,
  form,
  saving,
  error,
  roleLocked,
  onOpenChange,
  onFormChange,
  onCancel,
  onSave,
}: UserDialogProps) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault(); // lets the Enter key save the form
    onSave();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingUser ? 'Edit User' : 'Add User'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-username">Username</Label>
            <Input
              id="user-username"
              value={form.username}
              onChange={(e) => onFormChange({ ...form, username: e.target.value })}
              placeholder="e.g. Sarah"
              maxLength={50}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              value={form.email}
              onChange={(e) => onFormChange({ ...form, email: e.target.value })}
              placeholder="sarah@restaurant.com"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-password">
              {editingUser ? 'New password (leave blank to keep current)' : 'Password'}
            </Label>
            <Input
              id="user-password"
              type="password"
              value={form.password}
              onChange={(e) => onFormChange({ ...form, password: e.target.value })}
              autoComplete="new-password"
              maxLength={72}
            />
            <p className="text-xs text-muted-foreground">At least 8 characters.</p>
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((role) => {
                const selected = form.role === role.value;
                return (
                  <button
                    key={role.value}
                    type="button"
                    disabled={roleLocked}
                    aria-pressed={selected}
                    onClick={() => onFormChange({ ...form, role: role.value })}
                    className={`rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      selected ? 'border-foreground bg-muted' : 'hover:bg-muted/50'
                    }`}
                  >
                    <p className="text-sm font-medium">{role.label}</p>
                    <p className="text-xs text-muted-foreground">{role.hint}</p>
                  </button>
                );
              })}
            </div>
            {roleLocked && (
              <p className="text-xs text-muted-foreground">You can&apos;t change your own role.</p>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingUser ? 'Save Changes' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}