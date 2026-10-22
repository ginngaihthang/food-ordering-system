import rateLimit from 'express-rate-limit';

function limiter(windowMinutes: number, limit: number, message: string, onlyCountFailures = false) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: onlyCountFailures,
    message: { message },
  });
}

export const apiLimiter = limiter(15, 1500, 'Too many requests. Please slow down.');

// Only failed logins count, so staff who type the right password are never blocked
export const loginLimiter = limiter(15, 10, 'Too many login attempts. Try again in 15 minutes.', true);

// Customers in the restaurant share the restaurant's wifi IP, so this is generous
export const createOrderLimiter = limiter(
  10,
  60,
  'Too many orders from this connection. Please wait a few minutes.'
);