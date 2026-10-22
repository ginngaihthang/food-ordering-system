import type { Request, Response } from 'express';
import { col, fn, literal, where as sqlWhere } from 'sequelize';
import { Category, Product } from '../models/index.js';

function parseId(value: string | undefined): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Case-insensitive duplicate check. Uses findAll in case duplicates already exist.
async function isNameTaken(name: string, excludeId?: number): Promise<boolean> {
  const matches = await Category.findAll({
    where: sqlWhere(fn('lower', col('name')), name.toLowerCase()),
  });
  return matches.some((category) => category.id !== excludeId);
}

export async function getCategories(_req: Request, res: Response): Promise<void> {
  try {
    const categories = await Category.findAll({
      attributes: {
        include: [
          [
            literal(
              '(SELECT COUNT(*)::int FROM "products" WHERE "products"."category_id" = "Category"."id")'
            ),
            'productCount',
          ],
        ],
      },
      order: [['id', 'ASC']],
    });
    res.json(categories);
  } catch (err) {
    console.error('getCategories failed:', err);
    res.status(500).json({ message: 'Failed to load categories' });
  }
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  try {
    const { name } = req.body as { name?: string };
    const trimmed = name?.trim();

    if (!trimmed) {
      res.status(400).json({ message: 'Category name is required' });
      return;
    }
    if (trimmed.length > 50) {
      res.status(400).json({ message: 'Category name must be 50 characters or less' });
      return;
    }
    if (await isNameTaken(trimmed)) {
      res.status(409).json({ message: 'A category with this name already exists' });
      return;
    }

    const category = await Category.create({ name: trimmed, isActive: true });
    res.status(201).json(category);
  } catch (err) {
    console.error('createCategory failed:', err);
    res.status(500).json({ message: 'Failed to create category' });
  }
}

export async function updateCategory(req: Request, res: Response): Promise<void> {
  try {
    const paramId = req.params.id;

    if (typeof paramId !== 'string') {
      res.status(400).json({ message: 'Invalid category id' });
      return;
    }

    const id = parseId(paramId);
    if (!id) {
      res.status(400).json({ message: 'Invalid category id' });
      return;
    }

    const { name } = req.body as { name?: string };
    const trimmed = name?.trim();

    if (!trimmed) {
      res.status(400).json({ message: 'Category name is required' });
      return;
    }
    if (trimmed.length > 50) {
      res.status(400).json({ message: 'Category name must be 50 characters or less' });
      return;
    }

    const category = await Category.findByPk(id);
    if (!category) {
      res.status(404).json({ message: 'Category not found' });
      return;
    }
    if (await isNameTaken(trimmed, id)) {
      res.status(409).json({ message: 'A category with this name already exists' });
      return;
    }

    category.name = trimmed;
    await category.save();
    res.json(category);
  } catch (err) {
    console.error('updateCategory failed:', err);
    res.status(500).json({ message: 'Failed to update category' });
  }
}

export async function toggleCategoryActive(req: Request, res: Response): Promise<void> {
  try {
    const paramId = req.params.id;

    if (typeof paramId !== 'string') {
      res.status(400).json({ message: 'Invalid category id' });
      return;
    }

    const id = parseId(paramId);
    if (!id) {
      res.status(400).json({ message: 'Invalid category id' });
      return;
    }

    const category = await Category.findByPk(id);
    if (!category) {
      res.status(404).json({ message: 'Category not found' });
      return;
    }

    category.isActive = !category.isActive;
    await category.save();
    res.json(category);
  } catch (err) {
    console.error('toggleCategoryActive failed:', err);
    res.status(500).json({ message: 'Failed to update category' });
  }
}

export async function deleteCategory(req: Request, res: Response): Promise<void> {
  try {
    const paramId = req.params.id;

    if (typeof paramId !== 'string') {
      res.status(400).json({ message: 'Invalid category id' });
      return;
    }

    const id = parseId(paramId);
    if (!id) {
      res.status(400).json({ message: 'Invalid category id' });
      return;
    }

    const category = await Category.findByPk(id);
    if (!category) {
      res.status(404).json({ message: 'Category not found' });
      return;
    }

    const productCount = await Product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      res.status(409).json({
        message: `Can't delete: ${productCount} product(s) still use this category. Move or delete them first, or hide the category instead.`,
      });
      return;
    }

    await category.destroy();
    res.json({ message: 'Category deleted' });
  } catch (err) {
    console.error('deleteCategory failed:', err);
    res.status(500).json({ message: 'Failed to delete category' });
  }
}