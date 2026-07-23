import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth-server';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = requireAdmin(req);
  if (error) return error;

  const accountId = parseInt(params.id, 10);
  if (isNaN(accountId)) {
    return NextResponse.json({ detail: 'ID Akun tidak valid' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { name } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ detail: 'Nama akun tidak boleh kosong' }, { status: 400 });
    }

    const cleanName = String(name).trim();

    const account = db.prepare('SELECT id, name FROM accounts WHERE id = ?').get(accountId) as any;
    if (!account) {
      return NextResponse.json({ detail: 'Akun tidak ditemukan' }, { status: 404 });
    }

    const oldName = account.name;

    if (oldName.toLowerCase() !== cleanName.toLowerCase()) {
      const existing = db.prepare('SELECT id FROM accounts WHERE LOWER(name) = LOWER(?)').get(cleanName);
      if (existing) {
        return NextResponse.json({ detail: `Nama akun '${cleanName}' sudah terdaftar` }, { status: 400 });
      }
    }

    // Update user assignments linked to old name
    db.prepare('UPDATE user_account_assignments SET account_tab_name = ? WHERE account_tab_name = ?').run(cleanName, oldName);

    // Update account name
    db.prepare('UPDATE accounts SET name = ? WHERE id = ?').run(cleanName, accountId);

    const updatedAccount = db.prepare('SELECT id, name, created_at FROM accounts WHERE id = ?').get(accountId) as any;
    const itemCountRow = db.prepare('SELECT COUNT(*) as total FROM content_items WHERE account_id = ?').get(accountId) as { total: number };

    return NextResponse.json({
      ...updatedAccount,
      item_count: itemCountRow ? itemCountRow.total : 0,
    });
  } catch (err: any) {
    console.error('Error on PUT /api/admin/accounts/[id]:', err);
    return NextResponse.json({ detail: 'Gagal mengupdate akun' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = requireAdmin(req);
  if (error) return error;

  const accountId = parseInt(params.id, 10);
  if (isNaN(accountId)) {
    return NextResponse.json({ detail: 'ID Akun tidak valid' }, { status: 400 });
  }

  try {
    const account = db.prepare('SELECT id, name FROM accounts WHERE id = ?').get(accountId) as any;
    if (!account) {
      return NextResponse.json({ detail: 'Akun tidak ditemukan' }, { status: 404 });
    }

    // Clean up user assignments linked to this account name
    db.prepare('DELETE FROM user_account_assignments WHERE account_tab_name = ?').run(account.name);

    // Delete account (cascade deletes content items via foreign key)
    db.prepare('DELETE FROM accounts WHERE id = ?').run(accountId);

    return NextResponse.json({ message: `Akun '${account.name}' berhasil dihapus` });
  } catch (err: any) {
    console.error('Error on DELETE /api/admin/accounts/[id]:', err);
    return NextResponse.json({ detail: 'Gagal menghapus akun' }, { status: 500 });
  }
}
