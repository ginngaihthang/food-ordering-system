import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { verifyToken } from '../utils/jwt.js';
import { ORDER_TOKEN_PATTERN } from '../utils/orderToken.js';
import { User, Order, RestaurantTable, TableSession } from '../models/index.js';
import { allowedOrigins } from '../app.js';

const TABLE_TOKEN_PATTERN = /^[a-zA-Z0-9]{6,64}$/;

let io: Server | null = null;
function readString(payload: unknown, key: string): string | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : null;
}

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  // Staff send their login token when they connect. Customers connect without one.
  io.use(async (socket, next) => {
    const auth = socket.handshake.auth as { token?: unknown } | undefined;

    if (typeof auth?.token === 'string' && auth.token) {
      try {
        const decoded = verifyToken(auth.token);
        const user = await User.findByPk(decoded.userId, { attributes: ['id', 'role'] });
        if (user && (user.role === 'ADMIN' || user.role === 'STAFF')) {
          socket.data.userId = user.id;
          socket.data.role = user.role;
        }
      } catch {
        // expired or invalid token: treat the connection as a customer
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    const isStaff = socket.data.role === 'ADMIN' || socket.data.role === 'STAFF';

    // Staff are added here, so the membership comes back after every reconnect
    if (isStaff) socket.join('admin_room');

    // Kept for older pages. It only does anything for logged-in staff.
    socket.on('join_admin_room', () => {
      if (isStaff) socket.join('admin_room');
    });

    // A customer follows one order. They must know its private token.
    socket.on('join_order_room', async (payload: unknown) => {
      const token = readString(payload, 'token');
      if (!token || !ORDER_TOKEN_PATTERN.test(token)) return;
      socket.join(`token_${token}`);
      try {
        const order = await Order.findOne({ where: { publicToken: token }, attributes: ['id'] });
        if (order) socket.join(`order_${order.id}`);
      } catch (err) {
        console.error('join_order_room failed:', err);
      }
    });

    // A diner follows their table's running bill. They must know the table's QR token.
    socket.on('join_session_room', async (payload: unknown) => {
      const tableToken = readString(payload, 'tableToken');
      if (!tableToken || !TABLE_TOKEN_PATTERN.test(tableToken)) return;

      try {
        const table = await RestaurantTable.findOne({
          where: { qrToken: tableToken },
          attributes: ['id'],
        });
        if (!table) return;

        const session = await TableSession.findOne({
          where: { tableId: table.id, closedAt: null },
          attributes: ['id'],
        });
        if (session) socket.join(`session_${session.id}`);
      } catch (err) {
        console.error('join_session_room failed:', err);
      }
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO has not been initialized yet');
  }
  return io;
}