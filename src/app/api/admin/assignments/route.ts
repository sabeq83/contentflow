import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  const { error } = requireAdmin(req);
  if (error) return error;

  try {
    const body = await req.json();
    const { user_id, assigned_accounts, assigned_tabs } = body;

    const userId = parseInt(user_id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ detail: 'user_id tidak valid' }, { status: 400 });
    }

    const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId);
    if (!user) {
      return NextResponse.json({ detail: 'User tidak ditemukan' }, { status: 404 });
    }

    const accountsList = Array.isArray(assigned_accounts)
      ? assigned_accounts
      : Array.isArray(assigned_tabs)
      ? assigned_tabs
      : null;

    if (!accountsList) {
      return NextResponse.json(
        { detail: 'assigned_accounts atau assigned_tabs harus berupa array string' },
        { status: 400 }
      );
    }

    const deleteStmt = db.prepare('DELETE FROM user_account_assignments WHERE user_id = ?');
    const insertStmt = db.prepare(
      'INSERT INTO user_account_assignments (user_id, account_tab_name) VALUES (?, ?)'
    );

    // Transaction for assignment sync
    const syncAssignments = db.transaction((uId: number, accounts: string[]) => {
      deleteStmt.run(uId);
      for (const acc of accounts) {
        if (acc && String(acc).trim()) {
          insertStmt.run(uId, String(acc).trim());
        }
      }
    });

    syncAssignments(userId, accountsList);

    const updatedAssignments = db
      .prepare('SELECT account_tab_name FROM user_account_assignments WHERE user_id = ?')
      .all(userId) as { account_tab_name: string }[];
    const assignedTabs = updatedAssignments.map((a) => a.account_tab_name);

    return NextResponse.json({
      message: 'Penugasan akun berhasil diperbarui',
      user_id: userId,
      assignments: updatedAssignments,
      assigned_tabs: assignedTabs,
    });
  } catch (err: any) {
    console.error('Error on POST /api/admin/assignments:', err);
    return NextResponse.json({ detail: 'Gagal memperbarui penugasan akun' }, { status: 500 });
  }
}
