import type { Transaction } from 'sequelize';
import { sequelize, Order, RestaurantTable, TableSession } from '../models/index.js';

const PAID_IDLE_MINUTES = 30;
const EMPTY_IDLE_MINUTES = 60;
const CHECK_EVERY_MS = 5 * 60 * 1000;
const LIVE_STATUSES = ['PENDING', 'PREPARING', 'READY'];

async function isClosable(session: TableSession, t: Transaction | null = null): Promise<boolean> {
  const orders = await Order.findAll({
    where: { tableSessionId: session.id },
    attributes: ['status', 'createdAt', 'updatedAt'],
    transaction: t,
  });

  // Never close while the kitchen still has something to do
  if (orders.some((o) => LIVE_STATUSES.includes(o.status))) return false;

  const lastActivity = Math.max(
    session.startedAt.getTime(),
    session.paidAt?.getTime() ?? 0,
    ...orders.map((o) => o.updatedAt.getTime())
  );
  const idleMinutes = (Date.now() - lastActivity) / 60000;

  const billable = orders.filter((o) => o.status !== 'CANCELLED');
  if (billable.length === 0) return idleMinutes >= EMPTY_IDLE_MINUTES;

  // Unpaid sessions are never closed automatically
  if (session.paymentStatus !== 'PAID' || !session.paidAt) return false;

  // Something was ordered after the bill was paid, so that part is still unpaid
  const paidAt = session.paidAt.getTime();
  if (billable.some((o) => o.createdAt.getTime() > paidAt)) return false;

  return idleMinutes >= PAID_IDLE_MINUTES;
}

export async function closeIdleSessions(): Promise<number> {
  const openSessions = await TableSession.findAll({ where: { closedAt: null } });
  let closedCount = 0;

  for (const candidate of openSessions) {
    try {
      if (!(await isClosable(candidate))) continue;

      const closed = await sequelize.transaction(async (t) => {
        // Same lock createOrder takes, so a customer ordering right now can't be missed
        const table = await RestaurantTable.findByPk(candidate.tableId, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        const session = await TableSession.findOne({
          where: { id: candidate.id, closedAt: null },
          transaction: t,
        });
        if (!table || !session) return false;

        // Check again now that the table is locked
        if (!(await isClosable(session, t))) return false;

        session.closedAt = new Date();
        await session.save({ transaction: t });
        table.status = 'AVAILABLE';
        await table.save({ transaction: t });
        return true;
      });

      if (closed) closedCount += 1;
    } catch (err) {
      console.error(`Could not check session ${candidate.id}:`, err);
    }
  }

  return closedCount;
}

export function startIdleSessionJob(): void {
  async function run() {
    try {
      const closed = await closeIdleSessions();
      if (closed > 0) console.log(`Auto-closed ${closed} idle table session(s)`);
    } catch (err) {
      console.error('Idle session check failed:', err);
    }
  }

  void run();
  setInterval(run, CHECK_EVERY_MS).unref();
}