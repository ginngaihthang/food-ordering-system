import { Op, type Transaction } from 'sequelize';
import { sequelize, Order } from '../models/index.js';

// Any fixed number works. It only has to be the same for every pickup-number request.
const PICKUP_LOCK_KEY = 7101;

export async function getNextPickupNumber(t: Transaction): Promise<number> {
  // Only one transaction can hold this lock at a time. Others wait here until it
  // commits or rolls back, and then see the number it just used.
  await sequelize.query('SELECT pg_advisory_xact_lock(:key)', {
    replacements: { key: PICKUP_LOCK_KEY },
    transaction: t,
  });

  // The counter restarts every day (server's local midnight)
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // Cancelled orders are counted too, so a number is never handed out twice in a day
  const highest = await Order.max('pickupNumber', {
    where: { orderType: 'TAKEAWAY', createdAt: { [Op.gte]: startOfToday } },
    transaction: t,
  });

  return (Number(highest) || 0) + 1;
}