import type { Request, Response } from 'express';
import type Stripe from 'stripe';
import { stripe } from '../config/stripe.js';
import { fulfillPaidSession, markCheckoutExpired } from '../services/checkoutService.js';

export async function stripeWebhook(req: Request, res: Response): Promise<void> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const signature = req.headers['stripe-signature'];

  if (!stripe || !secret || typeof signature !== 'string') {
    res.status(400).send('Webhook is not configured');
    return;
  }

  // Only a request signed by Stripe gets past this point
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, secret);
  } catch (err) {
    console.error('Stripe webhook signature check failed:', err instanceof Error ? err.message : err);
    res.status(400).send('Invalid signature');
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status === 'paid') await fulfillPaidSession(session);
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.client_reference_id) await markCheckoutExpired(session.client_reference_id);
        break;
      }
      default:
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook handling failed:', err);
    res.status(500).send('Webhook handler failed'); // Stripe will try again
  }
}