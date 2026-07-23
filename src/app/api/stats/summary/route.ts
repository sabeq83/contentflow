import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const user = getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ detail: 'Tidak terotentikasi' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const range = searchParams.get('range') || 'all';

  // Build date filter if specified
  let dateFilter = '';
  const queryParams: any[] = [];

  if (range === '7d' || range === '30d' || range === '90d') {
    const days = parseInt(range.replace('d', ''), 10);
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);
    const dateStr = dateLimit.toISOString().slice(0, 10);
    dateFilter = 'AND production_date >= ?';
    queryParams.push(dateStr);
  }

  // Account access filter for non-admin user
  let accountFilter = '';
  if (user.role !== 'admin') {
    const assignedNames = (user.assignments || []).map((a: any) => a.account_tab_name);
    if (assignedNames.length === 0) {
      return NextResponse.json({
        total_content: 0,
        total_published: 0,
        total_scheduled: 0,
        total_not_published: 0,
        platforms: {
          tiktok: { published: 0, scheduled: 0, not_published: 0 },
          facebook: { published: 0, scheduled: 0, not_published: 0 },
          instagram: { published: 0, scheduled: 0, not_published: 0 },
        },
      });
    }

    const placeholders = assignedNames.map(() => '?').join(',');
    accountFilter = `AND account_id IN (SELECT id FROM accounts WHERE name IN (${placeholders}))`;
    queryParams.push(...assignedNames);
  }

  const baseWhere = `WHERE 1=1 ${dateFilter} ${accountFilter}`;

  const allItems = db
    .prepare(`SELECT tiktok_status, facebook_status, instagram_status FROM content_items ${baseWhere}`)
    .all(...queryParams) as any[];

  let totalContent = allItems.length;
  let totalPublished = 0;
  let totalScheduled = 0;
  let totalNotPublished = 0;

  const platforms = {
    tiktok: { published: 0, scheduled: 0, not_published: 0 },
    facebook: { published: 0, scheduled: 0, not_published: 0 },
    instagram: { published: 0, scheduled: 0, not_published: 0 },
  };

  for (const item of allItems) {
    const tt = (item.tiktok_status || 'Not Published').toLowerCase();
    const fb = (item.facebook_status || 'Not Published').toLowerCase();
    const ig = (item.instagram_status || 'Not Published').toLowerCase();

    if (tt === 'published') platforms.tiktok.published++;
    else if (tt === 'scheduled') platforms.tiktok.scheduled++;
    else platforms.tiktok.not_published++;

    if (fb === 'published') platforms.facebook.published++;
    else if (fb === 'scheduled') platforms.facebook.scheduled++;
    else platforms.facebook.not_published++;

    if (ig === 'published') platforms.instagram.published++;
    else if (ig === 'scheduled') platforms.instagram.scheduled++;
    else platforms.instagram.not_published++;
  }

  totalPublished = platforms.tiktok.published + platforms.facebook.published + platforms.instagram.published;
  totalScheduled = platforms.tiktok.scheduled + platforms.facebook.scheduled + platforms.instagram.scheduled;
  totalNotPublished = platforms.tiktok.not_published + platforms.facebook.not_published + platforms.instagram.not_published;

  return NextResponse.json({
    total_content: totalContent,
    total_published: totalPublished,
    total_scheduled: totalScheduled,
    total_not_published: totalNotPublished,
    platforms,
  });
}
