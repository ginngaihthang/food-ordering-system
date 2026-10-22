import type { QueryInterface } from 'sequelize';

export async function up(context: QueryInterface): Promise<void> {
  const db = context.sequelize;

  // If a table somehow has several open sessions, keep the newest and close the
  // rest. Otherwise the unique index below can't be created.
  await db.query(`
    UPDATE table_sessions SET closed_at = now()
    WHERE closed_at IS NULL
      AND id NOT IN (
        SELECT max(id) FROM table_sessions WHERE closed_at IS NULL GROUP BY table_id
      )
  `);

  // The database now refuses a second open session for the same table
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS table_sessions_one_active_per_table
    ON table_sessions (table_id) WHERE closed_at IS NULL
  `);
}

export async function down(context: QueryInterface): Promise<void> {
  await context.sequelize.query('DROP INDEX IF EXISTS table_sessions_one_active_per_table');
}