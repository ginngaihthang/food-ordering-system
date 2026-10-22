import type { QueryInterface } from 'sequelize';
import { Umzug, SequelizeStorage } from 'umzug';
import { sequelize } from '../models/index.js';
import * as baseline from './0001_baseline.js';
import * as orderPublicToken from './0002_order_public_token.js';
import * as oneActiveSession from './0003_one_active_session_per_table.js';
import * as tax from './0004_tax.js';
import * as takeawayPrepay from './0005_takeaway_prepay.js';
import * as cashReceived from './0006_cash_received.js';

const umzug = new Umzug<QueryInterface>({
  migrations: [
    {
      name: '0001_baseline',
      up: ({ context }) => baseline.up(context),
      down: () => baseline.down(),
    },
    {
      name: '0002_order_public_token',
      up: ({ context }) => orderPublicToken.up(context),
      down: ({ context }) => orderPublicToken.down(context),
    },
    {
      name: '0003_one_active_session_per_table',
      up: ({ context }) => oneActiveSession.up(context),
      down: ({ context }) => oneActiveSession.down(context),
    },
     {
      name: '0004_tax',
      up: ({ context }) => tax  .up(context),
      down: ({ context }) => tax.down(context),
    },
    {
      name: '0005_takeaway_prepay',
      up: ({ context }) => takeawayPrepay.up(context),
      down: ({ context }) => takeawayPrepay.down(context),
    },
     {
      name: '0006_cash_received',
      up: ({ context }) => cashReceived.up(context),
      down: ({ context }) => cashReceived.down(context),
    },
  ],
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

export async function runMigrations(): Promise<void> {
  await umzug.up();
}