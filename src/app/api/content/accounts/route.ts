import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const user = getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ detail: 'Tidak terotentikasi' }, { status: 401 });
  }

  const allAccounts = db
    .prepare('SELECT name FROM accounts ORDER BY name ASC')
    .all() as { name: string }[];

  const allAccountNames = allAccounts.map((a) => a.name);

  if (user.role === 'admin') {
    return NextResponse.json(allAccountNames);
  }

  const assignedNames = (user.assignments || []).map((a: any) => a.account_tab_name);
  const filteredAccounts = assignedNames.filter((name: string) => allAccountNames.includes(name));

  return NextResponse.json(filteredAccounts);
}
