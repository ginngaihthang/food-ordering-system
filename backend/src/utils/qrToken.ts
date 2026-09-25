import crypto from 'crypto';

export function generateQrToken() : string {
    return crypto.randomBytes(8).toString('hex');
}