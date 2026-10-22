import type { Transaction } from 'sequelize';
import { TableSession, type RestaurantTable } from '../models/index.js';

export async function findOrCreateActiveSession(
  table: RestaurantTable,
  t: Transaction
): Promise<TableSession> {
  const existing = await TableSession.findOne({
    where: { tableId: table.id, closedAt: null },
    transaction: t,
  });
  if (existing) return existing;

  const session = await TableSession.create({ tableId: table.id }, { transaction: t });

  table.status = 'OCCUPIED';
  await table.save({ transaction: t });

  return session;
}