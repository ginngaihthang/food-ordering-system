import type { Request, Response } from 'express';
import { RestaurantTable } from '../models/index.js';
import { generateQrToken } from '../utils/qrToken.js';

export async function getTables(_req: Request, res: Response): Promise<void> {
  const tables = await RestaurantTable.findAll({ order: [['tableNumber', 'ASC']] });
  res.json(tables);
}

export async function createTable(req: Request, res: Response): Promise<void> {
  const { tableNumber } = req.body as { tableNumber?: number };

  if (!tableNumber) {
    res.status(400).json({ message: 'tableNumber is required' });
    return;
  }

  const existing = await RestaurantTable.findOne({ where: { tableNumber } });
  if (existing) {
    res.status(400).json({ message: 'A table with this number already exists' });
    return;
  }

  const qrToken = generateQrToken();

  const table = await RestaurantTable.create({
    tableNumber,
    qrToken,
    status: 'AVAILABLE',
  });

  res.status(201).json(table);
}

export async function updateTable(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { tableNumber } = req.body as { tableNumber?: number };

  const table = await RestaurantTable.findByPk(id);
  if (!table) {
    res.status(404).json({ message: 'Table not found' });
    return;
  }

  if (tableNumber !== undefined) {
    const existing = await RestaurantTable.findOne({ where: { tableNumber } });
    if (existing && existing.id !== table.id) {
      res.status(400).json({ message: 'A table with this number already exists' });
      return;
    }
    table.tableNumber = tableNumber;
  }

  await table.save();
  res.json(table);
}

export async function deleteTable(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const table = await RestaurantTable.findByPk(id);
  if (!table) {
    res.status(404).json({ message: 'Table not found' });
    return;
  }

  if (table.status === 'OCCUPIED') {
    res.status(400).json({ message: 'Cannot delete a table with an active session' });
    return;
  }

  await table.destroy();
  res.json({ message: 'Table deleted' });
}

export async function regenerateQrToken(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const table = await RestaurantTable.findByPk(id);
  if (!table) {
    res.status(404).json({ message: 'Table not found' });
    return;
  }

  table.qrToken = generateQrToken();
  await table.save();
  res.json(table);
}