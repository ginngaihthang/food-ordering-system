import type { Request, Response } from 'express';
import { Checkout, Product } from '../models/index.js';
import { stripe, stripeCurrency, isStripeConfigured } from '../config/stripe.js';
import { getSettings } from '../utils/settings.js';
import { generateOrderToken } from '../utils/orderToken.js';
import { parseOrderItems } from '../utils/orderInput.js';

const CHECKOUT_MINUTES = 31; // Stripe needs the expiry at least 30 minutes ahead
const MAX_OPEN_CHECKOUTS = 200;

export async function createTakeawayCheckout(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as { items?: unknown };
  const parsed = parseOrderItems(body.items);
  if (!parsed.ok) {
    res.status(400).json({ message: parsed.message });
    return;
  }

  try {
    const settings = await getSettings();
    if (!settings.acceptTakeaway) {
      res.status(403).json({
        message: settings.closedMessage || 'Takeaway ordering is paused right now.',
      });
      return;
    }
    if (!settings.takeawayPrepay) {
      res.status(400).json({ message: 'Online payment is not turned on for takeaway.' });
      return;
    }
    if (!stripe || !isStripeConfigured()) {
      res
        .status(503)
        .json({ message: 'Online payment is not available right now. Please ask staff for help.' });
      return;
    }

    const openCount = await Checkout.count({ where: { status: 'PENDING' } });
    if (openCount >= MAX_OPEN_CHECKOUTS) {
      res
        .status(429)
        .json({ message: "We're very busy right now. Please try again in a few minutes." });
      return;
    }

    // Prices always come from the database, never from the browser
    const products = await Product.findAll({ where: { id: [...parsed.quantities.keys()] } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const unavailableIds = [...parsed.quantities.keys()].filter(
      (id) => !productMap.get(id)?.isAvailable
    );
    if (unavailableIds.length > 0) {
      const names = unavailableIds.map((id) => productMap.get(id)?.name ?? 'An item');
      res.status(409).json({
        message: `${names.join(', ')} ${names.length === 1 ? 'is' : 'are'} no longer available`,
        unavailableProductIds: unavailableIds,
      });
      return;
    }

    const items = [...parsed.quantities].map(([productId, quantity]) => {
      const product = productMap.get(productId)!;
      return {
        productId,
        name: product.name,
        quantity,
        unitPrice: Math.round(Number(product.price) * 100) / 100,
      };
    });
    const totalCents = items.reduce(
      (sum, item) => sum + Math.round(item.unitPrice * 100) * item.quantity,
      0
    );

    const expiresAt = new Date(Date.now() + CHECKOUT_MINUTES * 60_000);
    const checkout = await Checkout.create({
      publicToken: generateOrderToken(),
      items,
      totalCents,
      currency: stripeCurrency,
      taxRate: Number(settings.taxRate),
      expiresAt,
    });

    try {
      const clientUrl = (process.env.CLIENT_URL ?? '').replace(/\/+$/, '');
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: items.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: stripeCurrency,
            unit_amount: Math.round(item.unitPrice * 100),
            product_data: { name: item.name },
          },
        })),
        client_reference_id: checkout.publicToken,
        metadata: { checkoutId: String(checkout.id) },
        success_url: `${clientUrl}/order/${checkout.publicToken}?paid=1`,
        cancel_url: `${clientUrl}/cart`,
        expires_at: Math.floor(expiresAt.getTime() / 1000),
      });

      if (!session.url) throw new Error('Stripe returned no checkout address');

      checkout.stripeSessionId = session.id;
      await checkout.save();

      res.status(201).json({ url: session.url, publicToken: checkout.publicToken });
    } catch (err) {
      console.error('Could not create the Stripe checkout session:', err);
      checkout.status = 'EXPIRED';
      await checkout.save();
      res.status(502).json({ message: 'Could not start the payment. Please try again.' });
    }
  } catch (err) {
    console.error('createTakeawayCheckout failed:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to start the payment' });
    }
  }
}