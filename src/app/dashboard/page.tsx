'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { apiClient } from '@/lib/api-client';
import { ContentDetailModal, ContentItem } from '@/components/content/content-detail-modal';
import {
  Search, Filter, Layers, Copy, ExternalLink, Download,
  CheckCircle2, Clock, AlertCircle, RefreshCw, Play, Film,
  Calendar as CalendarIcon, Activity, Sparkles, TrendingUp, SlidersHorizontal
} from 'lucide-react';

// Memoized Card Component to prevent flicker & re-renders of existing items during scroll
const ContentCard = React.memo(({
  item,
  onCopy,
  onOpenDetail,
  getStatusBadge,
}: {
  item: ContentItem;
  onCopy: (text?: string, label?: string) => void;
  onOpenDetail: (item: ContentItem) => void;
  getStatusBadge: (status: string) => React.ReactNode;
}) => {
  return (
    <div className="p-5 md:p-6 rounded-2xl glass-panel border border-slate-800 hover:border-blue-500/40 transition-all duration-300 shadow-xl space-y-4 group bg-slate-900/60 hover:bg-slate-900/90">
      {/* Card Header & Video Preview Container */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
        {/* Static Media Thumbnail Box */}
        <div className="sm:col-span-4 relative rounded-xl overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/70 border border-slate-800 aspect-video flex flex-col items-center justify-center p-3 text-center group-hover:border-blue-500/40 transition-all shadow-inner">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-1.5 group-hover:scale-105 transition">
            <Film className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-slate-200 line-clamp-1">{item.video_id}</span>
          <span className="text-[10px] font-mono text-slate-400 mt-0.5">
            {item.url_asset ? 'Asset Ready' : 'Tanpa Asset Video'}
          </span>
        </div>

        {/* Metadata & Title Box */}
        <div className="sm:col-span-8 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-medium">
              🏷️ {item.nama_produk || 'Umum'}
            </span>
            <span className="text-slate-400 text-[11px] font-medium">
              📅 {item.production_date || 'N/A'}
            </span>
          </div>

          <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition leading-snug">
            {item.hook}
          </h3>

          {item.caption && (
            <p className="text-xs text-slate-300 font-mono bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 line-clamp-2 leading-relaxed">
              {item.caption}
            </p>
          )}
        </div>
      </div>

      {/* Platform Status Badges Row */}
      <div className="grid grid-cols-3 gap-3 py-3 border-y border-slate-800/80 text-xs bg-slate-950/40 p-3 rounded-xl">
        <div className="space-y-1">
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">TikTok</span>
          {getStatusBadge(item.tiktok_status)}
        </div>
        <div className="space-y-1">
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Facebook</span>
          {getStatusBadge(item.facebook_status)}
        </div>
        <div className="space-y-1">
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Instagram</span>
          {getStatusBadge(item.instagram_status)}
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800/60">
        <div>
          {item.url_asset ? (
            <a
              href={item.url_asset}
              target="_blank"
              rel="noreferrer"
              download
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 transition text-xs font-medium"
              title="Download Asset Video"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Asset Video</span>
            </a>
          ) : (
            <span className="text-[11px] text-slate-500 font-mono italic">Tanpa File Asset</span>
          )}
        </div>

        <button
          onClick={() => onOpenDetail(item)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition shrink-0"
        >
          Detail & Status
        </button>
      </div>
    </div>
  );
});

ContentCard.displayName = 'ContentCard';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [accounts, setAccounts] = useState<string[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');

  const [searchTerm, setSearchTerm] = useState('');
  const [productFilter, setProductFilter] = useState('all');
  const [pipelineFilter, setPipelineFilter] = useState('all');
  const [tiktokFilter, setTiktokFilter] = useState('Semua');
  const [fbFilter, setFbFilter] = useState('Semua');
  const [igFilter, setIgFilter] = useState('Semua');

  const [availableProducts, setAvailableProducts] = useState<string[]>([]);

  const [items, setItems] = useState<ContentItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Pagination refs to keep Infinite Scroll observer perfectly stable without re-creation loops
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const isLoadingMoreRef = useRef(false);
  const isLoadingRef = useRef(false);

  const [activeItem, setActiveItem] = useState<ContentItem | null>(null);
  const [toastMsg, setToastMsg] = useState('');

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  }, []);

  const copyToClipboard = useCallback((text?: string, label?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast(`${label || 'Teks'} berhasil disalin!`);
  }, [showToast]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load Accounts List
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await apiClient.get('/content/accounts');
        const accList: string[] = res.data || [];
        setAccounts(accList);

        const savedAcc = localStorage.getItem('contentflow_v2_account');
        if (savedAcc && accList.includes(savedAcc)) {
          setSelectedAccount(savedAcc);
        } else if (accList.length > 0) {
          setSelectedAccount(accList[0]);
        }
      } catch (err) {
        console.error('Error fetching accounts:', err);
      }
    };

    if (user) {
      fetchAccounts();
    }
  }, [user]);

  // Load Content Initial (Page 1)
  const loadInitialContent = useCallback(async () => {
    if (!selectedAccount) return;
    setIsLoading(true);
    isLoadingRef.current = true;
    pageRef.current = 1;
    hasMoreRef.current = true;

    try {
      let url = `/content/${encodeURIComponent(selectedAccount)}?page=1&limit=20&`;
      if (searchTerm.trim()) url += `q=${encodeURIComponent(searchTerm.trim())}&`;
      if (productFilter && productFilter !== 'all') url += `product=${encodeURIComponent(productFilter)}&`;
      if (pipelineFilter && pipelineFilter !== 'all') url += `pipeline_status=${encodeURIComponent(pipelineFilter)}&`;
      if (tiktokFilter !== 'Semua') url += `tiktok_status=${encodeURIComponent(tiktokFilter)}&`;
      if (fbFilter !== 'Semua') url += `facebook_status=${encodeURIComponent(fbFilter)}&`;
      if (igFilter !== 'Semua') url += `instagram_status=${encodeURIComponent(igFilter)}&`;

      const res = await apiClient.get(url);
      const data = res.data;

      setItems(data.items || []);
      setTotalItems(data.total_items || 0);
      setAvailableProducts(data.available_products || []);
      
      const moreAvailable = data.current_page < data.total_pages;
      hasMoreRef.current = moreAvailable;
      localStorage.setItem('contentflow_v2_account', selectedAccount);
    } catch (err) {
      console.error('Gagal memuat konten:', err);
      setItems([]);
      hasMoreRef.current = false;
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [selectedAccount, searchTerm, productFilter, pipelineFilter, tiktokFilter, fbFilter, igFilter]);

  useEffect(() => {
    loadInitialContent();
  }, [loadInitialContent]);

  // Load More Content (Infinite Scroll)
  const loadMoreContent = useCallback(async () => {
    if (isLoadingMoreRef.current || !hasMoreRef.current || !selectedAccount || isLoadingRef.current) return;
    
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    const nextPage = pageRef.current + 1;
    try {
      let url = `/content/${encodeURIComponent(selectedAccount)}?page=${nextPage}&limit=20&`;
      if (searchTerm.trim()) url += `q=${encodeURIComponent(searchTerm.trim())}&`;
      if (productFilter && productFilter !== 'all') url += `product=${encodeURIComponent(productFilter)}&`;
      if (pipelineFilter && pipelineFilter !== 'all') url += `pipeline_status=${encodeURIComponent(pipelineFilter)}&`;
      if (tiktokFilter !== 'Semua') url += `tiktok_status=${encodeURIComponent(tiktokFilter)}&`;
      if (fbFilter !== 'Semua') url += `facebook_status=${encodeURIComponent(fbFilter)}&`;
      if (igFilter !== 'Semua') url += `instagram_status=${encodeURIComponent(igFilter)}&`;

      const res = await apiClient.get(url);
      const data = res.data;
      const newItems: ContentItem[] = data.items || [];

      if (newItems.length > 0) {
        pageRef.current = nextPage;
        setItems((prev) => {
          const existingKeys = new Set(prev.map((i) => `${i.id}-${i.video_id}`));
          const uniqueNew = newItems.filter((i) => !existingKeys.has(`${i.id}-${i.video_id}`));
          return [...prev, ...uniqueNew];
        });
        hasMoreRef.current = data.current_page < data.total_pages;
      } else {
        hasMoreRef.current = false;
      }
    } catch (err) {
      console.error('Error loading more content:', err);
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [selectedAccount, searchTerm, productFilter, pipelineFilter, tiktokFilter, fbFilter, igFilter]);

  // Setup Intersection Observer for Infinite Scroll (Stable without blinking)
  useEffect(() => {
    const target = sentinelRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !isLoadingRef.current && !isLoadingMoreRef.current) {
          loadMoreContent();
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMoreContent]);

  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case 'Published':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-medium shadow-sm shadow-emerald-500/10">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Published
          </span>
        );
      case 'Scheduled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] font-medium shadow-sm shadow-amber-500/10">
            <Clock className="w-3 h-3 text-amber-400" /> Scheduled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/80 text-[11px] font-medium">
            <AlertCircle className="w-3 h-3 text-slate-400" /> Not Published
          </span>
        );
    }
  }, []);

  const publishedCount = items.filter(
    (i) => i.tiktok_status === 'Published' || i.facebook_status === 'Published' || i.instagram_status === 'Published'
  ).length;
  const scheduledCount = items.filter(
    (i) => i.tiktok_status === 'Scheduled' || i.facebook_status === 'Scheduled' || i.instagram_status === 'Scheduled'
  ).length;

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
          <span>Memuat Studio Dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-blue-600 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-blue-400/30 text-sm font-medium animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header & Metrics Banner */}
      <div className="space-y-4">
        {/* Account Selector Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl glass-panel border border-slate-800 shadow-xl bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-indigo-950/40">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/20">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Target Brand Account</span>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-100 text-sm font-semibold rounded-xl px-3 py-1 mt-0.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition shadow-inner cursor-pointer"
              >
                {accounts.length === 0 ? (
                  <option value="">Tidak ada akun yang ditugaskan</option>
                ) : (
                  accounts.map((acc) => (
                    <option key={acc} value={acc}>
                      {acc}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium">
              <Sparkles className="w-4 h-4" />
              <span>Studio Publisher View</span>
            </div>
          </div>
        </div>

        {/* Quick Top Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl glass-panel border border-slate-800 bg-slate-900/50 space-y-1">
            <span className="text-xs text-slate-400 font-medium block">Total Konten</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-white">{totalItems}</span>
              <span className="text-[10px] text-slate-500">Video items</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl glass-panel border border-emerald-500/20 bg-emerald-500/5 space-y-1">
            <span className="text-xs text-emerald-400 font-medium block">Telah Publish</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-emerald-400">{publishedCount}</span>
              <span className="text-[10px] text-emerald-500/70 font-mono">Completed</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl glass-panel border border-amber-500/20 bg-amber-500/5 space-y-1">
            <span className="text-xs text-amber-400 font-medium block">Terjadwal (Scheduled)</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-amber-400">{scheduledCount}</span>
              <span className="text-[10px] text-amber-500/70 font-mono">Queue</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl glass-panel border border-slate-800 bg-slate-900/50 space-y-1">
            <span className="text-xs text-slate-400 font-medium block">Produk Aktif</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-blue-400">{availableProducts.length}</span>
              <span className="text-[10px] text-slate-500">Skus</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: Search, Filters & Content Feed */}
        <div className="lg:col-span-2 space-y-5">
          {/* Search & Filter Card */}
          <div className="p-4 rounded-2xl glass-panel border border-slate-800 space-y-3 shadow-lg">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Universal Search Input */}
              <div className="relative sm:col-span-1">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari ID Video, Hook, Produk..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Product Filter */}
              <div>
                <select
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="all">Semua Produk ({availableProducts.length})</option>
                  {availableProducts.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pipeline Status Filter */}
              <div>
                <select
                  value={pipelineFilter}
                  onChange={(e) => setPipelineFilter(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="all">Semua Pipeline Status</option>
                  <option value="Completed">Completed (Siap Publish)</option>
                  <option value="In Production">In Production (Tahap Edit)</option>
                </select>
              </div>
            </div>

            {/* Platform Status Filters */}
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-800/80 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">TikTok Status</span>
                <select
                  value={tiktokFilter}
                  onChange={(e) => setTiktokFilter(e.target.value)}
                  className="w-full p-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-300"
                >
                  <option value="Semua">Semua TikTok</option>
                  <option value="Not Published">Not Published</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Published">Published</option>
                </select>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">Facebook Status</span>
                <select
                  value={fbFilter}
                  onChange={(e) => setFbFilter(e.target.value)}
                  className="w-full p-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-300"
                >
                  <option value="Semua">Semua Facebook</option>
                  <option value="Not Published">Not Published</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Published">Published</option>
                </select>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">Instagram Status</span>
                <select
                  value={igFilter}
                  onChange={(e) => setIgFilter(e.target.value)}
                  className="w-full p-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-300"
                >
                  <option value="Semua">Semua Instagram</option>
                  <option value="Not Published">Not Published</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Published">Published</option>
                </select>
              </div>
            </div>
          </div>

          {/* Content Feed List Cards */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-slate-400 font-medium">Memuat konten dari database SQLite...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 p-8 rounded-2xl glass-panel border border-slate-800 space-y-3">
              <div className="text-4xl">🔍</div>
              <h3 className="text-lg font-bold text-white">Tidak Ada Konten Ditemukan</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Tidak ada konten yang cocok dengan kata kunci atau filter status yang dipilih.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {items.map((item) => (
                <ContentCard
                  key={`card-${item.id}-${item.video_id}`}
                  item={item}
                  onCopy={copyToClipboard}
                  onOpenDetail={setActiveItem}
                  getStatusBadge={getStatusBadge}
                />
              ))}
            </div>
          )}

          {/* Infinite Scroll Sentinel */}
          <div ref={sentinelRef} className="py-6 text-center">
            {isLoadingMore && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 shadow-lg">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                <span>Memuat 20 konten berikutnya...</span>
              </div>
            )}
            {!hasMoreRef.current && items.length > 0 && (
              <span className="text-xs text-slate-500 font-medium">--- Semua konten telah dimuat ---</span>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Sidebar Widgets */}
        <div className="space-y-5 lg:sticky lg:top-24">
          
          {/* Schedule Calendar Widget */}
          <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-4 shadow-xl bg-slate-900/80">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Jadwal Publishing</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                {scheduledCount} Queue
              </span>
            </div>

            {scheduledCount === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500 space-y-1">
                <Clock className="w-6 h-6 mx-auto text-slate-600 mb-1" />
                <p>Belum ada jadwal tayang mendatang.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items
                  .filter((i) => i.tiktok_status === 'Scheduled' || i.facebook_status === 'Scheduled' || i.instagram_status === 'Scheduled')
                  .slice(0, 4)
                  .map((item) => (
                    <div key={`sched-${item.id}-${item.video_id}`} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono text-blue-400 font-bold">{item.video_id}</span>
                        <span className="text-amber-400 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.tiktok_publish_date || item.facebook_publish_date || item.instagram_publish_date || 'Scheduled'}
                        </span>
                      </div>
                      <p className="text-slate-200 font-medium line-clamp-1">{item.hook}</p>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Activity Log Widget */}
          <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-4 shadow-xl bg-slate-900/80">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Aktivitas Terbaru</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                Live
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0"></div>
                <div>
                  <p className="text-slate-200 font-medium">Database SQLite Tersambung Native</p>
                  <span className="text-[10px] text-slate-500">100% Full-Stack Next.js 14 Engine</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0"></div>
                <div>
                  <p className="text-slate-200 font-medium">Akun '{selectedAccount || 'Utama'}' Dimuat</p>
                  <span className="text-[10px] text-slate-500">{items.length} konten aktif disajikan</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Detail Modal */}
      {activeItem && (
        <ContentDetailModal
          item={activeItem}
          accountName={selectedAccount}
          onClose={() => setActiveItem(null)}
          onSaved={loadInitialContent}
        />
      )}
    </div>
  );
}
