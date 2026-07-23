import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import db from './db';

const SECRET_KEY = process.env.JWT_SECRET || 'secret-key-super-secret-contentflow-v2';

export interface UserPayload {
  id?: number;
  username: string;
  role: string;
  sub?: string;
  exp?: number;
}

export function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

export function verifyPassword(plainPassword: string, hashedPassword: string): boolean {
  try {
    return bcrypt.compareSync(plainPassword, hashedPassword);
  } catch (err) {
    return false;
  }
}

export function createAccessToken(payload: { username: string; role: string }): string {
  return jwt.sign(
    {
      sub: payload.username,
      username: payload.username,
      role: payload.role,
    },
    SECRET_KEY,
    { expiresIn: '30d' }
  );
}

export function verifyToken(token: string): UserPayload | null {
  try {
    const decoded = jwt.verify(token, SECRET_KEY) as UserPayload;
    return decoded;
  } catch (err) {
    return null;
  }
}

export function getCurrentUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return null;
  }

  const username = decoded.username || decoded.sub;
  if (!username) {
    return null;
  }

  const user = db.prepare('SELECT id, username, email, role, is_active FROM users WHERE username = ?').get(username) as any;
  if (!user || !user.is_active) {
    return null;
  }

  const assignments = db.prepare('SELECT account_tab_name FROM user_account_assignments WHERE user_id = ?').all(user.id) as { account_tab_name: string }[];
  user.assignments = assignments;

  return user;
}

export function requireAdmin(req: NextRequest) {
  const user = getCurrentUser(req);
  if (!user) {
    return { user: null, error: NextResponse.json({ detail: 'Tidak terotentikasi' }, { status: 401 }) };
  }
  if (user.role !== 'admin') {
    return { user: null, error: NextResponse.json({ detail: 'Akses ditolak. Membutuhkan role admin' }, { status: 403 }) };
  }
  return { user, error: null };
}
