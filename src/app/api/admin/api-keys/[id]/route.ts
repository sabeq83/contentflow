import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = requireAdmin(req);
  if (error) return error;

  const keyId = parseInt(params.id, 10);
  if (isNaN(keyId)) {
    return NextResponse.json({ detail: 'ID API Key tidak valid' }, { status: 400 });
  }

  try {
    const apiKey = db.prepare('SELECT id, name FROM api_keys WHERE id = ?').get(keyId) as any;
    if (!apiKey) {
      return NextResponse.json({ detail: 'API Key tidak ditemukan' }, { status: 404 });
    }

    db.prepare('DELETE FROM api_keys WHERE id = ?').run(keyId);

    return NextResponse.json({ message: `API Key '${apiKey.name}' berhasil dicabut` });
  } catch (err: any) {
    console.error('Error on DELETE /api/admin/api-keys/[id]:', err);
    return NextResponse.json({ detail: 'Gagal mencabut API Key' }, { status: 500 });
  }
}
