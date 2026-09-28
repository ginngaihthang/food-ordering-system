import { Plus } from 'lucide-react';
import {  useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';

import { ProductSearch } from '@/components/products/ProductSearch';
import { ProductTable } from '@/components/products/ProductTable';
import { ProductPagination } from '@/components/products/ProductPagination';
import { ProductDialog } from '@/components/products/ProductDialog';

import { useProducts } from '@/hooks/useProducts';

import {
  initialProductForm,
  type Product,
  type ProductForm,
} from '@/types/product';
import { ProductSkeleton } from '@/components/products/ProductSkeleton';
import { deleteUploadedImage, uploadImage } from '@/api/uploads';
import { createProduct, updateProduct } from '@/api/proudcts';

export default function Products() {
  const {
    products,
    categories,
    loading,
    loadData,
    removeProduct,
    toggleProductAvailability,
  } = useProducts();

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);

  const [form, setForm] =
    useState<ProductForm>(initialProductForm);

  const [saving, setSaving] = useState(false);

  const [uploading, setUploading] = useState(false);

  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);

  const itemsPerPage = 10;

  const filteredProducts = useMemo(() => {
    return products.filter((product) =>
      product.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / itemsPerPage)
  );

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );



  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setCurrentPage(1);
  } 

  function handleAddProduct() {
    setEditingProduct(null);
    setForm(initialProductForm);
    setDialogOpen(true);
  }

  function handleEditProduct(product: Product) {
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


  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      if(pendingImageUrl) {
        await deleteUploadedImage(pendingImageUrl);
      }
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
        console.log(payload)
          if (editingProduct) {
            await updateProduct(editingProduct.id, payload);
          } else {
            await createProduct(payload);
          }
        setPendingImageUrl(null); // saved successfully — no longer pending
        setDialogOpen(false);
        await loadData();
      } catch {
        alert('Failed to save product');
      } finally {
        setSaving(false);
      }
    }

  async function handleCancel() {
    if(pendingImageUrl) {
      await deleteUploadedImage(pendingImageUrl);
      setPendingImageUrl(null);
    }
    setDialogOpen(false)
  }

  if (loading) {
    return <ProductSkeleton />;
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            Products
          </h2>

          <p className="text-muted-foreground">
            Manage your menu items
          </p>
        </div>

        <Button
          onClick={handleAddProduct}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Search */}
      <ProductSearch
        value={searchQuery}
        onChange={handleSearchChange}
      />

      {/* Table */}
      <ProductTable
        products={paginatedProducts}
        searchQuery={searchQuery}
        onEdit={handleEditProduct}
        onDelete={removeProduct}
        onToggleAvailability={
          toggleProductAvailability
        }
      />

      {/* Pagination */}
      <ProductPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* Dialog */}
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