import type { Request, Response } from 'express';
import { sequelize, type Setting } from '../models/index.js';
import type { SettingValues } from '../models/Setting.js';
import { getSettings } from '../utils/settings.js';
import { isStripeConfigured } from '../config/stripe.js';

const TEXT_FIELDS = {
  restaurantName: { max: 80, required: true, label: 'Restaurant name' },
  address: { max: 200, required: false, label: 'Address' },
  phone: { max: 30, required: false, label: 'Phone' },
  receiptFooter: { max: 200, required: false, label: 'Receipt message' },
  currencySymbol: { max: 5, required: true, label: 'Currency symbol' },
  closedMessage: { max: 200, required: false, label: 'Closed message' },
  paymentInstructions: { max: 300, required: false, label: 'Payment instructions' },
  taxLabel: { max: 20, required: true, label: 'Tax name' },
  taxNumber: { max: 50, required: false, label: 'Tax registration number' },
} as const;

type TextKey = keyof typeof TEXT_FIELDS;

const BOOLEAN_FIELDS = ['acceptDineIn', 'acceptTakeaway', 'takeawayPrepay'] as const;

function toResponse(s: Setting): SettingValues {
  return {
    restaurantName: s.restaurantName,
    address: s.address,
    phone: s.phone,
    receiptFooter: s.receiptFooter,
    currencySymbol: s.currencySymbol,
    acceptDineIn: s.acceptDineIn,
    acceptTakeaway: s.acceptTakeaway,
    takeawayPrepay: s.takeawayPrepay,
    closedMessage: s.closedMessage,
    paymentInstructions: s.paymentInstructions,
    taxRate: Number(s.taxRate),
    taxLabel: s.taxLabel,
    taxNumber: s.taxNumber,
  };
}

// Public: customer pages need the name, currency and whether ordering is open
export async function getPublicSettings(_req: Request, res: Response): Promise<void> {
  try {
    res.json(toResponse(await getSettings()));
  } catch (err) {
    console.error('getPublicSettings failed:', err);
    res.status(500).json({ message: 'Failed to load settings' });
  }
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const updates: Partial<SettingValues> = {};

    for (const key of Object.keys(TEXT_FIELDS) as TextKey[]) {
      if (!(key in body)) continue;

      const rule = TEXT_FIELDS[key];
      const value = body[key];
      if (typeof value !== 'string') {
        res.status(400).json({ message: `${rule.label} must be text` });
        return;
      }

      const trimmed = value.trim();
      if (rule.required && !trimmed) {
        res.status(400).json({ message: `${rule.label} is required` });
        return;
      }
      if (trimmed.length > rule.max) {
        res.status(400).json({ message: `${rule.label} must be ${rule.max} characters or less` });
        return;
      }
      updates[key] = trimmed;
    }

    for (const key of BOOLEAN_FIELDS) {
      if (!(key in body)) continue;

      const value = body[key];
      if (typeof value !== 'boolean') {
        res.status(400).json({ message: `${key} must be true or false` });
        return;
      }
      updates[key] = value;
      
    }

    if (updates.takeawayPrepay === true && !isStripeConfigured()) {
      res.status(400).json({
        message: "Online payments aren't set up on the server yet. Add the Stripe keys first.",
      });
      return;
    }

    if ('taxRate' in body) {
      const rate = body.taxRate;
      if (typeof rate !== 'number' || !Number.isFinite(rate) || rate < 0 || rate > 50) {
        res.status(400).json({ message: 'Tax rate must be a number between 0 and 50' });
        return;
      }
      updates.taxRate = Math.round(rate * 100) / 100;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ message: 'Nothing to update' });
      return;
    }

    const settings = await getSettings();
    await settings.update(updates);
    res.json(toResponse(settings));
  } catch (err) {
    console.error('updateSettings failed:', err);
    res.status(500).json({ message: 'Failed to save settings' });
  }
}

export async function getSystemStatus(_req: Request, res: Response): Promise<void> {
  let database: 'connected' | 'disconnected' = 'disconnected';
  try {
    await sequelize.authenticate();
    database = 'connected';
  } catch (err) {
    console.error('Database check failed:', err);
  }

  res.json({
    database,
    serverTime: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    uptimeSeconds: Math.floor(process.uptime()),
    version: process.env.npm_package_version ?? '1.0.0',
    onlinePayments: isStripeConfigured(),
  });
}