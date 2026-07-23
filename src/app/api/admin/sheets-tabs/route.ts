import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const { error } = requireAdmin(req);
  if (error) return error;

  try {
    const accounts = db.prepare('SELECT name FROM accounts ORDER BY name ASC').all() as { name: string }[];
    const names = accounts.map((a) => a.name);
    return NextResponse.json(names);
  } catch (err: any) {
    console.error('Error on GET /api/admin/sheets-tabs:', err);
    return NextResponse.json([]);
  }
}
