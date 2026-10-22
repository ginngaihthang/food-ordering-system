import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Order, OrderItem, Product, RestaurantTable, TableSession } from '../models/index.js';

function getDayRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function minutesAgo(dateStr: string | Date): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
}

export async function getDashboard(_req: Request, res: Response): Promise<void> {
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayRange = getDayRange(today);
    const yesterdayRange = getDayRange(yesterday);

    // ---- Today's orders ----
    const todayOrders = await Order.findAll({
      where: {
        createdAt: { [Op.between]: [todayRange.start, todayRange.end] },
        status: { [Op.ne]: 'CANCELLED' },
      },
      include: [{ model: OrderItem, include: [Product] }],
    });
    const plainTodayOrders = todayOrders.map((o) => o.toJSON()) as any[];

    const revenueToday = plainTodayOrders.reduce(
      (sum, o) => sum + o.OrderItems.reduce((s: number, i: any) => s + Number(i.subtotal), 0),
      0
    );
    const ordersToday = plainTodayOrders.length;
    const avgOrderToday = ordersToday > 0 ? revenueToday / ordersToday : 0;

    // ---- Yesterday's orders (for comparison) ----
    const yesterdayOrders = await Order.findAll({
      where: {
        createdAt: { [Op.between]: [yesterdayRange.start, yesterdayRange.end] },
        status: { [Op.ne]: 'CANCELLED' },
      },
      include: [{ model: OrderItem }],
    });
    const plainYesterdayOrders = yesterdayOrders.map((o) => o.toJSON()) as any[];

    const revenueYesterday = plainYesterdayOrders.reduce(
      (sum, o) => sum + o.OrderItems.reduce((s: number, i: any) => s + Number(i.subtotal), 0),
      0
    );
    const ordersYesterday = plainYesterdayOrders.length;
    const avgOrderYesterday = ordersYesterday > 0 ? revenueYesterday / ordersYesterday : 0;

    const revenueChangePct =
      revenueYesterday > 0 ? ((revenueToday - revenueYesterday) / revenueYesterday) * 100 : 0;
    const avgOrderChangePct =
      avgOrderYesterday > 0 ? ((avgOrderToday - avgOrderYesterday) / avgOrderYesterday) * 100 : 0;
    const ordersDiff = ordersToday - ordersYesterday;

    // ---- Active tables ----
    const allTables = await RestaurantTable.findAll({ order: [['tableNumber', 'ASC']] });
    const totalTables = allTables.length;
    const activeTables = allTables.filter((t) => t.status === 'OCCUPIED').length;

    // ---- Live orders (open orders, grouped by status) ----
    const liveOrders = await Order.findAll({
      where: { status: { [Op.in]: ['PENDING', 'PREPARING', 'READY'] } },
      include: [
        { model: OrderItem, include: [Product] },
        { model: TableSession, include: [RestaurantTable] },
      ],
      order: [['createdAt', 'ASC']],
    });

    const plainLiveOrders = liveOrders.map((o) => o.toJSON()) as any[];

    function formatLiveOrder(order: any) {
      return {
        id: order.id,
        tableNumber: order.TableSession?.RestaurantTable?.tableNumber ?? null,
        orderType: order.orderType,
        pickupNumber: order.pickupNumber,
        itemsSummary: order.OrderItems.map(
          (i: any) => `${i.quantity}× ${i.Product?.name ?? 'Item'}`
        ).join(', '),
        minutesAgo: minutesAgo(order.createdAt),
      };
    }

    const received = plainLiveOrders.filter((o) => o.status === 'PENDING').map(formatLiveOrder);
    const preparing = plainLiveOrders.filter((o) => o.status === 'PREPARING').map(formatLiveOrder);
    const ready = plainLiveOrders.filter((o) => o.status === 'READY').map(formatLiveOrder);

    // ---- Revenue last 7 days ----
    const last7Days: { label: string; date: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const range = getDayRange(d);

      const orders = await Order.findAll({
        where: {
          createdAt: { [Op.between]: [range.start, range.end] },
          status: { [Op.ne]: 'CANCELLED' },
        },
        include: [{ model: OrderItem }],
      });
      const plain = orders.map((o) => o.toJSON()) as any[];
      const revenue = plain.reduce(
        (sum, o) => sum + o.OrderItems.reduce((s: number, i: any) => s + Number(i.subtotal), 0),
        0
      );

      last7Days.push({
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        date: d.toISOString().split('T')[0]!,
        revenue,
      });
    }

    // ---- Top items today ----
    const itemCounts: Record<string, number> = {};
    for (const order of plainTodayOrders) {
      for (const item of order.OrderItems) {
        const name = item.Product?.name ?? 'Unknown';
        itemCounts[name] = (itemCounts[name] ?? 0) + item.quantity;
      }
    }
    const topItems = Object.entries(itemCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // ---- Tables grid status ----
    const tableSessions = await TableSession.findAll({ where: { closedAt: null } });
    const sessionByTableId = new Map(tableSessions.map((s) => [s.tableId, s.id]));

    const tablesGrid = await Promise.all(
      allTables.map(async (table) => {
        if (table.status === 'AVAILABLE') {
          return { tableNumber: table.tableNumber, status: 'FREE' as const };
        }

        const sessionId = sessionByTableId.get(table.id);
        if (!sessionId) {
          return { tableNumber: table.tableNumber, status: 'FREE' as const };
        }

        const sessionOrders = await Order.findAll({
          where: { tableSessionId: sessionId, status: { [Op.in]: ['PENDING', 'PREPARING', 'READY'] } },
        });

        if (sessionOrders.length === 0) {
          return { tableNumber: table.tableNumber, status: 'FREE' as const };
        }

        // Most "urgent" status to show: READY > PREPARING > PENDING
        const hasReady = sessionOrders.some((o) => o.status === 'READY');
        const hasPreparing = sessionOrders.some((o) => o.status === 'PREPARING');
        const status = hasReady ? 'READY' : hasPreparing ? 'PREPARING' : 'RECEIVED';

        return { tableNumber: table.tableNumber, status };
      })
    );

    res.json({
      revenueToday,
      revenueChangePct: Math.round(revenueChangePct),
      ordersToday,
      ordersDiff,
      avgOrderToday,
      avgOrderChangePct: Math.round(avgOrderChangePct),
      activeTables,
      totalTables,
      readyCount: ready.length,
      liveOrders: { received, preparing, ready },
      revenueLast7Days: last7Days,
      topItems,
      tablesGrid,
    });
  } catch (err) {
    console.error('getDashboard failed:', err);
    res.status(500).json({ message: 'Failed to load dashboard' });
  }
}