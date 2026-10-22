import type { Request, Response, NextFunction } from 'express';
import { verifyToken, type JwtPayload } from '../utils/jwt.js';
import { User } from '../models/index.js';

export interface AuthenticatedRequest extends Request {
  user?: { userId: number; role: string };
}

export async function requiredAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }

  let decoded: JwtPayload;
  try {
    decoded = verifyToken(token);
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
    return;
  }

  let userId: number;
  let role: string;
  try {
    // Use the role stored in the database, not the one baked into the token
    const user = await User.findByPk(decoded.userId, { attributes: ['id', 'role'] });
    if (!user) {
      res.status(401).json({ message: 'Account no longer exists' });
      return;
    }
    userId = user.id;
    role = user.role;
  } catch (err) {
    console.error('requireAuth lookup failed:', err);
    res.status(500).json({ message: 'Failed to verify account' });
    return;
  }

  req.user = { userId, role };
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    next();
  };
}