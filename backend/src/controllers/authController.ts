import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { User } from '../models/index.js';
import { signToken } from '../utils/jwt.js';

export async function login(req: Request, res:Response ) : Promise<void> {
    const { email, password } = req.body as { email?: string; password?: string};
        
    if (!email || !password) {
        res.status(400).json({ message: 'Email and password are requried'})
        return;
    }
    
    const user = await User.findOne( { where: { email}});

    if (!user) {
        res.status(401).json({ message: 'Invalid credentials'})
        return;
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        res.status(401).json({ message: "Invalid credentials"})
        return;
    }

    const token = signToken({ userId: user.id, role: user.role});

    res.json({
        token,
        user: { id: user.id, username: user.username, role: user.role}
    })
}

import type { AuthenticatedRequest } from '../middleware/auth.js';

export async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Not signed in' });
      return;
    }

    const { currentPassword, newPassword } = (req.body ?? {}) as {
      currentPassword?: unknown;
      newPassword?: unknown;
    };

    if (typeof currentPassword !== 'string' || !currentPassword) {
      res.status(400).json({ message: 'Current password is required' });
      return;
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      res.status(400).json({ message: 'New password must be at least 8 characters' });
      return;
    }
    if (newPassword.length > 72) {
      res.status(400).json({ message: 'New password must be 72 characters or less' });
      return;
    }
    if (newPassword === currentPassword) {
      res.status(400).json({ message: 'New password must be different from the current one' });
      return;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // 400 rather than 401 on purpose: the frontend logs you out on any 401
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      res.status(400).json({ message: 'Current password is incorrect' });
      return;
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (err) {
    console.error('changePassword failed:', err);
    res.status(500).json({ message: 'Failed to update password' });
  }
}