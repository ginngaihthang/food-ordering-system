import type { Request, Response } from 'express';
import { Product, Category } from '../models/index.js';

export async function getProducts(_req: Request, res: Response): Promise<void> {
  const products = await Product.findAll({
    include: [{ model: Category, attributes: ['id', 'name'] }],
    order: [['id', 'ASC']],
  });
  res.json(products);
}

export async function createProduct(req: Request, res: Response): Promise<void> {
  const { categoryId, name, description, price, imageUrl, isAvailable } = req.body as {
    categoryId?: number;
    name?: string;
    description?: string;
    price?: number;
    imageUrl?: string;
    isAvailable?: boolean;
  };

  if (!categoryId || !name || price === undefined) {
    res.status(400).json({ message: 'categoryId, name, and price are required' });
    return;
  }

  const category = await Category.findByPk(categoryId);
  if (!category) {
    res.status(400).json({ message: 'Invalid categoryId' });
    return;
  }

  const product = await Product.create({
    categoryId,
    name: name.trim(),
    description: description?.trim() ?? null,
    price,
    imageUrl: imageUrl ?? null,
    isAvailable: isAvailable ?? true,
  });

  res.status(201).json(product);
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { categoryId, name, description, price, imageUrl, isAvailable } = req.body as {
    categoryId?: number;
    name?: string;
    description?: string;
    price?: number;
    imageUrl?: string;
    isAvailable?: boolean;
  };

  const product = await Product.findByPk(Number(id));
  if (!product) {
    res.status(404).json({ message: 'Product not found' });
    return;
  }

  if (categoryId !== undefined) product.categoryId = categoryId;
  if (name !== undefined) product.name = name.trim();
  if (description !== undefined) product.description = description.trim();
  if (price !== undefined) product.price = price;
  if (imageUrl !== undefined) product.imageUrl = imageUrl;
  if (isAvailable !== undefined) product.isAvailable = isAvailable;

  await product.save();
  res.json(product);
}

export async function deleteProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const product = await Product.findByPk(Number(id));
  if (!product) {
    res.status(404).json({ message: 'Product not found' });
    return;
  }

  await product.destroy();
  res.json({ message: 'Product deleted' });
}

export async function toggleAvailability(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const product = await Product.findByPk(Number(id));
  if (!product) {
    res.status(404).json({ message: 'Product not found' });
    return;
  }

  product.isAvailable = !product.isAvailable;
  await product.save();
  res.json(product);
}