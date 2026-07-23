import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(req: NextRequest) {
  // Validate X-API-Key Header
  const apiKeyHeader = req.headers.get('x-api-key') || req.headers.get('X-API-Key');
  if (!apiKeyHeader) {
    return NextResponse.json(
      { detail: 'Header X-API-Key wajib disertakan' },
      { status: 401 }
    );
  }

  const apiKeyRecord = db
    .prepare('SELECT id, name, is_active FROM api_keys WHERE key = ?')
    .get(apiKeyHeader.trim()) as any;

  if (!apiKeyRecord || !apiKeyRecord.is_active) {
    return NextResponse.json(
      { detail: 'API Key tidak valid atau telah dinonaktifkan' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const rawItems = Array.isArray(body) ? body : [body];

    if (rawItems.length === 0) {
      return NextResponse.json(
        { detail: 'Payload data tidak boleh kosong' },
        { status: 400 }
      );
    }

    const processedItems: any[] = [];

    const getOrCreateAccount = (accountName: string): number => {
      const cleanName = accountName.trim();
      const existing = db
        .prepare('SELECT id FROM accounts WHERE LOWER(name) = LOWER(?)')
        .get(cleanName) as { id: number } | undefined;

      if (existing) {
        return existing.id;
      }

      const res = db.prepare('INSERT INTO accounts (name) VALUES (?)').run(cleanName);
      return Number(res.lastInsertRowid);
    };

    const upsertItem = db.transaction((item: any) => {
      const accountName = String(item.account_name || item.account_tab_name || 'General Account').trim();
      const videoId = String(item.video_id || item.id_video || '').trim();

      if (!videoId) {
        throw new Error('video_id wajib diisi');
      }

      const accountId = getOrCreateAccount(accountName);

      const existingItem = db
        .prepare('SELECT id FROM content_items WHERE account_id = ? AND video_id = ?')
        .get(accountId, videoId) as { id: number } | undefined;

      const hook = String(item.hook || '');
      const namaProduk = String(item.nama_produk || item.product_name || '');
      const linkAffiliate = String(item.link_affiliate || '');
      const linkProduk = String(item.link_produk || '');
      const urlAsset = String(item.url_asset || '');
      const caption = String(item.caption || '');
      const pipelineStatus = String(item.pipeline_status || 'Completed');
      const productionDate = String(item.production_date || new Date().toISOString().slice(0, 10));

      const tiktokStatus = String(item.tiktok_status || 'Not Published');
      const tiktokPublishDate = String(item.tiktok_publish_date || '');
      const permalinkTiktok = String(item.permalink_tiktok || '');

      const facebookStatus = String(item.facebook_status || 'Not Published');
      const facebookPublishDate = String(item.facebook_publish_date || '');
      const permalinkFb = String(item.permalink_fb || '');

      const instagramStatus = String(item.instagram_status || 'Not Published');
      const instagramPublishDate = String(item.instagram_publish_date || '');
      const permalinkIg = String(item.permalink_ig || '');

      if (existingItem) {
        db.prepare(
          `UPDATE content_items 
           SET hook = ?, nama_produk = ?, link_affiliate = ?, link_produk = ?, url_asset = ?, caption = ?,
               pipeline_status = ?, production_date = ?, tiktok_status = ?, tiktok_publish_date = ?, permalink_tiktok = ?,
               facebook_status = ?, facebook_publish_date = ?, permalink_fb = ?, instagram_status = ?,
               instagram_publish_date = ?, permalink_ig = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`
        ).run(
          hook, namaProduk, linkAffiliate, linkProduk, urlAsset, caption,
          pipelineStatus, productionDate, tiktokStatus, tiktokPublishDate, permalinkTiktok,
          facebookStatus, facebookPublishDate, permalinkFb, instagramStatus,
          instagramPublishDate, permalinkIg, existingItem.id
        );
        return { id: existingItem.id, video_id: videoId, status: 'updated' };
      } else {
        const res = db.prepare(
          `INSERT INTO content_items 
           (account_id, video_id, hook, nama_produk, link_affiliate, link_produk, url_asset, caption,
            pipeline_status, production_date, tiktok_status, tiktok_publish_date, permalink_tiktok,
            facebook_status, facebook_publish_date, permalink_fb, instagram_status, instagram_publish_date, permalink_ig)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          accountId, videoId, hook, namaProduk, linkAffiliate, linkProduk, urlAsset, caption,
          pipelineStatus, productionDate, tiktokStatus, tiktokPublishDate, permalinkTiktok,
          facebookStatus, facebookPublishDate, permalinkFb, instagramStatus, instagramPublishDate, permalinkIg
        );
        return { id: Number(res.lastInsertRowid), video_id: videoId, status: 'created' };
      }
    });

    for (const rawItem of rawItems) {
      const res = upsertItem(rawItem);
      processedItems.push(res);
    }

    return NextResponse.json({
      message: 'Ingest data berhasil diproses',
      count: processedItems.length,
      items: processedItems,
    });
  } catch (err: any) {
    console.error('Error on POST /api/v1/content/ingest:', err);
    return NextResponse.json(
      { detail: err.message || 'Gagal memproses data ingest' },
      { status: 500 }
    );
  }
}
