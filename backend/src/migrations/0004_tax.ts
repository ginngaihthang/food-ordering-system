import type { QueryInterface } from 'sequelize';

export async function up(context: QueryInterface): Promise<void> {
  const db = context.sequelize;
  await db.query('ALTER TABLE settings ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0');
  await db.query("ALTER TABLE settings ADD COLUMN IF NOT EXISTS tax_label VARCHAR(20) NOT NULL DEFAULT 'Tax'");
  await db.query("ALTER TABLE settings ADD COLUMN IF NOT EXISTS tax_number VARCHAR(50) NOT NULL DEFAULT ''");
  await db.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0');
}

export async function down(context: QueryInterface): Promise<void> {
  const db = context.sequelize;
  await db.query('ALTER TABLE settings DROP COLUMN IF EXISTS tax_rate');
  await db.query('ALTER TABLE settings DROP COLUMN IF EXISTS tax_label');
  await db.query('ALTER TABLE settings DROP COLUMN IF EXISTS tax_number');
  await db.query('ALTER TABLE orders DROP COLUMN IF EXISTS tax_rate');
}