import { Plus } from 'lucide-react';
import {  useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ProductToolbar } from '@/components/products/ProductToolbar';
import { ProductCard, type Tint } from '@/components/products/ProductCard';
import { ProductActionsSheet } from '@/components/products/ProductActionsSheet';
import { DeleteProductDialog } from '@/components/products/DeleteProductDialog';
import { ProductPagination } from '@/components/products/ProductPagination';
import { ProductDialog } from '@/components/products/ProductDialog';
import { ProductSkeleton } from '@/components/products/ProductSkeleton';

import { useProducts } from '@/hooks/useProducts';
import { initialProductForm, type Product, type ProductForm } from '@/types/product';
import { deleteUploadedImage, uploadImage } from '@/api/uploads';
import { createProduct, updateProduct } from '@/api/proudcts';

// Placeholder colours for products without a photo, picked per category
const TINTS: Tint[] = [
  { bg: 'bg-orange-100 dark:bg-orange-500/15', fg: 'text-orange-600' },
  { bg: 'bg-rose-100 dark:bg-rose-500/15', fg: 'text-rose-600' },
  { bg: 'bg-pink-100 dark:bg-pink-500/15', fg: 'text-pink-600' },
  { bg: 'bg-amber-100 dark:bg-amber-500/15', fg: 'text-amber-600' },
  { bg: 'bg-sky-100 dark:bg-sky-500/15', fg: 'text-sky-600' },
  { bg: 'bg-emerald-100 dark:bg-emerald-500/15', fg: 'text-emerald-600' },
];

const ITEMS_PER_PAGE = 12; // divides evenly into 2, 3, and 4 columns

export default function Products() {
  const { products, categories, loading, loadData, removeProduct, toggleProductAvailability } =
    useProducts();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(initialProductForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);

  const [actionProduct, setActionProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const categoryInfo = useMemo(() => {
    const map = new Map<string, { name: string; tint: Tint }>();
    categories.forEach((c, i) => map.set(String(c.id), { name: c.name, tint: TINTS[i % TINTS.length] }));
    return map;
  }, [categories]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        (activeCategory === 'all' || String(p.categoryId) === activeCategory) &&
        p.name.toLowerCase().includes(q)
    );
  }, [products, searchQuery, activeCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedProducts = filteredProducts.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );


  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setCurrentPage(1);
  }

  function handleCategoryChange(id: string) {
    setActiveCategory(id);
    setCurrentPage(1);
  }

  function handleAddProduct() {
    setEditingProduct(null);
    setForm(initialProductForm);
    setDialogOpen(true);
  }

  function handleEditProduct(product: Product) {
    setActionProduct(null);
    setEditingProduct(product);
    setForm({
      categoryId: product.categoryId,
      name: product.name,
      description: product.description ?? '',
      price: String(product.price),
      imageUrl: product.imageUrl ?? '',
    });
    setDialogOpen(true);
  }

  function handleRequestDelete(product: Product) {
    setActionProduct(null);
    setDeleteTarget(product);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeProduct(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      alert('Failed to delete product');
    } finally {
      setDeleting(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      if (pendingImageUrl) await deleteUploadedImage(pendingImageUrl);
      const imageUrl = await uploadImage(file);
      setForm((prev) => ({ ...prev, imageUrl }));
      setPendingImageUrl(imageUrl);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!form.categoryId || !form.name || !form.price) {
      alert('Category, name, and price are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        categoryId: Number(form.categoryId),
        name: form.name,
        description: form.description,
        price: Number(form.price),
        imageUrl: form.imageUrl,
      };
      if (editingProduct) await updateProduct(editingProduct.id, payload);
      else await createProduct(payload);
      setPendingImageUrl(null);
      setDialogOpen(false);
      await loadData();
    } catch {
      alert('Failed to save product');
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    if (pendingImageUrl) {
      await deleteUploadedImage(pendingImageUrl);
      setPendingImageUrl(null);
    }
    setDialogOpen(false);
  }

  if (loading) return <ProductSkeleton />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Products</h2>
          <p className="text-muted-foreground">Manage your menu items</p>
        </div>
        <Button onClick={handleAddProduct} className="h-11 shrink-0 gap-2 rounded-xl px-5 text-base font-semibold">
          <Plus className="h-4 w-4" />
          Add product
        </Button>
      </div>

      <ProductToolbar
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
      />

      {/* Grid */}
      {paginatedProducts.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <p className="font-semibold">
            {searchQuery ? `No products match "${searchQuery}"` : 'No products in this category yet'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchQuery ? 'Try a different name.' : 'Add a product to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {paginatedProducts.map((product) => {
            const info = categoryInfo.get(String(product.categoryId));
            return (
              <ProductCard
                key={product.id}
                product={product}
                categoryName={info?.name}
                tint={info?.tint ?? TINTS[0]}
                onEdit={handleEditProduct}
                onMore={setActionProduct}
                onToggleAvailability={(p) => toggleProductAvailability(p.id)}
              />
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <ProductPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      )}

      <ProductActionsSheet
        product={actionProduct}
        onClose={() => setActionProduct(null)}
        onEdit={handleEditProduct}
        onDelete={handleRequestDelete}
      />

      <DeleteProductDialog
        product={deleteTarget}
        deleting={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />

      <ProductDialog
        open={dialogOpen}
        editingProduct={editingProduct}
        form={form}
        categories={categories}
        saving={saving}
        uploading={uploading}
        onOpenChange={setDialogOpen}
        onFormChange={setForm}
        onFileChange={handleFileChange}
        onCancel={handleCancel}
        onSave={handleSave}
      />
    </div>
  );
}