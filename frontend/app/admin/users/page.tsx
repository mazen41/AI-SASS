'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  apiGetUsers,
  apiSuspendUser,
  apiActivateUser,
  apiDeleteUser,
  apiUpdateUser,
  apiCreateUser,
  apiGetUserById,
  AuthUser,
  AdminUserDetail,
  PaginatedResponse,
} from '@/lib/api';
import { useLang } from '@/context/LangContext';
import StudioInput from '@/components/StudioInput';
import SplitTextReveal from '@/components/SplitTextReveal';
import {
  Search,
  Filter,
  UserX,
  UserCheck,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Shield,
  User,
  Crown,
  AlertCircle,
  Loader2,
  X,
  Pencil,
  Sparkles,
  Users as UsersIcon,
  Check,
  Plus,
  Eye,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function UsersPage() {
  const { locale } = useLang();
  const { user: currentUser } = useAuth();
  const isRTL = locale === 'ar';
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const t = {
    searchPlaceholder: isRTL ? 'البحث بالاسم أو البريد الإلكتروني...' : 'Search by name or email...',
    allRoles: isRTL ? 'جميع الأدوار' : 'All Roles',
    allStatus: isRTL ? 'جميع الحالات' : 'All Statuses',
    roles: {
      user: isRTL ? 'مستخدم' : 'User',
      admin: isRTL ? 'مدير' : 'Admin',
      super_admin: isRTL ? 'مدير عام' : 'Super Admin',
    },
    status: {
      active: isRTL ? 'نشط' : 'Active',
      suspended: isRTL ? 'معلق' : 'Suspended',
      banned: isRTL ? 'محظور' : 'Banned',
    },
    user: isRTL ? 'المستخدم' : 'User',
    role: isRTL ? 'الدور' : 'Role',
    statusLabel: isRTL ? 'الحالة' : 'Status',
    joined: isRTL ? 'تاريخ الانضمام' : 'Joined Date',
    actions: isRTL ? 'الإجراءات' : 'Actions',
    search: isRTL ? 'بحث' : 'Search',
    suspend: isRTL ? 'تعليق' : 'Suspend',
    activate: isRTL ? 'تفعيل' : 'Activate',
    suspendConfirm: isRTL ? 'هل أنت متأكد من تعليق هذا المستخدم؟' : 'Are you sure you want to suspend this user?',
    deleteConfirm: isRTL
      ? 'هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.'
      : 'Are you sure you want to delete this user? This action cannot be undone.',
    suspendError: isRTL ? 'فشل تعليق المستخدم' : 'Failed to suspend user',
    activateError: isRTL ? 'فشل تفعيل المستخدم' : 'Failed to activate user',
    deleteError: isRTL ? 'فشل حذف المستخدم' : 'Failed to delete user',
    edit: isRTL ? 'تعديل' : 'Edit',
    save: isRTL ? 'حفظ التغييرات' : 'Save Changes',
    cancel: isRTL ? 'إلغاء' : 'Cancel',
    nameLabel: isRTL ? 'الاسم الكامل' : 'Full Name',
    emailLabel: isRTL ? 'البريد الإلكتروني' : 'Email Address',
    roleLabel: isRTL ? 'الدور والصلاحية' : 'User Role',
    updateError: isRTL ? 'فشل تحديث المستخدم' : 'Failed to update user',
    noUsers: isRTL ? 'لم يتم العثور على أي مستخدمين' : 'No storytellers found',
    previous: isRTL ? 'السابق' : 'Previous',
    next: isRTL ? 'التالي' : 'Next',
    showing: isRTL ? 'عرض' : 'Showing',
    to: isRTL ? 'إلى' : 'to',
    of: isRTL ? 'من' : 'of',
    users: isRTL ? 'مستخدمين' : 'users',
  };

  const [users, setUsers] = useState<PaginatedResponse<AuthUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<AuthUser['role']>('user');
  const [createStatus, setCreateStatus] = useState<AuthUser['status']>('active');
  const [createLoading, setCreateLoading] = useState(false);
  const [detailUser, setDetailUser] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const refresh = () => setRefreshKey((k) => k + 1);

  const openEdit = (user: AuthUser) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
  };

  const closeEdit = () => {
    setEditingUser(null);
    setEditName('');
    setEditEmail('');
    setEditRole('');
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setEditLoading(true);
    try {
      const update: Partial<AuthUser> = {
        name: editName,
        email: editEmail,
      };
      if (isSuperAdmin) update.role = editRole as AuthUser['role'];
      await apiUpdateUser(editingUser.id, update);
      closeEdit();
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : t.updateError);
    } finally {
      setEditLoading(false);
    }
  };

  const handleCreate = async () => {
    setCreateLoading(true);
    try {
      await apiCreateUser({ name: createName, email: createEmail, password: createPassword, role: createRole, status: createStatus });
      setCreateOpen(false);
      setCreateName(''); setCreateEmail(''); setCreatePassword(''); setCreateRole('user'); setCreateStatus('active');
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : (isRTL ? 'فشل إنشاء الحساب' : 'Failed to create account'));
    } finally { setCreateLoading(false); }
  };

  const openDetails = async (id: number) => {
    setDetailLoading(true);
    setDetailUser(null);
    try {
      const response = await apiGetUserById(id);
      setDetailUser(response.user);
    } catch (err) {
      alert(err instanceof Error ? err.message : (isRTL ? 'تعذر تحميل ملف المستخدم' : 'Could not load user profile'));
    } finally { setDetailLoading(false); }
  };

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = { page: page.toString() };
        if (search) params.search = search;
        if (roleFilter) params.role = roleFilter;
        if (statusFilter) params.status = statusFilter;
        const data = await apiGetUsers(params);
        setUsers(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, [page, roleFilter, statusFilter, search, refreshKey]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleSuspend = async (id: number) => {
    if (!confirm(t.suspendConfirm)) return;
    try {
      await apiSuspendUser(id);
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : t.suspendError);
    }
  };

  const handleActivate = async (id: number) => {
    try {
      await apiActivateUser(id);
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : t.activateError);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t.deleteConfirm)) return;
    try {
      await apiDeleteUser(id);
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : t.deleteError);
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'super_admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
          <Crown size={12} />
          <span>{t.roles.super_admin}</span>
        </span>
      );
    }
    if (role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
          <Shield size={12} />
          <span>{t.roles.admin}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-500/15 text-slate-400 border border-slate-500/30">
        <User size={12} />
        <span>{t.roles.user}</span>
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{t.status.active}</span>
        </span>
      );
    }
    if (status === 'suspended') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <span>{t.status.suspended}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">
        <span>{t.status.banned}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[var(--k-blue)] uppercase tracking-wider mb-1">
            <UsersIcon size={14} />
            <span>{isRTL ? 'إدارة المنصة' : 'COMMUNITY DIRECTORY'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display text-[var(--text)]">
            <SplitTextReveal as="span" by="words" delay={0.1}>
              {isRTL ? 'إدارة المستخدمين ورواة القصص' : 'Storytellers & Users Management'}
            </SplitTextReveal>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {users && <div className="text-xs font-mono font-bold px-3 py-1.5 rounded-full bg-[var(--surface-2)] text-[var(--text-3)] border border-[var(--border)] shrink-0">{users.total} {isRTL ? 'مستخدم مسجل' : 'REGISTERED USERS'}</div>}
          {isSuperAdmin && <button onClick={() => setCreateOpen(true)} className="studio-btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold"><Plus size={15} />{isRTL ? 'إنشاء حساب' : 'Create account'}</button>}
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="studio-card-glass p-4 sm:p-5">
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 lg:col-span-7">
            <StudioInput
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              icon={Search}
            />
          </div>

          <div className="sm:col-span-3 lg:col-span-2">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="studio-input h-[3.25rem] text-xs sm:text-sm font-semibold"
            >
              <option value="">{t.allRoles}</option>
              <option value="user">{t.roles.user}</option>
              <option value="admin">{t.roles.admin}</option>
              <option value="super_admin">{t.roles.super_admin}</option>
            </select>
          </div>

          <div className="sm:col-span-3 lg:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="studio-input h-[3.25rem] text-xs sm:text-sm font-semibold"
            >
              <option value="">{t.allStatus}</option>
              <option value="active">{t.status.active}</option>
              <option value="suspended">{t.status.suspended}</option>
              <option value="banned">{t.status.banned}</option>
            </select>
          </div>
        </form>
      </div>

      {/* ── Users Table ── */}
      <div className="studio-card-glass overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-3)]">
                <th className="py-4 px-6">{t.user}</th>
                <th className="py-4 px-4">{t.role}</th>
                <th className="py-4 px-4">{t.statusLabel}</th>
                <th className="py-4 px-4">{t.joined}</th>
                <th className="py-4 px-6 text-right rtl:text-left">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-[var(--text-3)]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-[var(--k-blue)]" />
                      <span className="text-xs font-mono">{isRTL ? 'جارٍ التحميل...' : 'LOADING USERS...'}</span>
                    </div>
                  </td>
                </tr>
              ) : !users || users.data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-[var(--text-3)]">
                    <UsersIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{t.noUsers}</p>
                  </td>
                </tr>
              ) : (
                users.data.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-[var(--surface-hover)] transition-colors group"
                  >
                    {/* User Identity */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[var(--k-blue)] to-[var(--k-navy)] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-[var(--text)] truncate">{u.name}</div>
                          <div className="text-xs text-[var(--text-3)] truncate font-mono">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-4 px-4">{getRoleBadge(u.role)}</td>

                    {/* Status */}
                    <td className="py-4 px-4">{getStatusBadge(u.status || 'active')}</td>

                    {/* Joined Date */}
                    <td className="py-4 px-4 text-xs font-mono text-[var(--text-3)]">
                      {new Date(u.created_at).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right rtl:text-left">
                      <div className="flex items-center justify-end rtl:justify-start gap-1.5">
                        <button onClick={() => void openDetails(u.id)} className="p-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:text-[var(--k-blue)] hover:border-[var(--k-blue)] transition-all" title={isRTL ? 'عرض الملف' : 'View profile'}><Eye size={15} /></button>
                        <button
                          onClick={() => openEdit(u)}
                          className="p-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:text-[var(--k-blue)] hover:border-[var(--k-blue)] transition-all"
                          title={t.edit}
                        >
                          <Pencil size={15} />
                        </button>

                        {u.status === 'suspended' ? (
                          <button
                            onClick={() => handleActivate(u.id)}
                            className="p-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                            title={t.activate}
                          >
                            <UserCheck size={15} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSuspend(u.id)}
                            className="p-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all"
                            title={t.suspend}
                          >
                            <UserX size={15} />
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(u.id)}
                          className="p-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                          title={isRTL ? 'حذف' : 'Delete'}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {users && users.last_page > 1 && (
          <div className="p-4 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-3)]">
            <div>
              {t.showing} <span className="font-bold text-[var(--text)]">{(users.current_page - 1) * users.per_page + 1}</span> {t.to}{' '}
              <span className="font-bold text-[var(--text)]">{Math.min(users.current_page * users.per_page, users.total)}</span> {t.of}{' '}
              <span className="font-bold text-[var(--text)]">{users.total}</span> {t.users}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] disabled:opacity-40 disabled:cursor-not-allowed hover:border-[var(--k-blue)] transition-all flex items-center gap-1"
              >
                <ChevronLeft size={14} className="rtl:rotate-180" />
                <span>{t.previous}</span>
              </button>

              <span className="px-3 py-1.5 rounded-xl bg-[var(--surface-2)] font-mono font-bold text-[var(--k-blue)]">
                {page} / {users.last_page}
              </span>

              <button
                disabled={page >= users.last_page}
                onClick={() => setPage((p) => Math.min(users.last_page, p + 1))}
                className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] disabled:opacity-40 disabled:cursor-not-allowed hover:border-[var(--k-blue)] transition-all flex items-center gap-1"
              >
                <span>{t.next}</span>
                <ChevronRight size={14} className="rtl:rotate-180" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Edit User Modal ── */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg studio-card-glass p-6 sm:p-8 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-[var(--border)]">
                <h3 className="text-lg font-bold font-display text-[var(--text)]">
                  {t.edit} {editingUser.name}
                </h3>
                <button
                  onClick={closeEdit}
                  className="p-1.5 rounded-xl border border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text)]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <StudioInput
                  label={t.nameLabel}
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  icon={User}
                  required
                />

                <StudioInput
                  label={t.emailLabel}
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  icon={User}
                  required
                />

                {isSuperAdmin && <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-3)] mb-2">
                    {t.roleLabel}
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="studio-input h-[3.25rem] text-sm font-semibold"
                  >
                    <option value="user">{t.roles.user}</option>
                    <option value="admin">{t.roles.admin}</option>
                    <option value="super_admin">{t.roles.super_admin}</option>
                  </select>
                </div>}
              </div>

              <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="studio-btn-secondary px-5 py-2.5 text-xs font-bold"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={editLoading}
                  className="studio-btn-primary px-6 py-2.5 text-xs font-bold"
                >
                  {editLoading ? <Loader2 size={14} className="animate-spin" /> : t.save}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {createOpen && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="w-full max-w-xl studio-card-glass p-6 sm:p-8 shadow-2xl">
            <div className="mb-5 flex items-center justify-between border-b border-[var(--border)] pb-4"><div><h2 className="text-xl font-bold">{isRTL ? 'إنشاء حساب' : 'Create account'}</h2><p className="mt-1 text-xs text-[var(--text-3)]">{isRTL ? 'حسابات المديرين ستطلب تغيير كلمة المرور المؤقتة عند أول تسجيل دخول.' : 'Administrator accounts must change this temporary password at first sign-in.'}</p></div><button onClick={() => setCreateOpen(false)} className="rounded-lg border border-[var(--border)] p-2"><X size={17} /></button></div>
            <div className="space-y-4">
              <StudioInput label={t.nameLabel} value={createName} onChange={(e) => setCreateName(e.target.value)} icon={User} required />
              <StudioInput label={t.emailLabel} type="email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} icon={User} required />
              <StudioInput label={isRTL ? 'كلمة مرور مؤقتة (12 حرفًا على الأقل)' : 'Temporary password (at least 12 characters)'} type="password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} icon={Shield} required />
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">{isRTL ? 'الدور' : 'Role'}<select value={createRole} onChange={(e) => setCreateRole(e.target.value as AuthUser['role'])} className="studio-input mt-2 h-[3.25rem] text-sm font-semibold"><option value="user">{t.roles.user}</option><option value="admin">{t.roles.admin}</option><option value="super_admin">{t.roles.super_admin}</option></select></label>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">{isRTL ? 'الحالة' : 'Status'}<select value={createStatus} onChange={(e) => setCreateStatus(e.target.value as AuthUser['status'])} className="studio-input mt-2 h-[3.25rem] text-sm font-semibold"><option value="active">{t.status.active}</option><option value="suspended">{t.status.suspended}</option><option value="banned">{t.status.banned}</option></select></label>
            </div>
            <div className="mt-6 flex justify-end gap-3 border-t border-[var(--border)] pt-4"><button onClick={() => setCreateOpen(false)} className="studio-btn-secondary px-5 py-2.5 text-xs font-bold">{t.cancel}</button><button disabled={createLoading || !createName || !createEmail || createPassword.length < 12} onClick={() => void handleCreate()} className="studio-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold disabled:opacity-50">{createLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}{isRTL ? 'إنشاء الحساب' : 'Create account'}</button></div>
          </motion.div>
        </div>}
      </AnimatePresence>

      <AnimatePresence>
        {(detailLoading || detailUser) && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailUser(null); }}>
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl sm:p-7">
            {detailLoading || !detailUser ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin text-[var(--k-blue)]" /></div> : <>
              <header className="flex items-start justify-between gap-3 border-b border-[var(--border)] pb-5"><div><p className="text-xs font-bold uppercase tracking-widest text-[var(--k-blue)]">{isRTL ? 'ملف الحساب' : 'ACCOUNT PROFILE'}</p><h2 className="mt-1 text-2xl font-bold">{detailUser.name}</h2><p className="mt-1 text-sm text-[var(--text-3)]">{detailUser.email} · #{detailUser.id}</p></div><button onClick={() => setDetailUser(null)} className="rounded-xl border border-[var(--border)] p-2"><X size={18} /></button></header>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-[var(--border)] p-3"><span className="text-xs text-[var(--text-3)]">{isRTL ? 'حالة الحساب' : 'Account status'}</span><p className="mt-1 font-semibold">{detailUser.status}</p></div>
                <div className="rounded-xl border border-[var(--border)] p-3"><span className="text-xs text-[var(--text-3)]">{isRTL ? 'التحقق من البريد' : 'Email verification'}</span><p className="mt-1 font-semibold">{detailUser.email_verified_at ? new Date(detailUser.email_verified_at).toLocaleDateString() : (isRTL ? 'غير متحقق' : 'Not verified')}</p></div>
                <div className="rounded-xl border border-[var(--border)] p-3"><span className="text-xs text-[var(--text-3)]">{isRTL ? 'آخر تسجيل دخول' : 'Last sign-in'}</span><p className="mt-1 font-semibold">{detailUser.last_login_at ? new Date(detailUser.last_login_at).toLocaleString() : '—'}</p></div>
                <div className="rounded-xl border border-[var(--border)] p-3"><span className="text-xs text-[var(--text-3)]">{isRTL ? 'تاريخ إنشاء الحساب' : 'Account created'}</span><p className="mt-1 font-semibold">{detailUser.created_at ? new Date(detailUser.created_at).toLocaleDateString() : '—'}</p></div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  [isRTL ? 'أرصدة AI المتاحة' : 'Available AI credits', (detailUser.ai_credit_wallet?.available_credits ?? 0).toLocaleString()],
                  [isRTL ? 'الاشتراكات' : 'Subscriptions', detailUser.subscriptions_count ?? 0],
                  [isRTL ? 'المعاملات' : 'Transactions', detailUser.transactions_count ?? 0],
                  [isRTL ? 'الأجيال' : 'Generations', detailUser.stories_count ?? 0],
                ].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4"><p className="text-xs text-[var(--text-3)]">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>)}
              </div>
              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <section className="rounded-2xl border border-[var(--border)] p-4"><h3 className="font-bold">{isRTL ? 'الاشتراكات' : 'Subscriptions'}</h3>{detailUser.subscriptions?.length ? <div className="mt-3 space-y-2">{detailUser.subscriptions.map((subscription) => <div key={subscription.id} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-2)] p-3 text-sm"><span><b>{subscription.plan?.name ?? `#${subscription.id}`}</b><span className="block text-xs text-[var(--text-3)]">{subscription.gateway || '—'} · {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : '—'}</span></span><span className="rounded-full bg-white/5 px-2 py-1 text-xs">{subscription.status}</span></div>)}</div> : <p className="mt-3 text-sm text-[var(--text-3)]">{isRTL ? 'لا توجد اشتراكات مسجلة.' : 'No subscriptions recorded.'}</p>}</section>
                <section className="rounded-2xl border border-[var(--border)] p-4"><h3 className="font-bold">{isRTL ? 'آخر المعاملات' : 'Recent transactions'}</h3>{detailUser.transactions?.length ? <div className="mt-3 space-y-2">{detailUser.transactions.map((transaction) => <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-2)] p-3 text-sm"><span><b>{transaction.type}</b><span className="block text-xs text-[var(--text-3)]">{transaction.gateway} · {new Date(transaction.created_at).toLocaleDateString()}</span></span><span className="text-end"><b>{transaction.amount} {transaction.currency}</b><span className="block text-xs text-[var(--text-3)]">{transaction.status}</span></span></div>)}</div> : <p className="mt-3 text-sm text-[var(--text-3)]">{isRTL ? 'لا توجد معاملات.' : 'No transactions recorded.'}</p>}</section>
                <section className="rounded-2xl border border-[var(--border)] p-4"><h3 className="font-bold">{isRTL ? 'سجل أرصدة AI' : 'AI credit ledger'}</h3>{detailUser.ai_credit_transactions?.length ? <div className="mt-3 space-y-2">{detailUser.ai_credit_transactions.map((entry) => <div key={entry.id} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-2)] p-3 text-sm"><span><b>{entry.type.replaceAll('_', ' ')}</b><span className="block text-xs text-[var(--text-3)]">{entry.description || entry.status} · {new Date(entry.created_at).toLocaleDateString()}</span></span><span className={`font-bold ${entry.amount < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{entry.amount > 0 ? '+' : ''}{entry.amount.toLocaleString()}</span></div>)}</div> : <p className="mt-3 text-sm text-[var(--text-3)]">{isRTL ? 'لا توجد حركات أرصدة.' : 'No AI credit activity.'}</p>}</section>
                <section className="rounded-2xl border border-[var(--border)] p-4"><h3 className="font-bold">{isRTL ? 'آخر عمليات التوليد' : 'Recent generations'}</h3>{detailUser.stories?.length ? <div className="mt-3 space-y-2">{detailUser.stories.map((story) => <div key={story.id} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-2)] p-3 text-sm"><span className="truncate font-medium">{story.title}</span><span className="shrink-0 text-xs text-[var(--text-3)]">{story.status}{story.processing_step ? ` · ${story.processing_step}` : ''}</span></div>)}</div> : <p className="mt-3 text-sm text-[var(--text-3)]">{isRTL ? 'لا توجد عمليات توليد.' : 'No generation records.'}</p>}</section>
                <section className="rounded-2xl border border-[var(--border)] p-4"><h3 className="font-bold">{isRTL ? 'أحداث التدقيق الأخيرة' : 'Recent audit events'}</h3>{detailUser.activity_logs?.length ? <div className="mt-3 space-y-2">{detailUser.activity_logs.slice(0, 8).map((log) => <div key={log.id} className="rounded-xl bg-[var(--surface-2)] p-3 text-sm"><b>{log.action.replaceAll('_', ' ')}</b><span className="ms-2 text-xs text-[var(--text-3)]">{new Date(log.created_at).toLocaleString()}</span>{log.reason && <p className="mt-1 text-xs text-[var(--text-3)]">{log.reason}</p>}</div>)}</div> : <p className="mt-3 text-sm text-[var(--text-3)]">{isRTL ? 'لا توجد أحداث تدقيق.' : 'No audit events.'}</p>}</section>
              </div>
            </>}
          </motion.section>
        </div>}
      </AnimatePresence>
    </div>
  );
}
