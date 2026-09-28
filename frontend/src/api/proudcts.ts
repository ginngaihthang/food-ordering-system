import { apiClient } from "./client";

export interface Product {
    id: number;
    categoryId: number | null;
    name: string;
    description: string | null;
    price: string;
    imageUrl: string | null;
    isAvailable: boolean;
    Category?: { id: number; name: string};
}

export interface ProductInput {
    categoryId: number;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    isAvailable?: boolean;
    
}

export async function fetchProducts(): Promise<Product[]> {
    const res = await apiClient.get('api/products');
    return res.data
}

export async function createProduct(data: ProductInput) : Promise<Product> {
    const res = await apiClient.post('/api/products', data)
    return res.data
}

export async function updateProduct(id: number, data: Partial<ProductInput>): Promise<Product> {
    const res = await apiClient.put(`/api/products/${id}`, data)
    return res.data
}

export async function deleteProduct(id:number) : Promise<void> {
    await apiClient.delete(`/api/products/${id}`)
}

export async function toggleAvailability(id: number) : Promise<Product> {
    const res = await apiClient.patch(`/api/products/${id}/availability`)
    return res.data
}