import type { ChangeEvent } from 'react';

import type { Category } from '@/api/categories';
import type { Product } from '@/api/proudcts';
import type { ProductForm } from '@/types/product';

import { Button } from '@/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import { ProductForm as ProductFormComponent } from './ProductForm';

interface ProductDialogProps {
  open: boolean;
  editingProduct: Product | null;
  form: ProductForm;
  categories: Category[];
  saving: boolean;
  uploading: boolean;

  onOpenChange: (open: boolean) => void;
  onFormChange: (form: ProductForm) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCancel: () => void;
  onSave: () => void;
}

export function ProductDialog({
  open,
  editingProduct,
  form,
  categories,
  saving,
  uploading,
  onOpenChange,
  onFormChange,
  onFileChange,
  onCancel,
  onSave,
}: ProductDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingProduct
              ? 'Edit Product'
              : 'Add Product'}
          </DialogTitle>
        </DialogHeader>

        <ProductFormComponent
          form={form}
          categories={categories}
          uploading={uploading}
          onChange={onFormChange}
          onFileChange={onFileChange}
        />

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={saving || uploading}
          >
            Cancel
          </Button>

          <Button
            onClick={onSave}
            disabled={saving || uploading}
          >
            {saving || uploading
              ? 'Saving...'
              : editingProduct
                ? 'Save Changes'
                : 'Create Product'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}