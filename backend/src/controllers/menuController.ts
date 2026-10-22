import type { Request, Response } from 'express';
import { Category, Product } from '../models/index.js';

export async function getMenu(_req: Request, res: Response): Promise<void> {
  const categories = await Category.findAll({
    include: [
      {
        model: Product,
        // where: { isAvailable: true },
        required: false, // still show category even if it has 0 available products
      },
    ],
    order: [['id', 'ASC']],
  });

  res.json(categories);
}