import { useEffect, useState } from 'react';

import {
  fetchProducts,
  deleteProduct,
  toggleAvailability,
} from '@/api/proudcts';

import {
  fetchCategories,
  type Category,
} from '@/api/categories';

import type { Product } from '@/types/product';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      setLoading(true);

      const [productsData, categoriesData] = await Promise.all([
        fetchProducts(),
        fetchCategories(),
      ]);

      setProducts(productsData);
      setCategories(categoriesData);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function removeProduct(id: number) {
    await deleteProduct(id);
    await loadData();
  }

  async function toggleProductAvailability(id: number) {
    await toggleAvailability(id);
    await loadData();
  }

  return {
    products,
    categories,
    loading,
    loadData,
    removeProduct,
    toggleProductAvailability,
  };
}