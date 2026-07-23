import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin, hashPassword } from '@/lib/auth-server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = requireAdmin(req);
  if (error) return error;

  const userId = parseInt(params.id, 10);
  if (isNaN(userId)) {
    return NextResponse.json({ detail: 'ID User tidak valid' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { is_active, role, password } = body;

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) {
      return NextResponse.json({ detail: 'User tidak ditemukan' }, { status: 404 });
    }

    const updateFields: string[] = [];
    const updateParams: any[] = [];

    if (typeof is_active === 'boolean') {
      updateFields.push('is_active = ?');
      updateParams.push(is_active ? 1 : 0);
    }

    if (role && (role === 'admin' || role === 'user')) {
      updateFields.push('role = ?');
      updateParams.push(role);
    }

    if (password && String(password).trim()) {
      updateFields.push('hashed_password = ?');
      updateParams.push(hashPassword(String(password).trim()));
    }

    if (updateFields.length > 0) {
      updateParams.push(userId);
      db.prepare(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateParams);
    }

    const updatedUser = db
      .prepare('SELECT id, username, email, role, is_active, created_at FROM users WHERE id = ?')
      .get(userId) as any;

    const assignments = db
      .prepare('SELECT account_tab_name FROM user_account_assignments WHERE user_id = ?')
      .all(userId) as { account_tab_name: string }[];
    const assigned_tabs = assignments.map((a) => a.account_tab_name);

    return NextResponse.json({
      ...updatedUser,
      is_active: Boolean(updatedUser.is_active),
      assignments,
      assigned_tabs,
    });
  } catch (err: any) {
    console.error('Error on PATCH /api/admin/users/[id]:', err);
    return NextResponse.json({ detail: 'Gagal mengupdate user' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user: adminUser, error } = requireAdmin(req);
  if (error) return error;

  const userId = parseInt(params.id, 10);
  if (isNaN(userId)) {
    return NextResponse.json({ detail: 'ID User tidak valid' }, { status: 400 });
  }

  if (adminUser && adminUser.id === userId) {
    return NextResponse.json(
      { detail: 'Anda tidak dapat menghapus akun admin Anda sendiri yang sedang aktif' },
      { status: 400 }
    );
  }

  try {
    const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      return NextResponse.json({ detail: 'User tidak ditemukan' }, { status: 404 });
    }

    db.prepare('DELETE FROM user_account_assignments WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    return NextResponse.json({ message: `User '${user.username}' berhasil dihapus` });
  } catch (err: any) {
    console.error('Error on DELETE /api/admin/users/[id]:', err);
    return NextResponse.json({ detail: 'Gagal menghapus user' }, { status: 500 });
  }
}
