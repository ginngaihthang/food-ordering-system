import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePermissions } from '@/hooks/usePermissions';
import type { Category } from '@/types/category';

interface CategoryTableProps {
  categories: Category[];
  searchQuery: string;
  startIndex: number;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onToggleActive: (category: Category) => void;
}

export function CategoryTable({
  categories,
  searchQuery,
  startIndex,
  onEdit,
  onDelete,
  onToggleActive,
}: CategoryTableProps) {
  const { canEdit, canDelete } = usePermissions();
  const showActions = canEdit || canDelete;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">No.</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Products</TableHead>
          <TableHead>Visible on menu</TableHead>
          {showActions && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>

      <TableBody>
        {categories.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={showActions ? 5 : 4}
              className="py-8 text-center text-muted-foreground"
            >
              {searchQuery
                ? 'No categories match your search.'
                : 'No categories yet. Click "Add Category" to create one.'}
            </TableCell>
          </TableRow>
        ) : (
          categories.map((category, index) => (
            <TableRow key={category.id}>
              <TableCell className="font-medium">{startIndex + index + 1}</TableCell>
              <TableCell className="font-medium">{category.name}</TableCell>
              <TableCell>{category.productCount}</TableCell>

              <TableCell>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={category.isActive}
                    disabled={!canEdit}
                    onCheckedChange={() => onToggleActive(category)}
                  />
                  <span className="text-sm text-muted-foreground">
                    {category.isActive ? 'Visible' : 'Hidden'}
                  </span>
                </div>
              </TableCell>

              {showActions && (
                <TableCell className="space-x-2 text-right">
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(category)}
                      aria-label={`Rename ${category.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}

                  {canDelete && (
                    <span
                      className="inline-block"
                      title={
                        category.productCount > 0
                          ? 'Move or delete its products first, or hide it instead'
                          : 'Delete category'
                      }
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={category.productCount > 0}
                        onClick={() => onDelete(category)}
                        aria-label={`Delete ${category.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </span>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}