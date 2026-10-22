import type { QueryInterface } from 'sequelize';

export async function up(context: QueryInterface): Promise<void> {
  await context.sequelize.query(
    'ALTER TABLE table_sessions ADD COLUMN IF NOT EXISTS cash_received DECIMAL(10,2)'
  );
}

export async function down(context: QueryInterface): Promise<void> {
  await context.sequelize.query('ALTER TABLE table_sessions DROP COLUMN IF EXISTS cash_received');
}