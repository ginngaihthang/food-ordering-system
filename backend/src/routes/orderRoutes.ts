import { Router } from 'express';
import {
  createOrder,
  getOrderByToken,
  getOrdersByTokens,
  getOrders,
  updateOrderStatus,
  cancelOrder,
  getSessionOrders,
  getOrderHistory,
  getOrderHistoryWeek,
  getTakeawayOrders,
  getTakeawayWeek,
  payOrder,
  getOrderReceipt,
} from '../controllers/orderController.js';
import { requiredAuth, requireRole } from '../middleware/auth.js';
import { createOrderLimiter } from '../middleware/rateLimit.js';
import { createTakeawayCheckout } from '../controllers/checkoutController.js';

const router = Router();
const staff = [requiredAuth, requireRole('ADMIN', 'STAFF')];

// Public (customers)
router.post('/', createOrderLimiter, createOrder);
router.get('/session/:tableToken', getSessionOrders);
router.get('/track/:token', getOrderByToken);
router.get('/by-tokens', getOrdersByTokens);

// Staff
router.get('/takeaway/week', ...staff, getTakeawayWeek);
router.get('/takeaway', ...staff, getTakeawayOrders);
router.post('/takeaway-checkout', createOrderLimiter, createTakeawayCheckout);
router.get('/history/week', ...staff, getOrderHistoryWeek);
router.get('/history', ...staff, getOrderHistory);
router.get('/', ...staff, getOrders);
router.get('/:id/receipt', ...staff, getOrderReceipt);
router.patch('/:id/status', ...staff, updateOrderStatus);
router.patch('/:id/cancel', ...staff, cancelOrder);
router.patch('/:id/pay', ...staff, payOrder);

export default router;