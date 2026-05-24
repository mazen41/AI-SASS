'use client';

import { useEffect, useState } from 'react';
import { apiGetUsers, apiSuspendUser, apiActivateUser, apiDeleteUser, AuthUser, PaginatedResponse } from '@/lib/api';
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
} from 'lucide-react';

export default function UsersPage() {
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
    if (!confirm('Are you sure you want to suspend this user?')) return;
    try {
      await apiSuspendUser(id);
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to suspend user');
    }
  };

  const handleActivate = async (id: number) => {
    try {
      await apiActivateUser(id);
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to activate user');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      await apiDeleteUser(id);
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const getRoleIcon = (role: string) => {
    if (role === 'super_admin') return <Crown size={14} />;
    if (role === 'admin') return <Shield size={14} />;
    return <User size={14} />;
  };

  return (
    <div className="admin-users-page">
      {/* Filters */}
      <div className="filters-card">
        <form onSubmit={handleSearch} className="filters-form">
          <div className="search-input-wrap">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by name or email..."
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
              <option value="">All Roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div className="filter-select-wrap">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
            </select>
          </div>
          <button type="submit" className="search-btn">
            <Search size={16} />
            Search
          </button>
        </form>
      </div>

      {/* Users Table */}
      <div className="users-table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th className="actions-col">Actions</th>
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
                  <td colSpan={5} className="empty-cell">No users found</td>
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
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${user.status}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="date-cell">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="actions-col">
                      <div className="action-btns">
                        {user.status === 'active' ? (
                          <button onClick={() => handleSuspend(user.id)} className="action-btn suspend">
                            <UserX size={14} />
                            Suspend
                          </button>
                        ) : (
                          <button onClick={() => handleActivate(user.id)} className="action-btn activate">
                            <UserCheck size={14} />
                            Activate
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
              Showing {((users.current_page - 1) * users.per_page) + 1} to {Math.min(users.current_page * users.per_page, users.total)} of {users.total} users
            </p>
            <div className="pagination-btns">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="pagination-btn"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(users.last_page, p + 1))}
                disabled={page === users.last_page}
                className="pagination-btn"
              >
                Next
                <ChevronRight size={16} />
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
          background: rgba(26, 26, 46, 0.6);
          border: 1px solid rgba(139, 92, 246, 0.1);
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
          color: #64748b;
        }

        .search-input-wrap input {
          width: 100%;
          padding: 0.6rem 0.75rem 0.6rem 2.5rem;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(100, 116, 139, 0.3);
          border-radius: 8px;
          color: #fff;
          font-size: 0.9rem;
        }

        .search-input-wrap input:focus {
          outline: none;
          border-color: #8b5cf6;
        }

        .filter-select-wrap {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #64748b;
        }

        .filter-select-wrap select {
          padding: 0.6rem 0.75rem;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(100, 116, 139, 0.3);
          border-radius: 8px;
          color: #fff;
          font-size: 0.9rem;
        }

        .search-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.25rem;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 500;
          cursor: pointer;
        }

        .users-table-card {
          background: rgba(26, 26, 46, 0.6);
          border: 1px solid rgba(139, 92, 246, 0.1);
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
          background: rgba(100, 116, 139, 0.1);
        }

        th {
          padding: 0.75rem 1rem;
          text-align: left;
          font-size: 0.75rem;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        th.actions-col {
          text-align: right;
        }

        tbody tr {
          border-top: 1px solid rgba(100, 116, 139, 0.1);
        }

        tbody tr:hover {
          background: rgba(100, 116, 139, 0.05);
        }

        td {
          padding: 0.75rem 1rem;
        }

        .loading-cell, .empty-cell {
          text-align: center;
          padding: 2rem;
          color: #64748b;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(139, 92, 246, 0.2);
          border-top-color: #8b5cf6;
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
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
        }

        .user-name {
          color: #fff;
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
          background: rgba(139, 92, 246, 0.15);
          color: #a78bfa;
        }

        .role-badge.admin {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
        }

        .role-badge.user {
          background: rgba(100, 116, 139, 0.15);
          color: #94a3b8;
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
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;
        }

        .status-badge.suspended {
          background: rgba(251, 191, 36, 0.15);
          color: #fbbf24;
        }

        .status-badge.banned {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
        }

        .date-cell {
          color: #64748b;
          font-size: 0.85rem;
        }

        td.actions-col {
          text-align: right;
        }

        .action-btns {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.5rem;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.35rem 0.6rem;
          border: none;
          border-radius: 6px;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn.suspend {
          background: rgba(251, 191, 36, 0.15);
          color: #fbbf24;
        }

        .action-btn.suspend:hover {
          background: rgba(251, 191, 36, 0.25);
        }

        .action-btn.activate {
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;
        }

        .action-btn.activate:hover {
          background: rgba(34, 197, 94, 0.25);
        }

        .action-btn.delete {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          padding: 0.35rem;
        }

        .action-btn.delete:hover {
          background: rgba(239, 68, 68, 0.25);
        }

        .pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          border-top: 1px solid rgba(100, 116, 139, 0.1);
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
          background: rgba(100, 116, 139, 0.2);
          border: none;
          border-radius: 6px;
          color: #94a3b8;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pagination-btn:hover:not(:disabled) {
          background: rgba(100, 116, 139, 0.3);
          color: #fff;
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
