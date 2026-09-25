import type { Request, Response } from 'express';
import { Category } from '../models/index.js';
import { INTEGER } from 'sequelize';

export async function getCategories(_req: Request, res: Response): Promise<void> {
  const categories = await Category.findAll({ order: [['id', 'ASC']] });
  res.json(categories);
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  const { name } = req.body as { name?: string };

  if (!name || !name.trim()) {
    res.status(400).json({ message: 'Category name is required' });
    return;
  }

  const category = await Category.create({ name: name.trim() });
  res.status(201).json(category);
}

export async function updateCategory(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name } = req.body as { name?: string };

  const category = await Category.findByPk(Number(id));
  if (!category) {
    res.status(404).json({ message: 'Category not found' });
    return;
  }

  if (name && name.trim()) {
    category.name = name.trim();
    await category.save();
  }

  res.json(category);
}

export async function deleteCategory(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const category = await Category.findByPk(Number(id));
  if (!category) {
    res.status(404).json({ message: 'Category not found' });
    return;
  }

  await category.destroy();
  res.json({ message: 'Category deleted' });
}