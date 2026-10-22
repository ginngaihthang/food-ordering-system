import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';

import { ProductSkeleton } from '@/components/products/ProductSkeleton';
import { CategoryDialog } from '@/components/categories/CategoryDialog';
import { CategoryTable } from '@/components/categories/CategoryTable';
import { CategorySearch } from '@/components/categories/CategorySearch';
import { CategoryPagination } from '@/components/categories/CategoryPagination';
import { initialCategoryForm, type Category, type CategoryForm } from '@/types/category';
import { createCategory, updateCategory } from '@/api/categories';
import { useCategories } from '@/hooks/useCategories';
import { getErrorMessage } from '@/lib/error';

const itemsPerPage = 10;

export default function Categories() {
  const { categories, loading, loadData, toggleCategory, removeCategory } = useCategories();

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(initialCategoryForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredCategories = useMemo(() => {
    return categories.filter((category) =>
      category.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [categories, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / itemsPerPage));

  // Clamped so deleting the last item on the last page moves you back a page
  const page = Math.min(currentPage, totalPages);
  const startIndex = (page - 1) * itemsPerPage;
  const paginatedCategories = filteredCategories.slice(startIndex, startIndex + itemsPerPage);

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setCurrentPage(1);
  }

  function handleAddCategory() {
    setEditingCategory(null);
    setForm(initialCategoryForm);
    setFormError('');
    setDialogOpen(true);
  }

  function handleEditCategory(category: Category) {
    setEditingCategory(category);
    setForm({ name: category.name });
    setFormError('');
    setDialogOpen(true);
  }

  async function handleSave() {
    const name = form.name.trim();
    if (!name) {
      setFormError('Category name is required');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, { name });
      } else {
        await createCategory({ name });
      }
      setDialogOpen(false);
      await loadData();
    } catch (err) {
      // Shows server messages such as "A category with this name already exists"
      setFormError(getErrorMessage(err, 'Failed to save category'));
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setDialogOpen(false);
  }

  if (loading) {
    return <ProductSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Categories</h2>
          <p className="text-muted-foreground">
            Hidden categories don&apos;t appear on the customer menu.
          </p>
        </div>

        <Button onClick={handleAddCategory} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Search */}
      <CategorySearch value={searchQuery} onChange={handleSearchChange} />

      {/* Table */}
      <CategoryTable
        categories={paginatedCategories}
        searchQuery={searchQuery}
        startIndex={startIndex}
        onEdit={handleEditCategory}
        onDelete={removeCategory}
        onToggleActive={toggleCategory}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <CategoryPagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Dialog */}
      <CategoryDialog
        open={dialogOpen}
        editingCategory={editingCategory}
        form={form}
        saving={saving}
        error={formError}
        onOpenChange={setDialogOpen}
        onFormChange={setForm}
        onCancel={handleCancel}
        onSave={handleSave}
      />
    </div>
  );
}