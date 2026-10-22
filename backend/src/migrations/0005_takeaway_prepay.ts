import type { QueryInterface } from 'sequelize';

export async function up(context: QueryInterface): Promise<void> {
  const db = context.sequelize;

  await db.query(`
    CREATE TABLE IF NOT EXISTS checkouts (
      id SERIAL PRIMARY KEY,
      public_token VARCHAR(64) NOT NULL UNIQUE,
      stripe_session_id VARCHAR(255) UNIQUE,
      stripe_payment_intent_id VARCHAR(255),
      items JSONB NOT NULL,
      total_cents INTEGER NOT NULL,
      currency VARCHAR(3) NOT NULL,
      tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await db.query('CREATE INDEX IF NOT EXISTS checkouts_status_idx ON checkouts (status)');
  await db.query(
    'ALTER TABLE settings ADD COLUMN IF NOT EXISTS takeaway_prepay BOOLEAN NOT NULL DEFAULT false'
  );
}

export async function down(context: QueryInterface): Promise<void> {
  const db = context.sequelize;
  await db.query('DROP TABLE IF EXISTS checkouts');
  await db.query('ALTER TABLE settings DROP COLUMN IF EXISTS takeaway_prepay');
}