import type { QueryInterface } from 'sequelize';

// Every statement can be run twice safely
export async function up(context: QueryInterface): Promise<void> {
  const db = context.sequelize;
  await db.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS public_token VARCHAR(64)');
  await db.query(
    "UPDATE orders SET public_token = replace(gen_random_uuid()::text, '-', '') WHERE public_token IS NULL"
  );
  await db.query('ALTER TABLE orders ALTER COLUMN public_token SET NOT NULL');
  await db.query('CREATE UNIQUE INDEX IF NOT EXISTS orders_public_token_key ON orders (public_token)');
}

export async function down(context: QueryInterface): Promise<void> {
  await context.sequelize.query('ALTER TABLE orders DROP COLUMN IF EXISTS public_token');
}