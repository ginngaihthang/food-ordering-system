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
import type { Category, CategoryForm } from '@/types/category';

interface CategoryDialogProps {
  open: boolean;
  editingCategory: Category | null;
  form: CategoryForm;
  saving: boolean;
  error: string;
  onOpenChange: (open: boolean) => void;
  onFormChange: (form: CategoryForm) => void;
  onCancel: () => void;
  onSave: () => void;
}

export function CategoryDialog({
  open,
  editingCategory,
  form,
  saving,
  error,
  onOpenChange,
  onFormChange,
  onCancel,
  onSave,
}: CategoryDialogProps) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault(); // lets the Enter key save the form
    onSave();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingCategory ? 'Rename Category' : 'Add Category'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              value={form.name}
              onChange={(e) => onFormChange({ ...form, name: e.target.value })}
              placeholder="e.g. Main Course"
              maxLength={50}
              autoFocus
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}