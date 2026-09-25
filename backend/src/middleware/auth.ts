import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';

export interface AuthenticatedRequest extends Request {
    user?: { userId: number; role: string}
}

export function requiredAuth(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message:'No token provided'})
        return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({ message: "No token provided."})
    }

    try {
        const decoded = verifyToken(token!);
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ message: "Invalid or expired token"})
    }
}

export function requireRole(...roles: string[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) : void =>  {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({ message: 'Forbidden'})
            return;
        }
        next()
    }
}