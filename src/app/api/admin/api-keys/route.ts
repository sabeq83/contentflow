import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const { error } = requireAdmin(req);
  if (error) return error;

  const keys = db.prepare('SELECT id, name, key, is_active, created_at FROM api_keys ORDER BY id DESC').all() as any[];

  const formatted = keys.map((k) => ({
    ...k,
    is_active: Boolean(k.is_active),
  }));

  return NextResponse.json(formatted);
}

export async function POST(req: NextRequest) {
  const { error } = requireAdmin(req);
  if (error) return error;

  try {
    const body = await req.json();
    const { name } = body;

    const keyName = name && String(name).trim() ? String(name).trim() : 'n8n Ingestion Webhook';
    const randomHex = crypto.randomBytes(16).toString('hex');
    const apiKey = `cf_live_${randomHex}`;

    const result = db
      .prepare('INSERT INTO api_keys (name, key, is_active) VALUES (?, ?, 1)')
      .run(keyName, apiKey);

    const newKey = db
      .prepare('SELECT id, name, key, is_active, created_at FROM api_keys WHERE id = ?')
      .get(result.lastInsertRowid) as any;

    return NextResponse.json({
      ...newKey,
      is_active: Boolean(newKey.is_active),
    });
  } catch (err: any) {
    console.error('Error on POST /api/admin/api-keys:', err);
    return NextResponse.json({ detail: 'Gagal membuat API Key' }, { status: 500 });
  }
}
