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