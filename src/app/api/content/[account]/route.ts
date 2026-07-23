import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET(
  req: NextRequest,
  { params }: { params: { account: string } }
) {
  const user = getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ detail: 'Tidak terotentikasi' }, { status: 401 });
  }

  const accountName = decodeURIComponent(params.account).trim();

  // Check account access for regular user
  if (user.role !== 'admin') {
    const assignedNames = (user.assignments || []).map((a: any) => a.account_tab_name);
    if (!assignedNames.includes(accountName)) {
      return NextResponse.json(
        { detail: `Anda tidak memiliki akses ke akun '${accountName}'` },
        { status: 403 }
      );
    }
  }

  const account = db
    .prepare('SELECT id, name FROM accounts WHERE LOWER(name) = LOWER(?)')
    .get(accountName) as { id: number; name: string } | undefined;

  if (!account) {
    return NextResponse.json({
      items: [],
      total_items: 0,
      total_pages: 1,
      current_page: 1,
      limit: 20,
      available_products: [],
    });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const product = searchParams.get('product') || 'all';
  const pipelineStatus = searchParams.get('pipeline_status') || 'all';
  const tiktokStatus = searchParams.get('tiktok_status');
  const facebookStatus = searchParams.get('facebook_status');
  const instagramStatus = searchParams.get('instagram_status');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

  // Query distinct available products for this account (using single quotes for string literal in SQLite)
  const rawProducts = db
    .prepare(
      "SELECT DISTINCT nama_produk FROM content_items WHERE account_id = ? AND nama_produk != '' AND nama_produk IS NOT NULL ORDER BY nama_produk ASC"
    )
    .all(account.id) as { nama_produk: string }[];
  const availableProducts = rawProducts.map((p) => p.nama_produk.trim()).filter(Boolean);

  // Build dynamic SQL query
  const whereClauses: string[] = ['account_id = ?'];
  const queryParams: any[] = [account.id];

  if (pipelineStatus && pipelineStatus.toLowerCase() !== 'all') {
    whereClauses.push('LOWER(pipeline_status) LIKE ?');
    queryParams.push(`%${pipelineStatus.trim().toLowerCase()}%`);
  }

  if (product && product.toLowerCase() !== 'all') {
    whereClauses.push('LOWER(nama_produk) LIKE ?');
    queryParams.push(`%${product.trim().toLowerCase()}%`);
  }

  if (q && q.trim()) {
    const term = `%${q.trim().toLowerCase()}%`;
    whereClauses.push(
      '(LOWER(video_id) LIKE ? OR LOWER(hook) LIKE ? OR LOWER(nama_produk) LIKE ? OR LOWER(caption) LIKE ?)'
    );
    queryParams.push(term, term, term, term);
  }

  if (tiktokStatus && tiktokStatus !== 'Semua') {
    whereClauses.push('tiktok_status = ?');
    queryParams.push(tiktokStatus);
  }

  if (facebookStatus && facebookStatus !== 'Semua') {
    whereClauses.push('facebook_status = ?');
    queryParams.push(facebookStatus);
  }

  if (instagramStatus && instagramStatus !== 'Semua') {
    whereClauses.push('instagram_status = ?');
    queryParams.push(instagramStatus);
  }

  const whereSql = whereClauses.join(' AND ');

  // Count total matching items
  const countRow = db
    .prepare(`SELECT COUNT(*) as total FROM content_items WHERE ${whereSql}`)
    .get(...queryParams) as { total: number };
  const totalItems = countRow ? countRow.total : 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  // Fetch paginated items ordered by production_date DESC, id DESC
  const offset = (page - 1) * limit;
  const items = db
    .prepare(
      `SELECT * FROM content_items WHERE ${whereSql} ORDER BY production_date DESC, id DESC LIMIT ? OFFSET ?`
    )
    .all(...queryParams, limit, offset) as any[];

  return NextResponse.json({
    items,
    total_items: totalItems,
    total_pages: totalPages,
    current_page: page,
    limit,
    available_products: availableProducts,
  });
}
