import type { CategoryForm as CategoryFormType } from '@/types/category';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
interface CategoryFormProps {
  form: CategoryFormType;
  onChange: (form: CategoryFormType) => void;
}

export function CategoryForm({
  form,
  onChange,
}: CategoryFormProps) {
  return (
    <div className="space-y-4">

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
          placeholder="Enter Category"
        />
      </div>

    </div>
  );
}