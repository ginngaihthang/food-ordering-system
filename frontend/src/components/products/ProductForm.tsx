import type { ChangeEvent } from 'react';

import type { Category } from '@/api/categories';
import type { ProductForm as ProductFormType } from '@/types/product';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProductFormProps {
  form: ProductFormType;
  categories: Category[];
  uploading: boolean;
  onChange: (form: ProductFormType) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function ProductForm({
  form,
  categories,
  uploading,
  onChange,
  onFileChange,
}: ProductFormProps) {
  return (
    <div className="space-y-4">

      {/* Category */}
      <div className="space-y-2">
        <Label>Category</Label>

        <Select
          value={form.categoryId?.toString() ?? ''}
          onValueChange={(value) =>
            onChange({
              ...form,
              categoryId: Number(value),
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>

          <SelectContent>
            {categories.map((category) => (
              <SelectItem
                key={category.id}
                value={String(category.id)}
              >
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label>Name</Label>

        <Input
          value={form.name}
          onChange={(event) =>
            onChange({
              ...form,
              name: event.target.value,
            })
          }
          placeholder="Chicken Rice"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label>Description</Label>

        <Textarea
          value={form.description}
          onChange={(event) =>
            onChange({
              ...form,
              description: event.target.value,
            })
          }
          placeholder="Steamed chicken with fragrant rice"
        />
      </div>

      {/* Price */}
      <div className="space-y-2">
        <Label>Price ($)</Label>

        <Input
          type="number"
          step="0.01"
          min="0"
          value={form.price}
          onChange={(event) =>
            onChange({
              ...form,
              price: event.target.value,
            })
          }
          placeholder="6.50"
        />
      </div>

      {/* Image */}
      <div className="space-y-2">
        <Label>Product Image</Label>

        <Input
          type="file"
          accept="image/*"
          onChange={onFileChange}
          disabled={uploading}
        />

        {uploading && (
          <p className="text-sm text-muted-foreground">
            Uploading...
          </p>
        )}

        {form.imageUrl && !uploading && (
          <img
            src={form.imageUrl}
            alt="Product preview"
            className="mt-2 h-20 w-20 rounded object-cover"
          />
        )}
      </div>

    </div>
  );
}