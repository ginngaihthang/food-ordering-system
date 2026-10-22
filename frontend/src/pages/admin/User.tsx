import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ProductSkeleton } from '@/components/products/ProductSkeleton';
import { SearchInput } from '@/components/shared/SearchInput';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { CategoryPagination } from '@/components/categories/CategoryPagination';
import { UserTable } from '@/components/users/userTable';
import { UserDialog } from '@/components/users/userDialog';
import { useUsers } from '@/hooks/useUsers';
import { useConfirmAction } from '@/hooks/useConfirmAction';
import { useAuth } from '@/context/AuthContext';
import { createUser, updateUser, deleteUser } from '@/api/users';
import { getErrorMessage } from '@/lib/error';
import { initialUserForm, type User, type UserForm } from '@/types/user';

const itemsPerPage = 10;

export default function Users() {
  const { user: currentUser } = useAuth();
  const { users, loading, loadData } = useUsers();

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(initialUserForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const deletion = useConfirmAction<User>({
    action: (user) => deleteUser(user.id),
    onSuccess: () => {
      loadData();
    },
    fallbackError: 'Failed to delete user',
  });

  const filteredUsers = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.username.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));

  // Clamped so deleting the last user on the last page moves you back a page
  const page = Math.min(currentPage, totalPages);
  const startIndex = (page - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setCurrentPage(1);
  }

  function handleAddUser() {
    setEditingUser(null);
    setForm(initialUserForm);
    setFormError('');
    setDialogOpen(true);
  }

  function handleEditUser(user: User) {
    setEditingUser(user);
    setForm({ username: user.username, email: user.email, role: user.role, password: '' });
    setFormError('');
    setDialogOpen(true);
  }

  async function handleSave() {
    const username = form.username.trim();
    const email = form.email.trim();

    if (!username || !email) {
      setFormError('Username and email are required');
      return;
    }
    if (!editingUser && !form.password) {
      setFormError('Password is required');
      return;
    }
    if (form.password && form.password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const data = { ...form, username, email };
      if (editingUser) {
        await updateUser(editingUser.id, data);
      } else {
        await createUser(data);
      }
      setDialogOpen(false);
      await loadData();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Failed to save user'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <ProductSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Users</h2>
          <p className="text-muted-foreground">Manage admin and staff accounts</p>
        </div>

        <Button onClick={handleAddUser} className="gap-2">
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Search */}
      <SearchInput
        value={searchQuery}
        onChange={handleSearchChange}
        placeholder="Search by name or email..."
      />

      {/* Table */}
      <UserTable
        users={paginatedUsers}
        searchQuery={searchQuery}
        startIndex={startIndex}
        currentUserId={currentUser?.id}
        onEdit={handleEditUser}
        onDelete={deletion.request}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <CategoryPagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Add / edit dialog */}
      <UserDialog
        open={dialogOpen}
        editingUser={editingUser}
        form={form}
        saving={saving}
        error={formError}
        roleLocked={editingUser !== null && editingUser.id === currentUser?.id}
        onOpenChange={setDialogOpen}
        onFormChange={setForm}
        onCancel={() => setDialogOpen(false)}
        onSave={handleSave}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deletion.target !== null}
        onOpenChange={(open) => {
          if (!open) deletion.close();
        }}
        title="Delete this user?"
        description={
          deletion.target
            ? `${deletion.target.username} (${deletion.target.email}) will lose access immediately. This can't be undone.`
            : ''
        }
        confirmLabel="Delete user"
        destructive
        loading={deletion.loading}
        error={deletion.error}
        onConfirm={deletion.confirm}
      />
    </div>
  );
}