export interface ProductForm {
  categoryId: number | null;
  name: string;
  description: string;
  price: string;
  imageUrl: string;
}

export const initialProductForm: ProductForm = {
  categoryId: null,
  name: '',
  description: '',
  price: '',
  imageUrl: '',
};

export interface Product {
  id: number;
  categoryId: number | null;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  isAvailable: boolean;
  Category?: {
    id: number;
    name: string;
  };
}