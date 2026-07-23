import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const { error } = requireAdmin(req);
  if (error) return error;

  const accounts = db.prepare('SELECT id, name, created_at FROM accounts ORDER BY name ASC').all() as any[];

  const accountsWithCounts = accounts.map((a) => {
    const itemCountRow = db
      .prepare('SELECT COUNT(*) as total FROM content_items WHERE account_id = ?')
      .get(a.id) as { total: number };
    return {
      id: a.id,
      name: a.name,
      item_count: itemCountRow ? itemCountRow.total : 0,
      created_at: a.created_at,
    };
  });

  return NextResponse.json(accountsWithCounts);
}

export async function POST(req: NextRequest) {
  const { error } = requireAdmin(req);
  if (error) return error;

  try {
    const body = await req.json();
    const { name } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ detail: 'Nama akun tidak boleh kosong' }, { status: 400 });
    }

    const cleanName = String(name).trim();

    const existing = db
      .prepare('SELECT id FROM accounts WHERE LOWER(name) = LOWER(?)')
      .get(cleanName);

    if (existing) {
      return NextResponse.json({ detail: `Akun '${cleanName}' sudah ada` }, { status: 400 });
    }

    const result = db.prepare('INSERT INTO accounts (name) VALUES (?)').run(cleanName);
    const newAccount = db
      .prepare('SELECT id, name, created_at FROM accounts WHERE id = ?')
      .get(result.lastInsertRowid) as any;

    return NextResponse.json({
      ...newAccount,
      item_count: 0,
    });
  } catch (err: any) {
    console.error('Error on POST /api/admin/accounts:', err);
    return NextResponse.json({ detail: 'Gagal membuat akun' }, { status: 500 });
  }
}
