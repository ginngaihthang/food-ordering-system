import type { Request, Response } from 'express';
import { sequelize,Order, OrderItem, Product, RestaurantTable, TableSession } from '../models/index.js';
import { generateQrToken } from '../utils/qrToken.js';
import type { OrderWithItems } from '../type/order.js';
import { roundMoney, summarizeTax } from '../utils/tax.js';
import { HttpError } from '../utils/httpError.js';
import { getIO } from '../sockets/index.js';

const LIVE_STATUSES = ['PENDING', 'PREPARING', 'READY'];

function parseId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}


export async function getTables(_req: Request, res: Response): Promise<void> {
  const tables = await RestaurantTable.findAll({ order: [['tableNumber', 'ASC']] });
  const sessions = await TableSession.findAll({ where: { closedAt: null } });
  const sessionIds = sessions.map((s) => s.id);

  const orders =
      sessionIds.length > 0
        ? await Order.findAll({
            where: { tableSessionId: sessionIds },
            attributes: ['id', 'tableSessionId', 'status'],
            include: [{ model: OrderItem, attributes: ['id', 'subtotal'] }],
          })
        : [];

  const ordersBySession = new Map<number, OrderWithItems[]>();
    for (const order of orders) {
      const plain = order.toJSON() as unknown as OrderWithItems;
      if (plain.tableSessionId === null) continue;

      const list = ordersBySession.get(plain.tableSessionId) ?? [];
      list.push(plain);
      ordersBySession.set(plain.tableSessionId, list);
    }

  const sessionByTableId = new Map(sessions.map((s) => [s.tableId, s]));

  res.json(
    tables.map((table) => {
      const session = sessionByTableId.get(table.id);
      if (!session) return { ...table.toJSON(), activeSession: null };

      const sessionOrders = ordersBySession.get(session.id) ?? [];
      return {
        ...table.toJSON(),
        activeSession: {
          id: session.id,
          startedAt: session.startedAt,
          orderCount: sessionOrders.filter((o) => o.status !== 'CANCELLED').length,
          total: summarizeTax(sessionOrders).total, // cancelled orders are never charged
          paymentStatus: session.paymentStatus,
          paymentMethod: session.paymentMethod,
        },
      };
    })
  );
}

export async function createTable(req: Request, res: Response): Promise<void> {
  const { tableNumber } = req.body as { tableNumber?: number };

  if (!tableNumber) {
    res.status(400).json({ message: 'tableNumber is required' });
    return;
  }

  const existing = await RestaurantTable.findOne({ where: { tableNumber } });
  if (existing) {
    res.status(400).json({ message: 'A table with this number already exists' });
    return;
  }

  const qrToken = generateQrToken();

  const table = await RestaurantTable.create({
    tableNumber,
    qrToken,
    status: 'AVAILABLE',
  });

  res.status(201).json(table);
}

export async function updateTable(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { tableNumber } = req.body as { tableNumber?: number };

  const table = await RestaurantTable.findByPk(Number(id));
  if (!table) {
    res.status(404).json({ message: 'Table not found' });
    return;
  }

  if (tableNumber !== undefined) {
    const existing = await RestaurantTable.findOne({ where: { tableNumber } });
    if (existing && existing.id !== table.id) {
      res.status(400).json({ message: 'A table with this number already exists' });
      return;
    }
    table.tableNumber = tableNumber;
  }

  await table.save();
  res.json(table);
}

export async function deleteTable(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const table = await RestaurantTable.findByPk(Number(id));
  if (!table) {
    res.status(404).json({ message: 'Table not found' });
    return;
  }

  if (table.status === 'OCCUPIED') {
    res.status(400).json({ message: 'Cannot delete a table with an active session' });
    return;
  }

  await table.destroy();
  res.json({ message: 'Table deleted' });
}

export async function regenerateQrToken(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const table = await RestaurantTable.findByPk(Number(id));
  if (!table) {
    res.status(404).json({ message: 'Table not found' });
    return;
  }

  table.qrToken = generateQrToken();
  await table.save();
  res.json(table);
}

export async function getTableByToken(req: Request, res: Response): Promise<void> {
  const { token } = req.params;

  const table = await RestaurantTable.findOne({ where: { qrToken: token } });
  if (!table) {
    res.status(404).json({ message: 'Invalid table QR code' });
    return;
  }

  res.json({ id: table.id, tableNumber: table.tableNumber, status: table.status });
}

export async function getTableSession(req: Request, res: Response): Promise<void> {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ message: 'Invalid table id' });
      return;
    }

    const table = await RestaurantTable.findByPk(id);
    if (!table) {
      res.status(404).json({ message: 'Table not found' });
      return;
    }

    const session = await TableSession.findOne({ where: { tableId: table.id, closedAt: null } });
    if (!session) {
      res.json({
        session: null,
        paymentStatus: 'UNPAID',
        paymentMethod: null,
        paidAt: null,
        cashReceived: null,
        orders: [],
        total: 0,
      });
      return;
    }

    const orders = await Order.findAll({
      where: { tableSessionId: session.id },
      include: [{ model: OrderItem, include: [Product] }],
      order: [['createdAt', 'ASC']],
    });
    const plainOrders = orders.map((o) => o.toJSON()) as unknown as OrderWithItems[];

    res.json({
      session: { id: session.id, startedAt: session.startedAt },
      paymentStatus: session.paymentStatus,
      paymentMethod: session.paymentMethod,
      paidAt: session.paidAt,
      cashReceived: session.cashReceived === null ? null : Number(session.cashReceived),
      orders: plainOrders,
      total: summarizeTax(plainOrders).total, // cancelled orders are never charged
    });
  } catch (err) {
    console.error('getTableSession failed:', err);
    res.status(500).json({ message: 'Failed to load the bill' });
  }
}

  export async function closeTableSession(req: Request, res: Response): Promise<void> {
    try {
      const id = parseId(req.params.id);
      if (!id) {
        res.status(400).json({ message: 'Invalid table id' });
        return;
      }

      await sequelize.transaction(async (t) => {
        const table = await RestaurantTable.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!table) throw new HttpError(404, 'Table not found');

        const session = await TableSession.findOne({
          where: { tableId: table.id, closedAt: null },
          transaction: t,
        });
        if (!session) throw new HttpError(400, 'No active session for this table');

        const orders = await Order.findAll({
          where: { tableSessionId: session.id },
          attributes: ['status'],
          transaction: t,
        });

        const unserved = orders.filter((o) => LIVE_STATUSES.includes(o.status)).length;
        if (unserved > 0) {
          throw new HttpError(409, `${unserved} order${unserved === 1 ? ' is' : 's are'} not served yet`);
        }

        const billable = orders.filter((o) => o.status !== 'CANCELLED').length;
        if (billable > 0 && session.paymentStatus !== 'PAID') {
          throw new HttpError(409, 'Collect payment before closing the table');
        }

        session.closedAt = new Date();
        await session.save({ transaction: t });

        table.status = 'AVAILABLE';
        await table.save({ transaction: t });
      });
      getIO().to('admin_room').emit('tables_changed');
      res.json({ message: 'Session closed' });
    } catch (err) {
      if (err instanceof HttpError) {
        res.status(err.status).json({ message: err.message });
        return;
      }

      console.error('closeTableSession failed:', err);
      res.status(500).json({ message: 'Failed to close the session' });
    }
  }

export async function payTableSession(req: Request, res: Response): Promise<void> {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ message: 'Invalid table id' });
      return;
    }

    const body = (req.body ?? {}) as { method?: unknown; amountReceived?: unknown };
    if (body.method !== undefined && body.method !== 'CASH') {
      res.status(400).json({ message: 'Table bills are paid in cash at the counter' });
      return;
    }

    const amount = body.amountReceived;
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || amount > 100000) {
      res.status(400).json({ message: 'Enter the amount received' });
      return;
    }
    const receivedCents = Math.round(amount * 100);

    const result = await sequelize.transaction(async (t) => {
      // The same lock createOrder takes, so nobody can add an order while the bill is settled
      const table = await RestaurantTable.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!table) throw new HttpError(404, 'Table not found');

      const session = await TableSession.findOne({
        where: { tableId: table.id, closedAt: null },
        transaction: t,
      });
      if (!session) throw new HttpError(400, 'No active session for this table');
      if (session.paymentStatus === 'PAID') throw new HttpError(409, 'This bill has already been paid');

      const orders = await Order.findAll({
        where: { tableSessionId: session.id },
        include: [{ model: OrderItem }],
        transaction: t,
      });
      const plainOrders = orders.map((o) => o.toJSON()) as unknown as OrderWithItems[];

      // The bill total always comes from the server, never from the browser
      const total = summarizeTax(plainOrders).total;
      if (total <= 0) throw new HttpError(400, 'There is nothing to pay');

      const totalCents = Math.round(total * 100);
      if (receivedCents < totalCents) {
        throw new HttpError(400, 'The amount received is less than the bill total');
      }

      session.paymentStatus = 'PAID';
      session.paymentMethod = 'CASH';
      session.paidAt = new Date();
      session.cashReceived = roundMoney(receivedCents / 100);
      await session.save({ transaction: t });

      return {
        total,
        cashReceived: roundMoney(receivedCents / 100),
        change: roundMoney((receivedCents - totalCents) / 100),
      };
    });
    getIO().to('admin_room').emit('tables_changed');
    res.json(result);
  } catch (err) {
    if (err instanceof HttpError) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    console.error('payTableSession failed:', err);
    res.status(500).json({ message: 'Failed to record the payment' });
  }
}

export async function getSessionReceipt(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'Invalid table id' });
      return;
    }

    const table = await RestaurantTable.findByPk(id);
    if (!table) {
      res.status(404).json({ message: 'Table not found' });
      return;
    }

    // The most recent session, so this also works after the session was closed
    const session = await TableSession.findOne({
      where: { tableId: table.id },
      order: [['id', 'DESC']],
    });
    if (!session) {
      res.status(404).json({ message: 'No session found for this table' });
      return;
    }

    const orders = await Order.findAll({
      where: { tableSessionId: session.id },
      include: [{ model: OrderItem, include: [Product] }],
      order: [['createdAt', 'ASC']],
    });
    const plainOrders = orders.map((o) => o.toJSON()) as any[];
    const summary = summarizeTax(plainOrders);

    res.json({
      tableNumber: table.tableNumber,
      sessionId: session.id,
      startedAt: session.startedAt,
      paymentStatus: session.paymentStatus,
      paymentMethod: session.paymentMethod,
      paidAt: session.paidAt,
      orders: plainOrders,
      total: summary.total,
      tax: { amount: summary.tax, rate: summary.rate, net: summary.net },
      cashReceived: session.cashReceived === null ? null : Number(session.cashReceived),
    });
  } catch (err) {
    console.error('getSessionReceipt failed:', err);
    res.status(500).json({ message: 'Failed to load receipt' });
  }
}