'use client';

import { useEffect, useState } from 'react';
import { apiGetUsers, apiSuspendUser, apiActivateUser, apiDeleteUser, AuthUser, PaginatedResponse } from '@/lib/api';
import { useLang } from '@/context/LangContext';
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
  Loader2
} from 'lucide-react';

export default function UsersPage() {
  const { locale } = useLang();
  const isRTL = locale === 'ar';
  
  const t = {
    searchPlaceholder: isRTL ? 'البحث بالاسم أو البريد...' : 'Search by name or email...',
    allRoles: isRTL ? 'جميع الأدوار' : 'All Roles',
    allStatus: isRTL ? 'جميع الحالات' : 'All Status',
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
    joined: isRTL ? 'تاريخ الانضمام' : 'Joined',
    actions: isRTL ? 'الإجراءات' : 'Actions',
    search: isRTL ? 'بحث' : 'Search',
    suspend: isRTL ? 'تعليق' : 'Suspend',
    activate: isRTL ? 'تفعيل' : 'Activate',
    suspendConfirm: isRTL ? 'هل أنت متأكد من تعليق هذا المستخدم؟' : 'Are you sure you want to suspend this user?',
    deleteConfirm: isRTL ? 'هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this user? This action cannot be undone.',
    suspendError: isRTL ? 'فشل تعليق المستخدم' : 'Failed to suspend user',
    activateError: isRTL ? 'فشل تفعيل المستخدم' : 'Failed to activate user',
    deleteError: isRTL ? 'فشل حذف المستخدم' : 'Failed to delete user',
    noUsers: isRTL ? 'لا يوجد مستخدمين' : 'No users found',
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
  const refresh = () => setRefreshKey(k => k + 1);

  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const getRoleIcon = (role: string) => {
    if (role === 'super_admin') return <Crown size={14} />;
    if (role === 'admin') return <Shield size={14} />;
    return <User size={14} />;
  };

  const getRoleClasses = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'admin':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getStatusClasses = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'suspended':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'banned':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getRoleLabel = (role: string) => {
    return t.roles[role as keyof typeof t.roles] || role.replace('_', ' ');
  };

  const getStatusLabel = (status: string) => {
    return t.status[status as keyof typeof t.status] || status;
  };

  return (
    <div className="flex flex-col gap-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t.user}</h2>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={18} className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 rtl:pl-3 rtl:pr-10 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg">
            <Filter size={16} className="text-gray-500" />
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="bg-transparent border-none text-gray-900 dark:text-white text-sm outline-none cursor-pointer"
            >
              <option value="">{t.allRoles}</option>
              <option value="user">{t.roles.user}</option>
              <option value="admin">{t.roles.admin}</option>
              <option value="super_admin">{t.roles.super_admin}</option>
            </select>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-transparent border-none text-gray-900 dark:text-white text-sm outline-none cursor-pointer"
            >
              <option value="">{t.allStatus}</option>
              <option value="active">{t.status.active}</option>
              <option value="suspended">{t.status.suspended}</option>
              <option value="banned">{t.status.banned}</option>
            </select>
          </div>
          <button type="submit" className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
            <Search size={16} />
            {t.search}
          </button>
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-4 border-b border-gray-200 dark:border-gray-700 rtl:text-right">{t.user}</th>
                <th className="p-4 border-b border-gray-200 dark:border-gray-700 rtl:text-right">{t.role}</th>
                <th className="p-4 border-b border-gray-200 dark:border-gray-700 rtl:text-right">{t.statusLabel}</th>
                <th className="p-4 border-b border-gray-200 dark:border-gray-700 rtl:text-right">{t.joined}</th>
                <th className="p-4 border-b border-gray-200 dark:border-gray-700 text-right rtl:text-left">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8">
                    <div className="flex justify-center">
                      <Loader2 size={32} className="animate-spin text-indigo-600 dark:text-indigo-400" />
                    </div>
                  </td>
                </tr>
              ) : users?.data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12">
                    <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                      <AlertCircle size={32} className="mb-3 opacity-50" />
                      <p className="text-lg">{t.noUsers}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users?.data.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-inner shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white leading-none mb-1">{user.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${getRoleClasses(user.role)}`}>
                        {getRoleIcon(user.role)}
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${getStatusClasses(user.status)}`}>
                        {getStatusLabel(user.status)}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {new Date(user.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="p-4 text-right rtl:text-left">
                      <div className="flex items-center justify-end rtl:justify-start gap-2">
                        {user.status === 'active' ? (
                          <button onClick={() => handleSuspend(user.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
                            <UserX size={14} />
                            {t.suspend}
                          </button>
                        ) : (
                          <button onClick={() => handleActivate(user.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors">
                            <UserCheck size={14} />
                            {t.activate}
                          </button>
                        )}
                        <button onClick={() => handleDelete(user.id)} className="flex items-center justify-center p-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors" title={t.deleteConfirm}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {users && users.last_page > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-gray-100 dark:border-gray-700 gap-4 bg-gray-50/50 dark:bg-gray-800/30">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              {t.showing} {((users.current_page - 1) * users.per_page) + 1} {t.to} {Math.min(users.current_page * users.per_page, users.total)} {t.of} {users.total} {t.users}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRTL ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                {t.previous}
              </button>
              <button
                onClick={() => setPage(p => Math.min(users.last_page, p + 1))}
                disabled={page === users.last_page}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t.next}
                {isRTL ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
