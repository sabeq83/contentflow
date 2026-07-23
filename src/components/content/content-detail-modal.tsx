'use client';

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { X, Copy, ExternalLink, Download, Check, Save, AlertCircle } from 'lucide-react';

export interface ContentItem {
  id: number;
  video_id: string;
  hook: string;
  nama_produk: string;
  link_affiliate?: string;
  link_produk?: string;
  url_asset?: string;
  caption?: string;
  pipeline_status: string;
  production_date?: string;
  tiktok_status: string;
  tiktok_publish_date?: string;
  permalink_tiktok?: string;
  facebook_status: string;
  facebook_publish_date?: string;
  permalink_fb?: string;
  instagram_status: string;
  instagram_publish_date?: string;
  permalink_ig?: string;
}

interface ContentDetailModalProps {
  item: ContentItem | null;
  accountName: string;
  onClose: () => void;
  onSaved: () => void;
}

// Helper to format date string into YYYY-MM-DD for <input type="date">
const formatDateForInput = (dateStr?: string): string => {
  if (!dateStr || !dateStr.trim()) return '';
  const clean = dateStr.trim();
  const match = clean.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) {
    return match[1];
  }
  const d = new Date(clean);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return clean;
};

export const ContentDetailModal: React.FC<ContentDetailModalProps> = ({
  item,
  accountName,
  onClose,
  onSaved,
}) => {
  if (!item) return null;

  const [tiktokStatus, setTiktokStatus] = useState(item.tiktok_status || 'Not Published');
  const [tiktokDate, setTiktokDate] = useState(formatDateForInput(item.tiktok_publish_date));
  const [tiktokPermalink, setTiktokPermalink] = useState(item.permalink_tiktok || '');

  const [fbStatus, setFbStatus] = useState(item.facebook_status || 'Not Published');
  const [fbDate, setFbDate] = useState(formatDateForInput(item.facebook_publish_date));
  const [fbPermalink, setFbPermalink] = useState(item.permalink_fb || '');

  const [igStatus, setIgStatus] = useState(item.instagram_status || 'Not Published');
  const [igDate, setIgDate] = useState(formatDateForInput(item.instagram_publish_date));
  const [igPermalink, setIgPermalink] = useState(item.permalink_ig || '');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Inline button feedback state ('caption' | 'affiliate' | null)
  const [copiedKey, setCopiedKey] = useState<'caption' | 'affiliate' | null>(null);

  const copyToClipboard = (text?: string, key?: 'caption' | 'affiliate') => {
    if (!text || !key) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const setTodayDate = (setter: React.Dispatch<React.SetStateAction<string>>) => {
    const today = new Date().toISOString().slice(0, 10);
    setter(today);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSaveSuccessMsg('');

    // Validations
    if (tiktokStatus === 'Scheduled' || tiktokStatus === 'Published') {
      if (!tiktokDate.trim()) {
        setErrorMsg('TikTok Publish Date wajib diisi jika status Scheduled/Published');
        return;
      }
    }
    if (tiktokStatus === 'Published') {
      if (!tiktokPermalink.trim() || (!tiktokPermalink.startsWith('http://') && !tiktokPermalink.startsWith('https://'))) {
        setErrorMsg('Permalink TikTok wajib diisi dan diawali http:// atau https://');
        return;
      }
    }

    if (fbStatus === 'Scheduled' || fbStatus === 'Published') {
      if (!fbDate.trim()) {
        setErrorMsg('Facebook Publish Date wajib diisi jika status Scheduled/Published');
        return;
      }
    }
    if (fbStatus === 'Published') {
      if (!fbPermalink.trim() || (!fbPermalink.startsWith('http://') && !fbPermalink.startsWith('https://'))) {
        setErrorMsg('Permalink FB wajib diisi dan diawali http:// atau https://');
        return;
      }
    }

    if (igStatus === 'Scheduled' || igStatus === 'Published') {
      if (!igDate.trim()) {
        setErrorMsg('Instagram Publish Date wajib diisi jika status Scheduled/Published');
        return;
      }
    }
    if (igStatus === 'Published') {
      if (!igPermalink.trim() || (!igPermalink.startsWith('http://') && !igPermalink.startsWith('https://'))) {
        setErrorMsg('Permalink IG wajib diisi dan diawali http:// atau https://');
        return;
      }
    }

    setIsSaving(true);
    try {
      await apiClient.put(`/content/${encodeURIComponent(accountName)}/${encodeURIComponent(item.video_id)}`, {
        tiktok: {
          status: tiktokStatus,
          publish_date: tiktokDate.trim() || null,
          permalink: tiktokPermalink.trim() || null,
        },
        facebook: {
          status: fbStatus,
          publish_date: fbDate.trim() || null,
          permalink: fbPermalink.trim() || null,
        },
        instagram: {
          status: igStatus,
          publish_date: igDate.trim() || null,
          permalink: igPermalink.trim() || null,
        },
      });

      setSaveSuccessMsg('Perubahan status berhasil disimpan!');
      setTimeout(() => {
        onSaved();
        onClose();
      }, 800);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Gagal menyimpan perubahan');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      {saveSuccessMsg && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-emerald-400/30 text-sm font-medium animate-bounce">
          <Check className="w-4 h-4" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      <div className="relative w-full max-w-3xl glass-panel rounded-2xl border border-slate-800 shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-mono font-bold">
              {item.video_id}
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight line-clamp-1">{item.hook}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Action Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Copy Caption Button */}
            <button
              type="button"
              onClick={() => copyToClipboard(item.caption, 'caption')}
              disabled={!item.caption}
              className={`w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                copiedKey === 'caption'
                  ? 'bg-emerald-600 text-white border border-emerald-400 shadow-emerald-600/30 scale-[1.02]'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/30 shadow-indigo-600/20 disabled:bg-slate-800/80 disabled:text-slate-400 disabled:border-slate-700/60 disabled:shadow-none'
              }`}
            >
              {copiedKey === 'caption' ? (
                <>
                  <Check className="w-4 h-4 text-white shrink-0" />
                  <span className="text-white font-extrabold">Caption Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Caption</span>
                </>
              )}
            </button>

            {/* Copy Affiliate Link Button */}
            <button
              type="button"
              onClick={() => copyToClipboard(item.link_affiliate, 'affiliate')}
              disabled={!item.link_affiliate}
              className={`w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                copiedKey === 'affiliate'
                  ? 'bg-emerald-600 text-white border border-emerald-400 shadow-emerald-600/30 scale-[1.02]'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/30 shadow-indigo-600/20 disabled:bg-slate-800/80 disabled:text-slate-400 disabled:border-slate-700/60 disabled:shadow-none'
              }`}
            >
              {copiedKey === 'affiliate' ? (
                <>
                  <Check className="w-4 h-4 text-white shrink-0" />
                  <span className="text-white font-extrabold">Link Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Affiliate Link</span>
                </>
              )}
            </button>

            {/* Product Link Button */}
            {item.link_produk ? (
              <a
                href={item.link_produk}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold border border-indigo-400/30 transition-all shadow-md shadow-indigo-600/20"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Buka Link Produk
              </a>
            ) : (
              <button disabled className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800/80 text-slate-400 text-xs font-medium border border-slate-700/60 opacity-60">
                <ExternalLink className="w-3.5 h-3.5" />
                Link Produk
              </button>
            )}

            {/* Asset Download Button */}
            {item.url_asset ? (
              <a
                href={item.url_asset}
                target="_blank"
                rel="noreferrer"
                download
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 border border-indigo-400/30 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Download Asset
              </a>
            ) : (
              <button disabled className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800/80 text-slate-400 text-xs font-medium border border-slate-700/60 opacity-60">
                <Download className="w-3.5 h-3.5" />
                Asset Kosong
              </button>
            )}
          </div>

          {/* Read-Only Info Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Nama Produk:</span>
              <span className="font-semibold text-slate-200">{item.nama_produk || '-'}</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Production Date:</span>
              <span className="font-semibold text-slate-200">{item.production_date || '-'}</span>
            </div>

            <div className="md:col-span-2">
              <span className="text-slate-400 block mb-0.5">Caption:</span>
              <p className="p-3 rounded-lg bg-slate-950/80 text-slate-300 font-mono leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                {item.caption || '(Tidak ada caption)'}
              </p>
            </div>
          </div>

          {/* Platform Status Update Form */}
          <form onSubmit={handleSave} className="space-y-4 pt-2 border-t border-slate-800">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Status Publikasi Per Platform</h3>

            {/* TikTok */}
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block">📱 TikTok</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Status</label>
                  <select
                    value={tiktokStatus}
                    onChange={(e) => setTiktokStatus(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Not Published">Not Published</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Published">Published</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400 font-medium">Publish Date</label>
                    <button
                      type="button"
                      onClick={() => setTodayDate(setTiktokDate)}
                      className="text-[10px] text-blue-400 hover:underline font-mono"
                    >
                      Hari Ini
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="date"
                      value={tiktokDate}
                      onChange={(e) => setTiktokDate(e.target.value)}
                      className="w-full p-2 pl-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-blue-500 color-scheme-dark"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Permalink TikTok</label>
                  <input
                    type="url"
                    value={tiktokPermalink}
                    onChange={(e) => setTiktokPermalink(e.target.value)}
                    placeholder="https://tiktok.com/@..."
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Facebook */}
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">📘 Facebook</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Status</label>
                  <select
                    value={fbStatus}
                    onChange={(e) => setFbStatus(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Not Published">Not Published</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Published">Published</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400 font-medium">Publish Date</label>
                    <button
                      type="button"
                      onClick={() => setTodayDate(setFbDate)}
                      className="text-[10px] text-blue-400 hover:underline font-mono"
                    >
                      Hari Ini
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="date"
                      value={fbDate}
                      onChange={(e) => setFbDate(e.target.value)}
                      className="w-full p-2 pl-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-blue-500 color-scheme-dark"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Permalink FB</label>
                  <input
                    type="url"
                    value={fbPermalink}
                    onChange={(e) => setFbPermalink(e.target.value)}
                    placeholder="https://facebook.com/..."
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Instagram */}
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-pink-400 uppercase tracking-wider block">📸 Instagram</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Status</label>
                  <select
                    value={igStatus}
                    onChange={(e) => setIgStatus(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Not Published">Not Published</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Published">Published</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400 font-medium">Publish Date</label>
                    <button
                      type="button"
                      onClick={() => setTodayDate(setIgDate)}
                      className="text-[10px] text-blue-400 hover:underline font-mono"
                    >
                      Hari Ini
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="date"
                      value={igDate}
                      onChange={(e) => setIgDate(e.target.value)}
                      className="w-full p-2 pl-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-blue-500 color-scheme-dark"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Permalink Instagram</label>
                  <input
                    type="url"
                    value={igPermalink}
                    onChange={(e) => setIgPermalink(e.target.value)}
                    placeholder="https://instagram.com/p/..."
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 transition disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
