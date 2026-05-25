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

  const getRoleLabel = (role: string) => {
    return t.roles[role as keyof typeof t.roles] || role.replace('_', ' ');
  };

  const getStatusLabel = (status: string) => {
    return t.status[status as keyof typeof t.status] || status;
  };

  return (
    <div className="admin-users-page" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Filters */}
      <div className="filters-card">
        <form onSubmit={handleSearch} className="filters-form">
          <div className="search-input-wrap">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-select-wrap">
            <Filter size={16} />
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            >
              <option value="">{t.allRoles}</option>
              <option value="user">{t.roles.user}</option>
              <option value="admin">{t.roles.admin}</option>
              <option value="super_admin">{t.roles.super_admin}</option>
            </select>
          </div>
          <div className="filter-select-wrap">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">{t.allStatus}</option>
              <option value="active">{t.status.active}</option>
              <option value="suspended">{t.status.suspended}</option>
              <option value="banned">{t.status.banned}</option>
            </select>
          </div>
          <button type="submit" className="search-btn">
            <Search size={16} />
            {t.search}
          </button>
        </form>
      </div>

      {/* Users Table */}
      <div className="users-table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.user}</th>
                <th>{t.role}</th>
                <th>{t.statusLabel}</th>
                <th>{t.joined}</th>
                <th className="actions-col">{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="loading-cell">
                    <div className="spinner" />
                  </td>
                </tr>
              ) : users?.data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-cell">
                    <AlertCircle size={32} />
                    <p>{t.noUsers}</p>
                  </td>
                </tr>
              ) : (
                users?.data.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="user-name">{user.name}</p>
                          <p className="user-email">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`role-badge ${user.role}`}>
                        {getRoleIcon(user.role)}
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${user.status}`}>
                        {getStatusLabel(user.status)}
                      </span>
                    </td>
                    <td className="date-cell">
                      {new Date(user.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                    </td>
                    <td className="actions-col">
                      <div className="action-btns">
                        {user.status === 'active' ? (
                          <button onClick={() => handleSuspend(user.id)} className="action-btn suspend">
                            <UserX size={14} />
                            {t.suspend}
                          </button>
                        ) : (
                          <button onClick={() => handleActivate(user.id)} className="action-btn activate">
                            <UserCheck size={14} />
                            {t.activate}
                          </button>
                        )}
                        <button onClick={() => handleDelete(user.id)} className="action-btn delete">
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
          <div className="pagination">
            <p className="pagination-info">
              {t.showing} {((users.current_page - 1) * users.per_page) + 1} {t.to} {Math.min(users.current_page * users.per_page, users.total)} {t.of} {users.total} {t.users}
            </p>
            <div className="pagination-btns">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="pagination-btn"
              >
                {isRTL ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                {t.previous}
              </button>
              <button
                onClick={() => setPage(p => Math.min(users.last_page, p + 1))}
                disabled={page === users.last_page}
                className="pagination-btn"
              >
                {t.next}
                {isRTL ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .admin-users-page {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .filters-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1rem;
        }

        .filters-form {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .search-input-wrap {
          flex: 1;
          min-width: 200px;
          position: relative;
        }

        .search-input-wrap :global(.search-icon) {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        [dir="rtl"] .search-input-wrap :global(.search-icon) {
          left: auto;
          right: 0.75rem;
        }

        .search-input-wrap input {
          width: 100%;
          padding: 0.6rem 0.75rem 0.6rem 2.5rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          color: #1e293b;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        [dir="rtl"] .search-input-wrap input {
          padding: 0.6rem 2.5rem 0.6rem 0.75rem;
        }

        .search-input-wrap input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .filter-select-wrap {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #64748b;
        }

        .filter-select-wrap select {
          padding: 0.6rem 0.75rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          color: #1e293b;
          font-size: 0.9rem;
          cursor: pointer;
          outline: none;
        }

        .search-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.25rem;
          background: #6366f1;
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .search-btn:hover {
          background: #4f46e5;
        }

        .users-table-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
        }

        .table-wrap {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        thead {
          background: #f8fafc;
        }

        th {
          padding: 0.75rem 1rem;
          text-align: left;
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
        }

        [dir="rtl"] th {
          text-align: right;
        }

        th.actions-col {
          text-align: right;
        }

        [dir="rtl"] th.actions-col {
          text-align: left;
        }

        tbody tr {
          border-top: 1px solid #e2e8f0;
        }

        tbody tr:hover {
          background: #f8fafc;
        }

        td {
          padding: 0.75rem 1rem;
        }

        .loading-cell, .empty-cell {
          text-align: center;
          padding: 3rem 1rem;
          color: #64748b;
        }

        .empty-cell svg {
          margin-bottom: 0.5rem;
          opacity: 0.5;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e2e8f0;
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .user-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #6366f1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
        }

        .user-name {
          color: #1e293b;
          font-weight: 500;
          margin: 0;
        }

        .user-email {
          color: #64748b;
          font-size: 0.8rem;
          margin: 0;
        }

        .role-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: capitalize;
        }

        .role-badge.super_admin {
          background: #f3e8ff;
          color: #9333ea;
        }

        .role-badge.admin {
          background: #dbeafe;
          color: #2563eb;
        }

        .role-badge.user {
          background: #f1f5f9;
          color: #475569;
        }

        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: capitalize;
        }

        .status-badge.active {
          background: #dcfce7;
          color: #16a34a;
        }

        .status-badge.suspended {
          background: #fef3c7;
          color: #d97706;
        }

        .status-badge.banned {
          background: #fee2e2;
          color: #dc2626;
        }

        .date-cell {
          color: #64748b;
          font-size: 0.85rem;
        }

        td.actions-col {
          text-align: right;
        }

        [dir="rtl"] td.actions-col {
          text-align: left;
        }

        .action-btns {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.5rem;
        }

        [dir="rtl"] .action-btns {
          justify-content: flex-start;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.4rem 0.75rem;
          border: none;
          border-radius: 6px;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 500;
        }

        .action-btn.suspend {
          background: #fef3c7;
          color: #d97706;
        }

        .action-btn.suspend:hover {
          background: #fde68a;
        }

        .action-btn.activate {
          background: #dcfce7;
          color: #16a34a;
        }

        .action-btn.activate:hover {
          background: #bbf7d0;
        }

        .action-btn.delete {
          background: #fee2e2;
          color: #dc2626;
          padding: 0.4rem;
        }

        .action-btn.delete:hover {
          background: #fecaca;
        }

        .pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          border-top: 1px solid #e2e8f0;
        }

        .pagination-info {
          color: #64748b;
          font-size: 0.85rem;
          margin: 0;
        }

        .pagination-btns {
          display: flex;
          gap: 0.5rem;
        }

        .pagination-btn {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.4rem 0.75rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          color: #64748b;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pagination-btn:hover:not(:disabled) {
          background: #e2e8f0;
          color: #1e293b;
        }

        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .pagination {
            flex-direction: column;
            gap: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
