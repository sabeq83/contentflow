import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin, hashPassword } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const { error } = requireAdmin(req);
  if (error) return error;

  const users = db
    .prepare('SELECT id, username, email, role, is_active, created_at FROM users ORDER BY id ASC')
    .all() as any[];

  const usersWithAssignments = users.map((u) => {
    const assignments = db
      .prepare('SELECT account_tab_name FROM user_account_assignments WHERE user_id = ?')
      .all(u.id) as { account_tab_name: string }[];
    const assigned_tabs = assignments.map((a) => a.account_tab_name);

    return {
      ...u,
      is_active: Boolean(u.is_active),
      assignments,
      assigned_tabs,
    };
  });

  return NextResponse.json(usersWithAssignments);
}

export async function POST(req: NextRequest) {
  const { error } = requireAdmin(req);
  if (error) return error;

  try {
    const body = await req.json();
    const { username, email, password, role } = body;

    if (!username || !email || !password) {
      return NextResponse.json(
        { detail: 'Username, email, dan password wajib diisi' },
        { status: 400 }
      );
    }

    const cleanUsername = String(username).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const userRole = role === 'admin' ? 'admin' : 'user';

    const existingUser = db
      .prepare('SELECT id FROM users WHERE username = ? OR email = ?')
      .get(cleanUsername, cleanEmail);

    if (existingUser) {
      return NextResponse.json(
        { detail: 'Username atau email sudah digunakan' },
        { status: 400 }
      );
    }

    const hashedPassword = hashPassword(password);

    const result = db
      .prepare(
        'INSERT INTO users (username, email, hashed_password, role, is_active) VALUES (?, ?, ?, ?, 1)'
      )
      .run(cleanUsername, cleanEmail, hashedPassword, userRole);

    const newUser = db
      .prepare('SELECT id, username, email, role, is_active, created_at FROM users WHERE id = ?')
      .get(result.lastInsertRowid) as any;

    return NextResponse.json({
      ...newUser,
      is_active: Boolean(newUser.is_active),
      assignments: [],
      assigned_tabs: [],
    });
  } catch (err: any) {
    console.error('Error on POST /api/admin/users:', err);
    return NextResponse.json(
      { detail: 'Gagal menambah user' },
      { status: 500 }
    );
  }
}
