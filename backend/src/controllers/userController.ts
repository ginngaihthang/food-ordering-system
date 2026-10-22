import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { Op, UniqueConstraintError, col, fn, where as sqlWhere } from 'sequelize';
import { User } from '../models/index.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

type AssignableRole = 'ADMIN' | 'STAFF';

interface UserInput {
  username: string;
  email: string;
  role: AssignableRole;
  password: string | null; // null means "not provided"
}

type ParsedInput = { ok: true; data: UserInput } | { ok: false; message: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseId(value: string | undefined): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function currentUserId(req: Request): number | undefined {
  return (req as AuthenticatedRequest).user?.userId;
}

function toPublic(user: User) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

function parseUserInput(body: unknown, passwordRequired: boolean): ParsedInput {
  const raw = (body ?? {}) as Record<string, unknown>;

  const username = typeof raw.username === 'string' ? raw.username.trim() : '';
  const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
  const role: AssignableRole | null =
    raw.role === 'ADMIN' ? 'ADMIN' : raw.role === 'STAFF' ? 'STAFF' : null;

  if (!username) return { ok: false, message: 'Username is required' };
  if (username.length > 50) return { ok: false, message: 'Username must be 50 characters or less' };
  if (!email || !EMAIL_PATTERN.test(email)) return { ok: false, message: 'A valid email is required' };
  if (email.length > 100) return { ok: false, message: 'Email must be 100 characters or less' };
  if (!role) return { ok: false, message: 'Role must be ADMIN or STAFF' };

  let password: string | null = null;
  if (typeof raw.password === 'string' && raw.password.length > 0) {
    if (raw.password.length < 8) {
      return { ok: false, message: 'Password must be at least 8 characters' };
    }
    if (raw.password.length > 72) {
      return { ok: false, message: 'Password must be 72 characters or less' }; // bcrypt ignores the rest
    }
    password = raw.password;
  } else if (passwordRequired) {
    return { ok: false, message: 'Password is required' };
  }

  return { ok: true, data: { username, email, role, password } };
}

async function isEmailTaken(email: string, excludeId?: number): Promise<boolean> {
  const matches = await User.findAll({
    where: sqlWhere(fn('lower', col('email')), email),
    attributes: ['id'],
  });
  return matches.some((user) => user.id !== excludeId);
}

async function hasOtherAdmin(excludeId: number): Promise<boolean> {
  const count = await User.count({
    where: { role: 'ADMIN', id: { [Op.ne]: excludeId } },
  });
  return count > 0;
}

export async function getUsers(_req: Request, res: Response): Promise<void> {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'role', 'createdAt'],
      order: [['id', 'ASC']],
    });
    res.json(users.map(toPublic));
  } catch (err) {
    console.error('getUsers failed:', err);
    res.status(500).json({ message: 'Failed to load users' });
  }
}

export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    const parsed = parseUserInput(req.body, true);
    if (!parsed.ok) {
      res.status(400).json({ message: parsed.message });
      return;
    }

    const { username, email, role, password } = parsed.data;
    if (!password) {
      res.status(400).json({ message: 'Password is required' });
      return;
    }

    if (await isEmailTaken(email)) {
      res.status(409).json({ message: 'A user with this email already exists' });
      return;
    }

    const user = await User.create({
      username,
      email,
      role,
      password: await bcrypt.hash(password, 10),
    });
    res.status(201).json(toPublic(user));
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      res.status(409).json({ message: 'A user with this email already exists' });
      return;
    }
    console.error('createUser failed:', err);
    res.status(500).json({ message: 'Failed to create user' });
  }
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    const paramId = req.params.id;

    if (typeof paramId !== 'string') {
      res.status(400).json({ message: 'Invalid User id' });
      return;
    }

    const id = parseId(paramId);
    if (!id) {
      res.status(400).json({ message: 'Invalid user id' });
      return;
    }

    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const parsed = parseUserInput(req.body, false);
    if (!parsed.ok) {
      res.status(400).json({ message: parsed.message });
      return;
    }
    const { username, email, role, password } = parsed.data;

    if (id === currentUserId(req) && role !== user.role) {
      res.status(400).json({ message: "You can't change your own role" });
      return;
    }
    if (user.role === 'ADMIN' && role !== 'ADMIN' && !(await hasOtherAdmin(id))) {
      res.status(400).json({ message: "You can't demote the last admin" });
      return;
    }
    if (await isEmailTaken(email, id)) {
      res.status(409).json({ message: 'A user with this email already exists' });
      return;
    }

    user.username = username;
    user.email = email;
    user.role = role;
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }
    await user.save();

    res.json(toPublic(user));
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      res.status(409).json({ message: 'A user with this email already exists' });
      return;
    }
    console.error('updateUser failed:', err);
    res.status(500).json({ message: 'Failed to update user' });
  }
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const paramId = req.params.id;

    if (typeof paramId !== 'string') {
      res.status(400).json({ message: 'Invalid User id' });
      return;
    }

    const id = parseId(paramId);
    if (!id) {
      res.status(400).json({ message: 'Invalid user id' });
      return;
    }

    if (id === currentUserId(req)) {
      res.status(400).json({ message: "You can't delete your own account" });
      return;
    }

    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (user.role === 'ADMIN' && !(await hasOtherAdmin(id))) {
      res.status(400).json({ message: "You can't delete the last admin" });
      return;
    }

    await user.destroy();
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('deleteUser failed:', err);
    res.status(500).json({ message: 'Failed to delete user' });
  }
}