import crypto from 'crypto';

export const ORDER_TOKEN_PATTERN = /^[a-f0-9]{32}$/;
    
export function generateOrderToken(): string {
  return crypto.randomBytes(16).toString('hex');
}