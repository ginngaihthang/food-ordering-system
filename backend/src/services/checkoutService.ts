import Stripe from 'stripe';
import { Op } from 'sequelize';
import { sequelize, Checkout, Order, OrderItem, Product } from '../models/index.js';
import { stripe } from '../config/stripe.js';
import { getNextPickupNumber } from '../utils/pickupNumber.js';
import { getIO } from '../sockets/index.js';

export async function fulfillPaidSession(session: Stripe.Checkout.Session): Promise<void> {
  const token = session.client_reference_id;
  if (!token) {
    console.error(`Paid Stripe session ${session.id} has no checkout reference`);
    return;
  }

  const intent = session.payment_intent;
  const paymentIntentId = typeof intent === 'string' ? intent : (intent?.id ?? null);

  const orderId = await sequelize.transaction(async (t) => {
    // Locking the row makes the webhook and the safety-net job take turns
    const checkout = await Checkout.findOne({
      where: { publicToken: token },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!checkout) {
      console.error(`Paid Stripe session ${session.id} matches no checkout (${token})`);
      return null;
    }
    // Stripe can deliver the same event more than once
    if (checkout.status === 'COMPLETED') return null;

    // What Stripe charged must equal what the server calculated
    if (
      session.amount_total !== checkout.totalCents ||
      session.currency?.toLowerCase() !== checkout.currency
    ) {
      console.error(
        `AMOUNT MISMATCH for checkout ${checkout.id}: Stripe charged ${session.amount_total} ${session.currency}, expected ${checkout.totalCents} ${checkout.currency}. No order was created. Check the Stripe dashboard.`
      );
      return null;
    }

    // A late payment is still honored even if the checkout was marked expired
    const order = await Order.create(
      {
        publicToken: checkout.publicToken,
        taxRate: Number(checkout.taxRate),
        tableSessionId: null,
        orderType: 'TAKEAWAY',
        status: 'PENDING',
        pickupNumber: await getNextPickupNumber(t),
        paymentStatus: 'PAID',
        paymentMethod: 'ONLINE',
        paidAt: new Date(),
      },
      { transaction: t }
    );

    await OrderItem.bulkCreate(
      checkout.items.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        notes: null,
        unitPrice: item.unitPrice, // the price the customer was charged
        subtotal: (Math.round(item.unitPrice * 100) * item.quantity) / 100,
      })),
      { transaction: t }
    );

    checkout.status = 'COMPLETED';
    checkout.orderId = order.id;
    checkout.stripePaymentIntentId = paymentIntentId;
    await checkout.save({ transaction: t });

    return order.id;
  });

  if (orderId === null) return;

  // The transaction has committed: tell the customer and the kitchen
  const fullOrder = await Order.findByPk(orderId, {
    include: [{ model: OrderItem, include: [Product] }],
  });
  const plainOrder = fullOrder?.toJSON();

  const io = getIO();
  io.in(`token_${token}`).socketsJoin(`order_${orderId}`); // so later status updates reach this customer
  io.to(`token_${token}`).emit('order_status_updated', plainOrder);
  io.to('admin_room').emit('new_order', plainOrder);
}

export async function markCheckoutExpired(token: string): Promise<void> {
  await Checkout.update({ status: 'EXPIRED' }, { where: { publicToken: token, status: 'PENDING' } });
}

export async function refundCheckoutPayment(paymentIntentId: string, orderId: number): Promise<void> {
  if (!stripe) throw new Error('Stripe is not configured');

  try {
    // The idempotency key means pressing Cancel twice can never refund twice
    await stripe.refunds.create(
      { payment_intent: paymentIntentId },
      { idempotencyKey: `refund-order-${orderId}` }
    );
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError && err.code === 'charge_already_refunded') return;
    throw err;
  }
}

// Safety net: if a webhook is ever missed, this still finds the paid sessions
export async function reconcileCheckouts(): Promise<void> {
  if (!stripe) return;

  const stale = await Checkout.findAll({
    where: {
      status: 'PENDING',
      stripeSessionId: { [Op.ne]: null },
      createdAt: { [Op.lt]: new Date(Date.now() - 2 * 60_000) },
    },
    order: [['id', 'ASC']],
    limit: 50,
  });

  for (const checkout of stale) {
    try {
      const session = await stripe.checkout.sessions.retrieve(checkout.stripeSessionId!);

      if (session.status === 'complete' && session.payment_status === 'paid') {
        await fulfillPaidSession(session);
      } else if (session.status === 'expired') {
        await markCheckoutExpired(checkout.publicToken);
      } else if (session.status === 'open' && checkout.expiresAt.getTime() <= Date.now()) {
        // Close the payment page first so nobody can pay for an order we're giving up on
        await stripe.checkout.sessions.expire(session.id);
        await markCheckoutExpired(checkout.publicToken);
      }
    } catch (err) {
      console.error(`Could not reconcile checkout ${checkout.id}:`, err);
    }
  }
}

export function startCheckoutJob(): void {
  async function run() {
    try {
      await reconcileCheckouts();
    } catch (err) {
      console.error('Checkout reconciliation failed:', err);
    }
  }

  void run();
  setInterval(run, 60_000).unref();
}