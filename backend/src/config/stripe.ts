import dotenv from 'dotenv';
dotenv.config();

import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

export const stripe: Stripe | null = secretKey ? new Stripe(secretKey) : null;

// PayNow only works in SGD
export const stripeCurrency = (process.env.STRIPE_CURRENCY ?? 'sgd').trim().toLowerCase();

// Both keys are needed: one to create payments, one to verify Stripe's confirmations
export function isStripeConfigured(): boolean {
  return stripe !== null && Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
}