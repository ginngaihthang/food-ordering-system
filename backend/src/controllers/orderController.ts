import type { Request, Response } from 'express';
import { sequelize, Order, OrderItem, Product, RestaurantTable, TableSession, Checkout } from '../models/index.js';
import { findOrCreateActiveSession } from '../utils/sessionHelpers.js';
import { getIO } from '../sockets/index.js';
import type { OrderWithItems } from '../type/order.js';
import { Op } from 'sequelize';
import { getNextPickupNumber } from '../utils/pickupNumber.js';
import { getSettings } from '../utils/settings.js';
import { generateOrderToken, ORDER_TOKEN_PATTERN } from '../utils/orderToken.js';
import { summarizeTax } from '../utils/tax.js';
import { refundCheckoutPayment } from '../services/checkoutService.js';

interface OrderItemInput {
  productId: number;
  quantity: number;
  notes?: string;
}

const STATUS_TO_DISPLAY: Record<string, string> = {
  PENDING: 'Received',
  PREPARING: 'Preparing',
  READY: 'Ready',
  COMPLETED: 'Served',
  CANCELLED: 'Cancelled',
};

const MAX_ITEMS_PER_ORDER = 30;
const MAX_QUANTITY_PER_ITEM = 20;
const MAX_PENDING_PER_TABLE = 5; // orders staff haven't accepted yet
const MAX_PENDING_TAKEAWAY = 30;

// Thrown inside the transaction to roll it back and give the customer a clear message
class OrderRejected extends Error {
  status: number;
  extra: Record<string, unknown>;
  constructor(status: number, message: string, extra: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}
export async function createOrder(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as { orderType?: unknown; tableToken?: unknown; items?: unknown };

  const orderType =
    body.orderType === 'DINE_IN' || body.orderType === 'TAKEAWAY' ? body.orderType : null;
  if (!orderType) {
    res.status(400).json({ message: 'Valid orderType is required' });
    return;
  }

  const tableToken = typeof body.tableToken === 'string' ? body.tableToken.trim() : '';
  if (orderType === 'DINE_IN' && !tableToken) {
    res.status(400).json({ message: 'tableToken is required for dine-in orders' });
    return;
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    res.status(400).json({ message: 'Order must contain at least one item' });
    return;
  }
  if (body.items.length > MAX_ITEMS_PER_ORDER) {
    res.status(400).json({ message: `An order can have at most ${MAX_ITEMS_PER_ORDER} items` });
    return;
  }

  // product id -> quantity (the same product listed twice is merged)
  const quantities = new Map<number, number>();
  for (const raw of body.items as unknown[]) {
    const item = (raw ?? {}) as { productId?: unknown; quantity?: unknown };
    const productId = Number(item.productId);
    const quantity = Number(item.quantity);

    if (!Number.isInteger(productId) || productId <= 0) {
      res.status(400).json({ message: 'Invalid product in order' });
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      res.status(400).json({ message: 'Invalid quantity in order' });
      return;
    }
    quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
  }
  for (const quantity of quantities.values()) {
    if (quantity > MAX_QUANTITY_PER_ITEM) {
      res.status(400).json({ message: `You can order at most ${MAX_QUANTITY_PER_ITEM} of one item` });
      return;
    }
  }

  try {
    // Checked before any transaction is opened, so nothing is left hanging
    const settings = await getSettings();
    if (orderType === 'DINE_IN' && !settings.acceptDineIn) {
      res.status(403).json({
        message: settings.closedMessage || 'Dine-in ordering is paused right now. Please ask staff for help.',
      });
      return;
    }
    if (orderType === 'TAKEAWAY' && settings.takeawayPrepay) {
      res.status(403).json({ message: 'Takeaway orders must be paid online. Please use the Pay button.' });
      return;
    }
    if (orderType === 'TAKEAWAY' && !settings.acceptTakeaway) {
      res.status(403).json({
        message: settings.closedMessage || 'Takeaway ordering is paused right now.',
      });
      return;
    }

    // Managed transaction: it rolls back automatically if anything throws
    const orderId = await sequelize.transaction(async (t) => {
      let tableSessionId: number | null = null;

      if (orderType === 'DINE_IN') {
        // Locking the table row makes simultaneous orders for one table wait
        // in line, so only one of them can create the session
        const table = await RestaurantTable.findOne({
          where: { qrToken: tableToken },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        if (!table) throw new OrderRejected(404, 'Invalid table QR code');

        const session = await findOrCreateActiveSession(table, t);
        tableSessionId = session.id;

        if (session.paymentStatus === 'PAID') {
            throw new OrderRejected(
              409,
              'This table\'s bill has already been paid. Please ask staff if you would like to order more.'
            );
          }

        const waiting = await Order.count({
          where: { tableSessionId: session.id, status: 'PENDING' },
          transaction: t,
        });
        if (waiting >= MAX_PENDING_PER_TABLE) {
          throw new OrderRejected(
            429,
            'You have several orders waiting for staff to accept. Please wait a moment.'
          );
        }
      } else {
        const waiting = await Order.count({
          where: { orderType: 'TAKEAWAY', status: 'PENDING' },
          transaction: t,
        });
        if (waiting >= MAX_PENDING_TAKEAWAY) {
          throw new OrderRejected(429, "We're very busy right now. Please try again in a few minutes.");
        }
      }

      // Prices always come from the database, never from the browser
      const products = await Product.findAll({
        where: { id: [...quantities.keys()] },
        transaction: t,
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      // Report every unavailable item at once, so the customer can fix the cart in one go
        const unavailableIds = [...quantities.keys()].filter((id) => !productMap.get(id)?.isAvailable);
        if (unavailableIds.length > 0) {
          const names = unavailableIds.map((id) => productMap.get(id)?.name ?? 'An item');
          throw new OrderRejected(
            409,
            `${names.join(', ')} ${names.length === 1 ? 'is' : 'are'} no longer available`,
            { unavailableProductIds: unavailableIds }
          );
        }

      const pickupNumber = orderType === 'TAKEAWAY' ? await getNextPickupNumber(t) : null;

      const order = await Order.create(
        {
          publicToken: generateOrderToken(),
          taxRate: Number(settings.taxRate), 
          tableSessionId,
          orderType,
          status: 'PENDING',
          pickupNumber,
        },
        { transaction: t }
      );

      await OrderItem.bulkCreate(
        [...quantities].map(([productId, quantity]) => {
          const unitPrice = Number(productMap.get(productId)!.price);
          return {
            orderId: order.id,
            productId,
            quantity,
            notes: null,
            unitPrice,
            subtotal: Math.round(unitPrice * quantity * 100) / 100,
          };
        }),
        { transaction: t }
      );

      return order.id;
    });

    // The transaction has committed, so it's safe to read the order back and announce it
    const fullOrder = await Order.findByPk(orderId, {
      include: [{ model: OrderItem, include: [Product] }],
    });
    const plainOrder = fullOrder?.toJSON();

    res.status(201).json(plainOrder);
    getIO().to('admin_room').emit('new_order', plainOrder);
  } catch (err) {
    if (err instanceof OrderRejected) {
      res.status(err.status).json({ message: err.message, ...err.extra });
      return;
    }
    console.error('Order creation failed:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to create order' });
    }
  }
}
export async function getOrderByToken(req: Request, res: Response): Promise<void> {
  try {
    const rawToken = req.params.token;
    const token = typeof rawToken === 'string' ? rawToken : '';
    if (!ORDER_TOKEN_PATTERN.test(token)) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    const order = await Order.findOne({
      where: { publicToken: token },
      include: [{ model: OrderItem, include: [Product] }],
    });
    if (!order) {
      // No order yet: the payment may still be on its way
      const checkout = await Checkout.findOne({
        where: { publicToken: token },
        attributes: ['status'],
      });
      if (checkout?.status === 'PENDING') {
        res.status(202).json({ awaitingPayment: true });
        return;
      }
      if (checkout?.status === 'EXPIRED') {
        res.status(410).json({ message: 'This payment was not completed, so no order was placed.' });
        return;
      }
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    res.json(order);
  } catch (err) {
    console.error('getOrderByToken failed:', err);
    res.status(500).json({ message: 'Failed to load order' });
  }
}


export async function getOrders(req: Request, res: Response): Promise<void> {
  try {
    const { status, orderType } = req.query as { status?: string; orderType?: string };

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (orderType) where.orderType = orderType;

    const orders = await Order.findAll({
      where,
      include: [
        { model: OrderItem, include: [Product] },
        { model: TableSession, include: [RestaurantTable] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json(orders);
  } catch (err) {
    console.error('getOrders failed:', err);
    res.status(500).json({ message: 'Failed to load orders' });
  }
}

export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { status } = req.body as { status?: string };

  const validStatuses = ['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'];
  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({ message: 'Invalid status' });
    return;
  }

  const order = await Order.findByPk(Number(id), {
    include: [{ model: OrderItem, include: [Product] }],
  });
  if (!order) {
    res.status(404).json({ message: 'Order not found' });
    return;
  }

  order.status = status as typeof order.status;
  await order.save();

  const updatedOrder = await Order.findByPk(order.id, {
    include: [{ model: OrderItem, include: [Product] }],
  });
  const plainOrder = updatedOrder?.toJSON();

  res.json(plainOrder);

  // Socket emit will go here once socket handlers are wired in (next step)
  getIO().to(`order_${order.id}`).emit('order_status_updated', order);

  // Also notify the admin dashboard, in case multiple staff are viewing the order list
  getIO().to('admin_room').emit('order_updated', order);

  if (order.tableSessionId) {
    getIO().to(`session_${order.tableSessionId}`).emit('session_order_updated', plainOrder);
  }
}

export async function getSessionOrders(req: Request, res: Response): Promise<void> {
  const { tableToken } = req.params;

  const table = await RestaurantTable.findOne({ where: { qrToken: tableToken } });
  if (!table) {
    res.status(404).json({ message: 'Invalid table QR code' });
    return;
  }

  const session = await TableSession.findOne({
    where: { tableId: table.id, closedAt: null },
  });

  if (!session) {
    res.json({ session: null, orders: [], total: 0 });
    return;
  }

  const orders = await Order.findAll({
    where: { tableSessionId: session.id },
    include: [{ model: OrderItem, include: [Product] }],
    order: [['createdAt', 'ASC']],
  });

  const plainOrders = orders.map((o) => o.toJSON()) as unknown as OrderWithItems[];

  const total = plainOrders.reduce(
    (sum, order) =>
      sum + order.OrderItems.reduce((s: number, item: any) => s + Number(item.subtotal), 0),
    0
  );

  res.json({
    session: { id: session.id, startedAt: session.startedAt },
    tableNumber: table.tableNumber,
    orders: plainOrders,
    total,
  });
}

function getDayRange(dateStr: string): { start: Date; end: Date } {
  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);

  const end = new Date(dateStr);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export async function getOrderHistory(req: Request, res: Response): Promise<void> {
    try {   
        const { date } = req.query as { date?: string };

        if (!date) {
            res.status(400).json({ message: 'date query param is required (YYYY-MM-DD)' });
            return;
        }

        const { start, end } = getDayRange(date);

        const orders = await Order.findAll({
            where: {
            createdAt: { [Op.between]: [start, end] },
            },
            include: [
            { model: OrderItem, include: [Product] },
            { model: TableSession, include: [RestaurantTable] },
            ],
            order: [['createdAt', 'DESC']],
        });

        const plainOrders = orders.map((o) => o.toJSON()) as any[];

        const nonCancelled = plainOrders.filter((o) => o.status !== 'CANCELLED');
        const cancelledCount = plainOrders.filter((o) => o.status === 'CANCELLED').length;

        const revenue = nonCancelled.reduce((sum, order) => {
            const orderTotal = order.OrderItems.reduce(
            (s: number, item: any) => s + Number(item.subtotal),
            0
            );
            return sum + orderTotal;
        }, 0);

        const avgOrder = nonCancelled.length > 0 ? revenue / nonCancelled.length : 0;

        // Peak hour — hour with the most orders
        const hourCounts: Record<number, number> = {};
        for (const order of plainOrders) {
            const hour = new Date(order.createdAt).getHours();
            hourCounts[hour] = (hourCounts[hour] ?? 0) + 1;
        }
        let peakHour = 0;
        let maxCount = 0;
        for (const [hour, count] of Object.entries(hourCounts)) {
            if (count > maxCount) {
            maxCount = count;
            peakHour = Number(hour);
            }
        }
        const peakHourLabel =
            plainOrders.length === 0
            ? '-'
            : peakHour === 0
            ? '12 AM'
            : peakHour < 12
            ? `${peakHour} AM`
            : peakHour === 12
            ? '12 PM'
            : `${peakHour - 12} PM`;

        const statusCounts: Record<string, number> = {
            RECEIVED: 0,
            PREPARING: 0,
            READY: 0,
            SERVED: 0,
            CANCELLED: 0,
        };
        const statusKeyMap: Record<string, string> = {
            PENDING: 'RECEIVED',
            PREPARING: 'PREPARING',
            READY: 'READY',
            COMPLETED: 'SERVED',
            CANCELLED: 'CANCELLED',
        };
        for (const order of plainOrders) {
            const key = statusKeyMap[order.status];
            if (key) {
            statusCounts[key] = (statusCounts[key] ?? 0) + 1;
        }
        }

        const formattedOrders = plainOrders.map((order) => {
            const orderTotal = order.OrderItems.reduce(
            (s: number, item: any) => s + Number(item.subtotal),
            0
            );
            const itemsSummary = order.OrderItems.map(
            (item: any) => `${item.quantity}× ${item.Product?.name ?? 'Item'}`
            ).join(', ');

            return {
            id: order.id,
            orderNumber: `#${String(order.id).padStart(6, '0')}`,
            time: order.createdAt,
            tableNumber: order.TableSession?.RestaurantTable?.tableNumber ?? null,
            orderType: order.orderType,
            pickupNumber: order.pickupNumber,
            items: order.OrderItems.map((item: any) => ({
                name: item.Product?.name ?? 'Item',
                quantity: item.quantity,
                subtotal: Number(item.subtotal),
            })),
            itemsSummary,
            status: order.status,
            statusLabel: STATUS_TO_DISPLAY[order.status] ?? order.status,
            total: orderTotal,
            paymentStatus: order.paymentStatus,    
            paymentMethod: order.paymentMethod, 
            };
        });

        res.json({
            date,
            totalOrders: plainOrders.length,
            revenue,
            avgOrder,
            cancelledCount,
            peakHour: peakHourLabel,
            statusCounts,
            orders: formattedOrders,
        });

    } catch (err) {
        console.error('getOrderHistory failed:', err);
        res.status(500).json({ message: 'Failed to load order history' });
    }
}

export async function getOrderHistoryWeek(req: Request, res: Response): Promise<void> {
  const { date } = req.query as { date?: string };

  if (!date) {
    res.status(400).json({ message: 'date query param is required (YYYY-MM-DD)' });
    return;
  }

  const centerDate = new Date(date);
  const days: { date: string; label: string; revenue: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(centerDate);
    d.setDate(d.getDate() - i);

    const dateKey = d.toISOString().split('T')[0]!;
    const { start, end } = getDayRange(dateKey)

    const orders = await Order.findAll({
      where: {
        createdAt: { [Op.between]: [start, end] },
        status: { [Op.ne]: 'CANCELLED' },
      },
      include: [{ model: OrderItem }],
    });

    const plainOrders = orders.map((o) => o.toJSON()) as any[];
    const revenue = plainOrders.reduce((sum, order) => {
      const orderTotal = order.OrderItems.reduce(
        (s: number, item: any) => s + Number(item.subtotal),
        0
      );
      return sum + orderTotal;
    }, 0);

    days.push({
      date: dateKey,
      label: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }),
      revenue,
    });
  }

  res.json({ days });
}

export async function payOrder(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { method } = req.body as { method?: 'CASH' | 'ONLINE' };

  if (!method || !['CASH', 'ONLINE'].includes(method)) {
    res.status(400).json({ message: 'Valid payment method (CASH or ONLINE) is required' });
    return;
  }

  const order = await Order.findByPk(Number(id));
  if (!order) {
    res.status(404).json({ message: 'Order not found' });
    return;
  }

  order.paymentStatus = 'PAID';
  order.paymentMethod = method;
  order.paidAt = new Date();
  await order.save();

  res.json({ message: 'Payment recorded', order });
}

export async function getOrderReceipt(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'Invalid order id' });
      return;
    }

    const order = await Order.findByPk(id, {
      include: [{ model: OrderItem, include: [Product] }],
    });
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    const plainOrder = order.toJSON() as any;
    const summary = summarizeTax([plainOrder]);

    res.json({
      orderId: plainOrder.id,
      orderType: plainOrder.orderType,
      pickupNumber: plainOrder.pickupNumber,
      createdAt: plainOrder.createdAt,
      paymentStatus: plainOrder.paymentStatus,
      paymentMethod: plainOrder.paymentMethod,
      paidAt: plainOrder.paidAt,
      items: plainOrder.OrderItems,
      total: summary.total,
      tax: { amount: summary.tax, rate: summary.rate, net: summary.net },
    });
  } catch (err) {
    console.error('getOrderReceipt failed:', err);
    res.status(500).json({ message: 'Failed to load receipt' });
  }
}
export async function getOrdersByTokens(req: Request, res: Response): Promise<void> {
  try {
    const raw = typeof req.query.tokens === 'string' ? req.query.tokens : '';
    const tokens = [
      ...new Set(
        raw
          .split(',')
          .map((token) => token.trim())
          .filter((token) => ORDER_TOKEN_PATTERN.test(token))
      ),
    ].slice(0, 10);

    if (tokens.length === 0) {
      res.json([]);
      return;
    }

    const orders = await Order.findAll({
      where: { publicToken: tokens, orderType: 'TAKEAWAY' },
      include: [{ model: OrderItem, include: [Product] }],
      order: [['createdAt', 'DESC']],
    });
    res.json(orders);
  } catch (err) {
    console.error('getOrdersByTokens failed:', err);
    res.status(500).json({ message: 'Failed to load orders' });
  }
}

export async function getTakeawayOrders(req: Request, res: Response): Promise<void> {
  try {
    const { date, paymentStatus } = req.query as { date?: string; paymentStatus?: string };

    const where: Record<string, unknown> = { orderType: 'TAKEAWAY' };
    if (paymentStatus) where.paymentStatus = paymentStatus;

    if (date) {
      const day = parseDateParam(date);
      if (!day) {
        res.status(400).json({ message: 'date must be in YYYY-MM-DD format' });
        return;
      }
      const { start, end } = dayBounds(day);
      where.createdAt = { [Op.between]: [start, end] };
    }

    const orders = await Order.findAll({
      where,
      include: [{ model: OrderItem, include: [Product] }],
      order: [['createdAt', 'DESC']],
    });

    res.json(orders);
  } catch (err) {
    console.error('getTakeawayOrders failed:', err);
    res.status(500).json({ message: 'Failed to load takeaway orders' });
  }
}

export async function getTakeawayWeek(req: Request, res: Response): Promise<void> {
  try {
    const { date } = req.query as { date?: string };
    const lastDay = date ? parseDateParam(date) : null;

    if (!lastDay) {
      res.status(400).json({ message: 'date must be in YYYY-MM-DD format' });
      return;
    }

    const firstDay = new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate() - 6);

    // One query for the whole week, then group by day in JS
    const orders = await Order.findAll({
      where: {
        orderType: 'TAKEAWAY',
        status: { [Op.ne]: 'CANCELLED' },
        createdAt: { [Op.between]: [dayBounds(firstDay).start, dayBounds(lastDay).end] },
      },
      include: [{ model: OrderItem }],
    });

    const totals = new Map<string, { revenue: number; count: number }>();
    for (const order of orders) {
      const plain = order.toJSON() as any;
      const key = formatDateParam(new Date(plain.createdAt));
      const orderTotal = plain.OrderItems.reduce(
        (sum: number, item: any) => sum + Number(item.subtotal),
        0
      );
      const entry = totals.get(key) ?? { revenue: 0, count: 0 };
      entry.revenue += orderTotal;
      entry.count += 1;
      totals.set(key, entry);
    }

    const days: { date: string; revenue: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate() - i);
      const key = formatDateParam(d);
      const entry = totals.get(key);
      days.push({ date: key, revenue: entry?.revenue ?? 0, count: entry?.count ?? 0 });
    }

    res.json({ days });
  } catch (err) {
    console.error('getTakeawayWeek failed:', err);
    res.status(500).json({ message: 'Failed to load takeaway week' });
  }
}

function parseDateParam(dateStr: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return isNaN(date.getTime()) ? null : date;
}

function formatDateParam(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function dayBounds(d: Date): { start: Date; end: Date } {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return { start, end };
}
export async function cancelOrder(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'Invalid order id' });
      return;
    }

    const order = await Order.findByPk(id);
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (order.status === 'CANCELLED') {
      res.status(400).json({ message: 'Order is already cancelled' });
      return;
    }
    if (order.status === 'COMPLETED') {
      res.status(400).json({ message: "Completed orders can't be cancelled" });
      return;
    }

    // Takeaway orders paid online can be cancelled, and the customer is refunded in full
    const paidOnline =
      order.orderType === 'TAKEAWAY' &&
      order.paymentStatus === 'PAID' &&
      order.paymentMethod === 'ONLINE';
    const paymentIntentId = paidOnline
      ? ((await Checkout.findOne({
          where: { orderId: order.id },
          attributes: ['stripePaymentIntentId'],
        }))?.stripePaymentIntentId ?? null)
      : null;

    let alreadyPaid = order.paymentStatus === 'PAID';
    if (!alreadyPaid && order.tableSessionId) {
      const session = await TableSession.findByPk(order.tableSessionId);
      alreadyPaid = session?.paymentStatus === 'PAID';
    }
    if (alreadyPaid && !paymentIntentId) {
      res.status(400).json({ message: "This order has already been paid and can't be cancelled" });
      return;
    }

    // Refund first. If it fails, the order stays as it was.
    if (paymentIntentId) {
      try {
        await refundCheckoutPayment(paymentIntentId, order.id);
      } catch (err) {
        console.error(`Refund for order ${order.id} failed:`, err);
        res.status(502).json({
          message:
            'The refund failed, so the order was not cancelled. Try again, or refund it in the Stripe dashboard.',
        });
        return;
      }
    }

    order.status = 'CANCELLED';
    await order.save();

    const updated = await Order.findByPk(order.id, {
      include: [{ model: OrderItem, include: [Product] }],
    });
    const plainOrder = updated?.toJSON();

    res.json(plainOrder);

    const io = getIO();
    io.to(`order_${order.id}`).emit('order_status_updated', plainOrder);
    io.to('admin_room').emit('order_updated', plainOrder);
    if (order.tableSessionId) {
      io.to(`session_${order.tableSessionId}`).emit('session_order_updated', plainOrder);
    }
  } catch (err) {
    console.error('cancelOrder failed:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to cancel order' });
    }
  }
}