import { useCallback, useEffect, useState } from 'react';
import { fetchCategories, deleteCategory, toggleCategoryActive } from '@/api/categories';
import { getErrorMessage } from '@/lib/error';
import type { Category } from '@/types/category';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setCategories(await fetchCategories());
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
  let cancelled = false;

  fetchCategories()
    .then((data) => {
      if (!cancelled) setCategories(data);
    })
    .catch((err) => console.error('Failed to load categories:', err))
    .finally(() => {
      if (!cancelled) setLoading(false);
    });

  return () => {
    cancelled = true;
  };
}, []);

  const toggleCategory = useCallback(
    async (category: Category) => {
      // Update the screen immediately, then confirm with the server
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? { ...c, isActive: !c.isActive } : c))
      );
      try {
        await toggleCategoryActive(category.id);
      } catch (err) {
        alert(getErrorMessage(err, 'Failed to update category'));
        await loadData();
      }
    },
    [loadData]
  );

  const removeCategory = useCallback(
    async (category: Category) => {
      if (category.productCount > 0) return;
      if (!window.confirm(`Delete category "${category.name}"?`)) return;

      try {
        await deleteCategory(category.id);
        await loadData();
      } catch (err) {
        alert(getErrorMessage(err, 'Failed to delete category'));
      }
    },
    [loadData]
  );

  return { categories, loading, loadData, toggleCategory, removeCategory };
}