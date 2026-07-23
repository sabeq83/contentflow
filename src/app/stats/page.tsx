'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { apiClient } from '@/lib/api-client';
import { BarChart3, CheckCircle2, Clock, AlertCircle, Layers, Calendar } from 'lucide-react';

interface PlatformStat {
  published: number;
  scheduled: number;
  not_published: number;
}

interface StatsSummary {
  total_content?: number;
  total_contents?: number;
  total_published?: number;
  total_scheduled?: number;
  total_not_published?: number;
  platforms?: {
    tiktok: PlatformStat;
    facebook: PlatformStat;
    instagram: PlatformStat;
  };
}

export default function StatsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [accounts, setAccounts] = useState<string[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30d');
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await apiClient.get('/content/accounts');
        setAccounts(res.data || []);
      } catch (err) {
        console.error('Gagal mengambil daftar akun:', err);
      }
    };
    if (user) {
      fetchAccounts();
    }
  }, [user]);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const res = await apiClient.get(`/stats/summary?account=${encodeURIComponent(selectedAccount)}&range=${dateRange}`);
        setStats(res.data);
      } catch (err) {
        console.error('Gagal memuat statistik:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [user, selectedAccount, dateRange]);

  if (authLoading || !user) return null;

  const totalItemsCount = stats?.total_content ?? stats?.total_contents ?? 0;
  const tiktok = stats?.platforms?.tiktok || { published: 0, scheduled: 0, not_published: 0 };
  const facebook = stats?.platforms?.facebook || { published: 0, scheduled: 0, not_published: 0 };
  const instagram = stats?.platforms?.instagram || { published: 0, scheduled: 0, not_published: 0 };

  const totalPub = stats?.total_published ?? (tiktok.published + facebook.published + instagram.published);
  const totalSch = stats?.total_scheduled ?? (tiktok.scheduled + facebook.scheduled + instagram.scheduled);
  const totalNotPub = stats?.total_not_published ?? (tiktok.not_published + facebook.not_published + instagram.not_published);

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl glass-panel border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Statistik & Ringkasan Konten</h1>
            <p className="text-xs text-slate-400">Ringkasan status publikasi di TikTok, Facebook, dan Instagram</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Account Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs">
            <Layers className="w-4 h-4 text-slate-400" />
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none"
            >
              <option value="all">Semua Akun</option>
              {accounts.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none"
            >
              <option value="7d">7 Hari Terakhir</option>
              <option value="30d">30 Hari Terakhir</option>
              <option value="90d">90 Hari Terakhir</option>
              <option value="all">Semua Waktu</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
            <span className="text-sm">Menghitung statistik...</span>
          </div>
        </div>
      ) : !stats ? (
        <div className="text-center py-12 text-slate-500">Gagal memuat data statistik.</div>
      ) : (
        <>
          {/* Top Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-medium block">Total Konten Selesai</span>
              <span className="text-3xl font-extrabold text-white">{totalItemsCount}</span>
              <span className="text-[10px] text-slate-500 block">Status Completed</span>
            </div>

            <div className="p-5 rounded-2xl glass-panel border border-emerald-500/20 bg-emerald-500/5 space-y-1">
              <span className="text-xs text-emerald-400 font-medium block flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Total Published
              </span>
              <span className="text-3xl font-extrabold text-emerald-400">{totalPub}</span>
              <span className="text-[10px] text-emerald-500/80 block">Akumulasi 3 Platform</span>
            </div>

            <div className="p-5 rounded-2xl glass-panel border border-amber-500/20 bg-amber-500/5 space-y-1">
              <span className="text-xs text-amber-400 font-medium block flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Total Scheduled
              </span>
              <span className="text-3xl font-extrabold text-amber-400">{totalSch}</span>
              <span className="text-[10px] text-amber-500/80 block">Akumulasi 3 Platform</span>
            </div>

            <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-medium block flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Total Not Published
              </span>
              <span className="text-3xl font-extrabold text-slate-300">{totalNotPub}</span>
              <span className="text-[10px] text-slate-500 block">Akumulasi 3 Platform</span>
            </div>
          </div>

          {/* Platform Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* TikTok */}
            <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-blue-400 flex items-center gap-2">📱 TikTok</h3>
                <span className="text-xs font-mono bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">
                  {totalItemsCount} Videos
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Published</span>
                    <span className="font-bold text-emerald-400">{tiktok.published}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{
                        width: `${totalItemsCount ? (tiktok.published / totalItemsCount) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Scheduled</span>
                    <span className="font-bold text-amber-400">{tiktok.scheduled}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-amber-500"
                      style={{
                        width: `${totalItemsCount ? (tiktok.scheduled / totalItemsCount) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Not Published</span>
                    <span className="font-bold text-slate-400">{tiktok.not_published}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-slate-700"
                      style={{
                        width: `${totalItemsCount ? (tiktok.not_published / totalItemsCount) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Facebook */}
            <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-indigo-400 flex items-center gap-2">📘 Facebook</h3>
                <span className="text-xs font-mono bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">
                  {totalItemsCount} Videos
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Published</span>
                    <span className="font-bold text-emerald-400">{facebook.published}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{
                        width: `${totalItemsCount ? (facebook.published / totalItemsCount) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Scheduled</span>
                    <span className="font-bold text-amber-400">{facebook.scheduled}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-amber-500"
                      style={{
                        width: `${totalItemsCount ? (facebook.scheduled / totalItemsCount) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Not Published</span>
                    <span className="font-bold text-slate-400">{facebook.not_published}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-slate-700"
                      style={{
                        width: `${totalItemsCount ? (facebook.not_published / totalItemsCount) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Instagram */}
            <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-pink-400 flex items-center gap-2">📸 Instagram</h3>
                <span className="text-xs font-mono bg-pink-500/10 text-pink-400 px-2 py-0.5 rounded border border-pink-500/20">
                  {totalItemsCount} Videos
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Published</span>
                    <span className="font-bold text-emerald-400">{instagram.published}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{
                        width: `${totalItemsCount ? (instagram.published / totalItemsCount) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Scheduled</span>
                    <span className="font-bold text-amber-400">{instagram.scheduled}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-amber-500"
                      style={{
                        width: `${totalItemsCount ? (instagram.scheduled / totalItemsCount) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Not Published</span>
                    <span className="font-bold text-slate-400">{instagram.not_published}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-slate-700"
                      style={{
                        width: `${totalItemsCount ? (instagram.not_published / totalItemsCount) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
