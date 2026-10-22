export interface Category {
  id: number;
  name: string;
  isActive: boolean;
  productCount: number;
}

export interface CategoryForm {
  name: string;
}

export const initialCategoryForm: CategoryForm = {
  name: '',
};