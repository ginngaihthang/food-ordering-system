import { Pencil, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { User } from '@/types/user';

interface UserTableProps {
  users: User[];
  searchQuery: string;
  startIndex: number;
  currentUserId: number | undefined;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

export function UserTable({
  users,
  searchQuery,
  startIndex,
  currentUserId,
  onEdit,
  onDelete,
}: UserTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">No.</TableHead>
          <TableHead>Username</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {users.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
              {searchQuery
                ? 'No users match your search.'
                : 'No users yet. Click "Add User" to create one.'}
            </TableCell>
          </TableRow>
        ) : (
          users.map((user, index) => {
            const isSelf = user.id === currentUserId;
            return (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{startIndex + index + 1}</TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {user.username}
                    {isSelf && <Badge variant="outline">You</Badge>}
                  </div>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                    {user.role === 'ADMIN' ? 'Admin' : 'Staff'}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(user)}
                    aria-label={`Edit ${user.username}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>

                  <span
                    className="inline-block"
                    title={isSelf ? "You can't delete your own account" : 'Delete user'}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isSelf}
                      onClick={() => onDelete(user)}
                      aria-label={`Delete ${user.username}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </span>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}