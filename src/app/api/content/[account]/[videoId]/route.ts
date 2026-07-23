import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-server';

export async function PUT(
  req: NextRequest,
  { params }: { params: { account: string; videoId: string } }
) {
  const user = getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ detail: 'Tidak terotentikasi' }, { status: 401 });
  }

  const accountName = decodeURIComponent(params.account).trim();
  const videoId = decodeURIComponent(params.videoId).trim();

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
    .prepare('SELECT id FROM accounts WHERE LOWER(name) = LOWER(?)')
    .get(accountName) as { id: number } | undefined;

  if (!account) {
    return NextResponse.json(
      { detail: `Akun '${accountName}' tidak ditemukan` },
      { status: 404 }
    );
  }

  try {
    const body = await req.json();
    const { tiktok, facebook, instagram } = body;

    const tiktokStatus = tiktok?.status || 'Not Published';
    const tiktokPublishDate = tiktok?.publish_date || '';
    const permalinkTiktok = tiktok?.permalink || '';

    const facebookStatus = facebook?.status || 'Not Published';
    const facebookPublishDate = facebook?.publish_date || '';
    const permalinkFb = facebook?.permalink || '';

    const instagramStatus = instagram?.status || 'Not Published';
    const instagramPublishDate = instagram?.publish_date || '';
    const permalinkIg = instagram?.permalink || '';

    const result = db
      .prepare(
        `UPDATE content_items 
         SET tiktok_status = ?, tiktok_publish_date = ?, permalink_tiktok = ?,
             facebook_status = ?, facebook_publish_date = ?, permalink_fb = ?,
             instagram_status = ?, instagram_publish_date = ?, permalink_ig = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE account_id = ? AND video_id = ?`
      )
      .run(
        tiktokStatus,
        tiktokPublishDate,
        permalinkTiktok,
        facebookStatus,
        facebookPublishDate,
        permalinkFb,
        instagramStatus,
        instagramPublishDate,
        permalinkIg,
        account.id,
        videoId
      );

    if (result.changes === 0) {
      return NextResponse.json(
        { detail: `Konten ID Video '${videoId}' tidak ditemukan di akun '${accountName}'` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Data berhasil diperbarui',
      video_id: videoId,
    });
  } catch (err: any) {
    console.error('Error on PUT /api/content/[account]/[videoId]:', err);
    return NextResponse.json(
      { detail: 'Terjadi kesalahan saat memperbarui status konten' },
      { status: 500 }
    );
  }
}
