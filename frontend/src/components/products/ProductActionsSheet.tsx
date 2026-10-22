import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { Product } from '@/types/product';

type Props = {
  product: Product | null;
  onClose: () => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
};

export function ProductActionsSheet({ product, onClose, onEdit, onDelete }: Props) {
  return (
    <Sheet open={!!product} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-2xl p-4 pb-6">
        <SheetHeader className="p-0 text-left">
          <SheetTitle>{product?.name}</SheetTitle>
          <SheetDescription className="sr-only">Actions for this product</SheetDescription>
        </SheetHeader>

        {product && (
          <div className="mt-3 space-y-2">
            <Button
              variant="outline"
              className="h-12 w-full justify-start gap-3 rounded-xl text-base"
              onClick={() => onEdit(product)}
            >
              <Pencil className="h-4 w-4" />
              Edit product
            </Button>
            <Button
              variant="outline"
              className="h-12 w-full justify-start gap-3 rounded-xl text-base text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10"
              onClick={() => onDelete(product)}
            >
              <Trash2 className="h-4 w-4" />
              Delete product
            </Button>
            <Button variant="outline" className="h-12 w-full rounded-xl text-base" onClick={onClose}>
              Cancel
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}