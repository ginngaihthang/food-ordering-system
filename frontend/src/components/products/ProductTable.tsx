import { Pencil, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
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
import type { Product } from '@/types/product';

interface ProductTableProps {
  products: Product[];
  searchQuery: string;
  startIndex: number;
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
  onToggleAvailability: (id: number) => void;
}

export function ProductTable({
  products,
  searchQuery,
  startIndex,
  onEdit,
  onDelete,
  onToggleAvailability,
}: ProductTableProps) {
  const { canEdit, canDelete } = usePermissions();
  const showActions = canEdit || canDelete;

  if (products.length === 0) {
    return (
      <Table>
        <TableBody>
          <TableRow>
            <TableCell
              colSpan={showActions ? 7 : 6}
              className="py-8 text-center text-muted-foreground"
            >
              {searchQuery
                ? 'No products match your search.'
                : 'No products yet. Click "Add Product" to create one.'}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>No.</TableHead>
          <TableHead>Image</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Available</TableHead>
          {showActions && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>

      <TableBody>
        {products.map((product, index) => (
          <TableRow key={product.id}>
            <TableCell className="font-medium">{startIndex + index + 1}</TableCell>
            <TableCell>
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-10 w-10 rounded object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded bg-muted" />
              )}
            </TableCell>
            <TableCell className="font-medium">{product.name}</TableCell>

            <TableCell>
              <Badge variant="outline">{product.Category?.name ?? '—'}</Badge>
            </TableCell>

            <TableCell>${Number(product.price).toFixed(2)}</TableCell>

            {/* Staff can still mark an item sold out */}
            <TableCell>
              <Switch
                checked={product.isAvailable}
                onCheckedChange={() => onToggleAvailability(product.id)}
              />
            </TableCell>

            {showActions && (
              <TableCell className="space-x-2 text-right">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(product)}
                    aria-label={`Edit ${product.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}

                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(product.id)}
                    aria-label={`Delete ${product.name}`}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}