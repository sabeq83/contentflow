'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { apiClient } from '@/lib/api-client';
import {
  Users, Key, Layers, Shield, Plus, Copy, Trash2, Check,
  AlertCircle, CheckCircle2, UserPlus, Edit3, Lock, X
} from 'lucide-react';

interface UserData {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
  is_active: boolean;
  assigned_tabs: string[];
}

interface ApiKeyData {
  id: number;
  name: string;
  key: string;
  is_active: boolean;
  created_at: string;
}

interface AccountData {
  id: number;
  name: string;
  item_count: number;
  created_at: string;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'users' | 'assignments' | 'accounts' | 'api-keys'>('users');
  const [users, setUsers] = useState<UserData[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([]);
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [sheetsTabs, setSheetsTabs] = useState<string[]>([]);

  // User Form
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [showUserModal, setShowUserModal] = useState(false);

  // Reset Password Form
  const [resetUser, setResetUser] = useState<UserData | null>(null);
  const [resetPasswordText, setResetPasswordText] = useState('');

  // API Key Form
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // Account Form
  const [newAccountName, setNewAccountName] = useState('');
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Assignment Form
  const [selectedUserForAssign, setSelectedUserForAssign] = useState<number | null>(null);
  const [selectedTabsForAssign, setSelectedTabsForAssign] = useState<string[]>([]);

  const [toastMsg, setToastMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const showToast = (msg: string, isError = false) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'admin') {
        router.push('/dashboard');
      }
    }
  }, [user, authLoading, router]);

  const loadAdminData = async () => {
    try {
      const [resUsers, resKeys, resAccounts, resTabs] = await Promise.all([
        apiClient.get('/admin/users'),
        apiClient.get('/admin/api-keys'),
        apiClient.get('/admin/accounts'),
        apiClient.get('/admin/sheets-tabs'),
      ]);

      const loadedUsers: UserData[] = resUsers.data || [];
      setUsers(loadedUsers);
      setApiKeys(resKeys.data || []);
      setAccounts(resAccounts.data || []);
      setSheetsTabs(resTabs.data || []);

      if (loadedUsers.length > 0) {
        if (!selectedUserForAssign) {
          setSelectedUserForAssign(loadedUsers[0].id);
          setSelectedTabsForAssign(loadedUsers[0].assigned_tabs || []);
        } else {
          const currentU = loadedUsers.find((u) => u.id === selectedUserForAssign);
          if (currentU) {
            setSelectedTabsForAssign(currentU.assigned_tabs || []);
          }
        }
      }
    } catch (err) {
      console.error('Error loading admin data:', err);
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadAdminData();
    }
  }, [user]);

  // Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await apiClient.post('/admin/users', {
        username: newUsername.trim(),
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
      });

      const newUser = res.data;
      showToast(`User '${newUser.username}' berhasil ditambahkan!`);
      setShowUserModal(false);
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');

      await loadAdminData();

      if (newUser && newUser.id) {
        setSelectedUserForAssign(newUser.id);
        setSelectedTabsForAssign([]);
        setActiveTab('assignments');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Gagal menambahkan user');
    }
  };

  // Reset / Change Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser || !resetPasswordText.trim()) return;
    setErrorMsg('');
    try {
      await apiClient.patch(`/admin/users/${resetUser.id}`, {
        password: resetPasswordText.trim(),
      });

      showToast(`Password user '${resetUser.username}' berhasil diperbarui!`);
      setResetUser(null);
      setResetPasswordText('');
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Gagal mengubah password');
    }
  };

  // Delete User
  const handleDeleteUser = async (targetUser: UserData) => {
    if (user && user.id === targetUser.id) {
      showToast('Anda tidak dapat menghapus akun admin Anda sendiri', true);
      return;
    }
    if (!confirm(`Apakah Anda yakin ingin menghapus user '${targetUser.username}' secara permanen?`)) return;

    try {
      await apiClient.delete(`/admin/users/${targetUser.id}`);
      showToast(`User '${targetUser.username}' berhasil dihapus!`);
      loadAdminData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Gagal menghapus user', true);
    }
  };

  // Toggle User Active Status
  const handleToggleUserActive = async (targetUser: UserData) => {
    try {
      await apiClient.patch(`/admin/users/${targetUser.id}`, {
        is_active: !targetUser.is_active,
      });
      showToast(`Status user ${targetUser.username} berhasil diubah!`);
      loadAdminData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Gagal mengubah status', true);
    }
  };

  // Create API Key
  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await apiClient.post('/admin/api-keys', {
        name: newKeyName.trim(),
      });

      setGeneratedKey(res.data.key);
      showToast('API Key Ingestion Webhook berhasil dibuat!');
      setNewKeyName('');
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Gagal membuat API Key');
    }
  };

  // Revoke API Key
  const handleRevokeApiKey = async (keyId: number) => {
    if (!confirm('Apakah Anda yakin ingin mencabut/menghapus API Key ini?')) return;
    try {
      await apiClient.delete(`/admin/api-keys/${keyId}`);
      showToast('API Key berhasil dicabut!');
      loadAdminData();
    } catch (err: any) {
      showToast('Gagal mencabut API Key');
    }
  };

  // Create Brand Account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await apiClient.post('/admin/accounts', {
        name: newAccountName.trim(),
      });

      showToast('Akun brand berhasil ditambahkan!');
      setShowAccountModal(false);
      setNewAccountName('');
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Gagal membuat akun');
    }
  };

  // Save Account Assignment
  const handleSaveAssignments = async () => {
    if (!selectedUserForAssign) return;
    try {
      await apiClient.post('/admin/assignments', {
        user_id: selectedUserForAssign,
        assigned_tabs: selectedTabsForAssign,
      });

      showToast('Assignment akun berhasil diperbarui!');
      loadAdminData();
    } catch (err: any) {
      showToast('Gagal memperbarui assignment akun');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Teks berhasil disalin!');
  };

  if (authLoading || !user) return null;

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-blue-600 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-blue-400/30 text-sm font-medium animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-2 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/50">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white">Panel Administrasi System</h1>
            <p className="text-xs text-slate-400">
              Kelola pengguna, password, hak akses brand account, serta token API Key Ingestion Webhook.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          Manajemen User ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('assignments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'assignments'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          Account Assignment
        </button>

        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'accounts'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          Brand Accounts ({accounts.length})
        </button>

        <button
          onClick={() => setActiveTab('api-keys')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'api-keys'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Key className="w-4 h-4" />
          API Keys Webhook ({apiKeys.length})
        </button>
      </div>

      {/* Tab 1: User Management */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Daftar Pengguna System</h2>
            <button
              onClick={() => setShowUserModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition shadow-md shadow-blue-600/20"
            >
              <UserPlus className="w-4 h-4" />
              Tambah User Baru
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl glass-panel border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Assigned Accounts</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/50 transition">
                    <td className="px-4 py-3 font-mono">{u.id}</td>
                    <td className="px-4 py-3 font-bold text-white">{u.username}</td>
                    <td className="px-4 py-3 text-slate-400">{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          u.role === 'admin'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.assigned_tabs?.length ? (
                          u.assigned_tabs.map((tab) => (
                            <span key={tab} className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                              {tab}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 text-[10px] italic">Tidak ada</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
                          u.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {u.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setResetUser(u)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 text-[11px] font-medium transition"
                          title="Ubah Password"
                        >
                          <Lock className="w-3 h-3" />
                          <span>Ubah Password</span>
                        </button>

                        <button
                          onClick={() => handleToggleUserActive(u)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition"
                        >
                          {u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>

                        <button
                          onClick={() => handleDeleteUser(u)}
                          disabled={user?.id === u.id}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs transition disabled:opacity-30 disabled:cursor-not-allowed"
                          title={user?.id === u.id ? 'Tidak dapat menghapus akun sendiri' : 'Hapus User'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Account Assignments */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white">Hak Akses Akun Brand Per User</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-2xl glass-panel border border-slate-800 space-y-3">
              <label className="text-xs text-slate-400 font-medium block">Pilih User:</label>
              <div className="space-y-1">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSelectedUserForAssign(u.id);
                      setSelectedTabsForAssign(u.assigned_tabs || []);
                    }}
                    className={`w-full text-left p-3 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                      selectedUserForAssign === u.id
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{u.username}</span>
                    <span className="text-[10px] opacity-70 font-mono">({u.role})</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 p-5 rounded-2xl glass-panel border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white">Centang Akun Brand yang Boleh Diakses:</h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                {sheetsTabs.map((tab) => {
                  const isChecked = selectedTabsForAssign.includes(tab);
                  return (
                    <label
                      key={tab}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                        isChecked
                          ? 'bg-blue-500/10 border-blue-500/40 text-blue-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTabsForAssign((prev) => [...prev, tab]);
                          } else {
                            setSelectedTabsForAssign((prev) => prev.filter((t) => t !== tab));
                          }
                        }}
                        className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{tab}</span>
                    </label>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  onClick={handleSaveAssignments}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition shadow-md shadow-blue-600/20"
                >
                  Simpan Assignment Akun
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Brand Accounts */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Daftar Akun Brand / Tab Database</h2>
            <button
              onClick={() => setShowAccountModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition shadow-md shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              Tambah Akun Brand Baru
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {accounts.map((acc) => (
              <div key={acc.id} className="p-4 rounded-2xl glass-panel border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">{acc.name}</h3>
                  <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-mono">
                    {acc.item_count} items
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-mono">ID: {acc.id}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: API Keys Ingestion */}
      {activeTab === 'api-keys' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">API Keys Ingestion Webhook</h2>
              <p className="text-xs text-slate-400">Token rahasia untuk ingest konten otomatis dari Python/Make/n8n.</p>
            </div>
            <button
              onClick={() => setShowApiKeyModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition shadow-md shadow-amber-600/20"
            >
              <Key className="w-4 h-4" />
              Buat API Key Baru
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl glass-panel border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Nama Key</th>
                  <th className="px-4 py-3">Token API Key</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Tgl Dibuat</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {apiKeys.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      Belum ada API Key Ingestion yang dibuat. Klik tombol di atas untuk generate API Key baru.
                    </td>
                  </tr>
                ) : (
                  apiKeys.map((k) => (
                    <tr key={k.id} className="hover:bg-slate-900/50 transition">
                      <td className="px-4 py-3 font-bold text-white">{k.name}</td>
                      <td className="px-4 py-3 font-mono text-amber-400">
                        <div className="flex items-center gap-2">
                          <span>{k.key}</span>
                          <button
                            onClick={() => copyToClipboard(k.key)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                            title="Copy Key"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium">
                          Aktif
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono">
                        {new Date(k.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRevokeApiKey(k.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs transition"
                          title="Hapus API Key"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal User Create */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white">Tambah User Baru</h3>
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}
            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="misal: user2"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="misal: user2@contentflow.com"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Password user"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="user">User Biasa</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-600/20"
                >
                  Buat User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reset / Change Password */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Ubah Password User</h3>
              </div>
              <button onClick={() => setResetUser(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Mengubah password untuk username: <strong className="text-indigo-400 font-mono">{resetUser.username}</strong> ({resetUser.role})
            </p>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Password Baru</label>
                <input
                  type="password"
                  required
                  value={resetPasswordText}
                  onChange={(e) => setResetPasswordText(e.target.value)}
                  placeholder="Masukkan password baru"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setResetUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/20"
                >
                  Simpan Password Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal API Key Create */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white">Buat API Key Ingestion Baru</h3>
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            {generatedKey ? (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2">
                  <p className="font-bold">⚠️ Simpan API Key ini sekarang!</p>
                  <p className="text-[11px] text-amber-200/80">
                    Token ini hanya akan ditampilkan sekali ini demi keamanan.
                  </p>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 font-mono text-xs text-white border border-slate-800">
                    <span className="truncate mr-2">{generatedKey}</span>
                    <button
                      onClick={() => copyToClipboard(generatedKey)}
                      className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setShowApiKeyModal(false);
                      setGeneratedKey(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateApiKey} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Nama Deskripsi Key</label>
                  <input
                    type="text"
                    required
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="misal: Python Ingestion Server 1"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowApiKeyModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold shadow-md shadow-amber-600/20"
                  >
                    Generate API Key
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal Account Create */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white">Tambah Akun Brand Baru</h3>
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}
            <form onSubmit={handleCreateAccount} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Nama Akun Brand / Tab</label>
                <input
                  type="text"
                  required
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  placeholder="misal: Brand Fashion Official"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-600/20"
                >
                  Buat Akun Brand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
