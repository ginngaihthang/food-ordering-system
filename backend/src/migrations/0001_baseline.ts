import type { QueryInterface } from 'sequelize';
import { sequelize } from '../models/index.js';

// Creates any table that doesn't exist yet. On your current database every
// table already exists, so this changes nothing there.
export async function up(_context: QueryInterface): Promise<void> {
  await sequelize.sync();
}

export async function down(): Promise<void> {
  throw new Error('The baseline migration cannot be reverted');
}