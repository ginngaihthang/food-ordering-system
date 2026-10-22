import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Product } from '@/types/product';

type Props = {
  product: Product | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteProductDialog({ product, deleting, onCancel, onConfirm }: Props) {
  return (
    <AlertDialog open={!!product} onOpenChange={(open) => !open && !deleting && onCancel()}>
      <AlertDialogContent className="max-w-sm rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {product?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            It will be removed from the menu. This can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="grid grid-cols-2 gap-2 sm:space-x-0">
          <AlertDialogCancel className="mt-0 h-11 rounded-xl" disabled={deleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="h-11 rounded-xl bg-red-700 text-white hover:bg-red-800"
            disabled={deleting}
            onClick={(e) => {
              e.preventDefault(); // keep the dialog open until the delete finishes
              onConfirm();
            }}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}