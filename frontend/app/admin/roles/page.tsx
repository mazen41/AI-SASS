'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, Loader2, Plus, Save, Shield, Users } from 'lucide-react';
import { useLang } from '@/context/LangContext';
import { useAuth } from '@/context/AuthContext';
import {
  AdminPermission, AdminRole, AdminRolesResponse, AuthUser, PaginatedResponse,
  apiAssignAdminRole, apiCreateAdminRole, apiGetAdminRoles, apiGetUsers, apiUpdateAdminRole,
} from '@/lib/api';

export default function AdminRolesPage() {
  const { locale } = useLang();
  const { user } = useAuth();
  const ar = locale === 'ar';
  const [data, setData] = useState<AdminRolesResponse | null>(null);
  const [admins, setAdmins] = useState<PaginatedResponse<AuthUser> | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [assignee, setAssignee] = useState('');
  const [assignment, setAssignment] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [rolesResponse, userResponse] = await Promise.all([
        apiGetAdminRoles(), apiGetUsers({ role: 'admin', per_page: '100' }),
      ]);
      setData(rolesResponse);
      setAdmins(userResponse);
      setAssignment(Object.fromEntries(userResponse.data.map((admin) => [admin.id, String(admin.admin_role_id ?? '')])));
      setSelectedRoleId((current) => current ?? rolesResponse.roles[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : (ar ? 'تعذر تحميل الأدوار.' : 'Could not load roles.'));
    } finally {
      setLoading(false);
    }
  }, [ar]);

  useEffect(() => { void load(); }, [load]);

  const selectedRole = data?.roles.find((role) => role.id === selectedRoleId) ?? null;
  useEffect(() => {
    if (!selectedRole) return;
    setName(selectedRole.name);
    setPermissions(selectedRole.permissions.map((permission) => permission.key));
  }, [selectedRole]);

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, AdminPermission[]>();
    for (const permission of data?.permissions ?? []) {
      const group = permission.key.split('.')[0];
      groups.set(group, [...(groups.get(group) ?? []), permission]);
    }
    return [...groups.entries()];
  }, [data]);

  const togglePermission = (key: string) => setPermissions((current) => current.includes(key)
    ? current.filter((item) => item !== key)
    : [...current, key]);

  const beginNewRole = () => {
    setSelectedRoleId(null);
    setName('');
    setPermissions([]);
    setNotice('');
  };

  const saveRole = async () => {
    if (!name.trim()) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const result = selectedRoleId
        ? await apiUpdateAdminRole(selectedRoleId, { name: name.trim(), permissions, reason: 'Updated through admin roles page' })
        : await apiCreateAdminRole({ name: name.trim(), permissions });
      setSelectedRoleId(result.role.id);
      setNotice(ar ? 'تم حفظ الدور والصلاحيات.' : 'Role and permissions saved.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : (ar ? 'تعذر حفظ الدور.' : 'Could not save role.'));
    } finally { setSaving(false); }
  };

  const saveAssignment = async (adminId: number) => {
    const roleId = Number(assignment[adminId]);
    if (!roleId) return;
    setSaving(true); setError(''); setNotice('');
    try {
      await apiAssignAdminRole(adminId, roleId);
      setNotice(ar ? 'تم تحديث دور المسؤول.' : 'Administrator role updated.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : (ar ? 'تعذر تحديث الدور.' : 'Could not update role.'));
    } finally { setSaving(false); }
  };

  if (user?.role !== 'super_admin') return <div className="p-8 text-sm text-red-400">{ar ? 'هذه الصفحة متاحة لمالك المنصة فقط.' : 'This page is available to the platform owner only.'}</div>;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-5 md:p-8" dir={ar ? 'rtl' : 'ltr'}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-[var(--k-blue)]"><Shield size={15} />{ar ? 'إدارة الوصول' : 'ACCESS CONTROL'}</div>
          <h1 className="text-3xl font-bold">{ar ? 'الأدوار والصلاحيات' : 'Roles & Permissions'}</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--text-3)]">{ar ? 'أنشئ أدوارًا للموظفين وحدد بدقة ما يمكن لكل دور عرضه أو تعديله. يظل مالك المنصة بصلاحية كاملة.' : 'Create staff roles and control exactly what each role can view or change. The platform owner retains full access.'}</p>
        </div>
        <button onClick={beginNewRole} className="inline-flex items-center gap-2 rounded-xl bg-[var(--k-blue)] px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} />{ar ? 'دور جديد' : 'New role'}</button>
      </header>

      {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300"><AlertCircle size={17} />{error}</div>}
      {notice && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-300"><Check size={17} />{notice}</div>}

      {loading ? <div className="flex min-h-64 items-center justify-center text-[var(--text-3)]"><Loader2 className="animate-spin" /></div> : data && <>
        <section className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
          <nav aria-label={ar ? 'الأدوار' : 'Roles'} className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
            {data.roles.map((role) => <button key={role.id} onClick={() => setSelectedRoleId(role.id)} className={`w-full rounded-xl border p-3 text-start transition ${selectedRoleId === role.id ? 'border-[var(--k-blue)] bg-[var(--k-blue)]/10' : 'border-transparent hover:bg-white/5'}`}>
              <span className="block font-semibold">{role.name}</span><span className="mt-1 block text-xs text-[var(--text-3)]">{role.users_count ?? 0} {ar ? 'مسؤول' : 'admins'} · {role.permissions.length} {ar ? 'صلاحية' : 'permissions'}</span>
              {role.is_system && <span className="mt-2 inline-block rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-300">{ar ? 'دور نظام' : 'System role'}</span>}
            </button>)}
          </nav>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-5">
              <div><h2 className="text-xl font-bold">{selectedRole ? selectedRole.name : (ar ? 'إنشاء دور' : 'Create role')}</h2><p className="mt-1 text-sm text-[var(--text-3)]">{selectedRole?.is_system ? (ar ? 'دور النظام للترحيل الآمن؛ أنشئ دورًا مخصصًا لتغيير الصلاحيات.' : 'System role retained for compatibility. Create a custom role to define restricted access.') : (ar ? 'اختر الصلاحيات المطلوبة لهذا الدور.' : 'Select the capabilities this role needs.')}</p></div>
              <button disabled={saving || Boolean(selectedRole?.is_system) || !name.trim()} onClick={() => void saveRole()} className="inline-flex items-center gap-2 rounded-xl bg-[var(--k-blue)] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><Save size={15} />{saving ? (ar ? 'جارٍ الحفظ…' : 'Saving…') : (ar ? 'حفظ الدور' : 'Save role')}</button>
            </div>
            <label className="mt-5 block text-sm font-medium">{ar ? 'اسم الدور' : 'Role name'}<input value={name} onChange={(e) => setName(e.target.value)} disabled={Boolean(selectedRole?.is_system)} className="mt-2 block w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 outline-none focus:border-[var(--k-blue)] disabled:opacity-60" placeholder={ar ? 'مثال: دعم العملاء' : 'e.g. Customer support'} /></label>
            <div className="mt-6 space-y-5">
              {groupedPermissions.map(([group, items]) => <fieldset key={group} className="rounded-xl border border-[var(--border)] p-4">
                <legend className="px-2 text-sm font-bold capitalize">{group.replaceAll('_', ' ')}</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((permission) => <label key={permission.key} className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-white/5">
                    <input type="checkbox" checked={permissions.includes(permission.key)} disabled={Boolean(selectedRole?.is_system)} onChange={() => togglePermission(permission.key)} className="mt-0.5 accent-[var(--k-blue)]" />
                    <span><span className="block text-sm font-medium">{permission.description}</span><span className="mt-0.5 block font-mono text-[10px] text-[var(--text-3)]">{permission.key}</span></span>
                  </label>)}
                </div>
              </fieldset>)}
            </div>
          </section>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 md:p-6">
          <div className="mb-4 flex items-center gap-2"><Users className="text-[var(--k-blue)]" size={18} /><div><h2 className="text-lg font-bold">{ar ? 'تعيين الأدوار للمسؤولين' : 'Assign roles to administrators'}</h2><p className="text-xs text-[var(--text-3)]">{ar ? 'التغيير يسري فورًا على طلبات الإدارة الجديدة.' : 'Changes apply immediately to new admin requests.'}</p></div></div>
          {!admins?.data.length ? <p className="rounded-xl border border-dashed border-[var(--border)] p-5 text-sm text-[var(--text-3)]">{ar ? 'لا توجد حسابات مسؤولين.' : 'No administrator accounts found.'}</p> : <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-start text-sm"><thead className="text-xs text-[var(--text-3)]"><tr><th className="p-3">{ar ? 'المسؤول' : 'Administrator'}</th><th className="p-3">{ar ? 'الدور الحالي' : 'Current role'}</th><th className="p-3">{ar ? 'تغيير الدور' : 'Change role'}</th></tr></thead><tbody>{admins.data.map((admin) => <tr key={admin.id} className="border-t border-[var(--border)]"><td className="p-3"><span className="block font-medium">{admin.name}</span><span className="text-xs text-[var(--text-3)]">{admin.email}</span></td><td className="p-3">{admin.admin_role?.name ?? (ar ? 'غير معين' : 'Unassigned')}</td><td className="p-3"><div className="flex gap-2"><select value={assignment[admin.id] ?? ''} onChange={(e) => setAssignment((current) => ({ ...current, [admin.id]: e.target.value }))} className="min-w-40 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"><option value="">{ar ? 'اختر دورًا' : 'Select a role'}</option>{data.roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select><button disabled={saving || !assignment[admin.id]} onClick={() => void saveAssignment(admin.id)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold hover:border-[var(--k-blue)] disabled:opacity-50">{ar ? 'تعيين' : 'Assign'}</button></div></td></tr>)}</tbody></table></div>}
        </section>
      </>}
    </main>
  );
}
