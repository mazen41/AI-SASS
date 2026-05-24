const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    // Laravel validation errors come as { message, errors }
    const message =
      data?.message ||
      (data?.errors
        ? Object.values(data.errors as Record<string, string[]>)
            .flat()
            .join(' ')
        : 'An error occurred');
    throw new Error(message);
  }

  return data as T;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'super_admin';
  status: 'active' | 'suspended' | 'banned';
  created_at: string;
}

export interface AuthResponse {
  message: string;
  user: AuthUser;
  token: string;
}

export async function apiRegister(payload: {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function apiLogin(payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function apiLogout(): Promise<void> {
  await apiFetch('/logout', { method: 'POST' });
}

export async function apiGetUser(): Promise<{ user: AuthUser }> {
  return apiFetch<{ user: AuthUser }>('/user');
}

// ── Token helpers ─────────────────────────────────────────────────────────────

export function saveToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('auth_token');
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

// ── Admin API ─────────────────────────────────────────────────────────────────

export interface DashboardStats {
  users: {
    total: number;
    active: number;
    new_this_month: number;
    new_last_month: number;
    growth_percentage: number;
  };
  subscriptions: {
    active: number;
    total: number;
    by_plan: Array<{ id: number; name: string; price: string; active_subscriptions_count: number }>;
  };
  revenue: {
    total: string;
    this_month: string;
    last_month: string;
    growth_percentage: number;
    by_gateway: Array<{ gateway: string; total: string; count: number }>;
  };
  charts: {
    monthly_revenue: Array<{ year: number; month: number; total: string }>;
    user_growth: Array<{ year: number; month: number; total: number }>;
  };
  recent_activity: Array<ActivityLog>;
}

export interface Plan {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  billing_period: 'monthly' | 'yearly';
  features: string[] | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  stripe_price_id: string | null;
  paypal_plan_id: string | null;
  subscriptions_count?: number;
  active_subscriptions_count?: number;
}

export interface Subscription {
  id: number;
  user_id: number;
  plan_id: number;
  gateway: string;
  gateway_subscription_id: string | null;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  user?: AuthUser;
  plan?: Plan;
}

export interface Transaction {
  id: number;
  user_id: number;
  subscription_id: number | null;
  gateway: string;
  gateway_transaction_id: string;
  amount: string;
  currency: string;
  status: string;
  type: string;
  created_at: string;
  user?: AuthUser;
  subscription?: Subscription;
}

export interface ActivityLog {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  user?: AuthUser;
}

export interface PaymentSettings {
  stripe: PaymentGatewaySettings;
  paypal: PaymentGatewaySettings;
}

export interface PaymentGatewaySettings {
  id: number;
  gateway: string;
  is_enabled: boolean;
  is_sandbox: boolean;
  public_key: string | null;
  has_secret_key: boolean;
  has_webhook_secret: boolean;
  webhook_url: string;
  additional_settings?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// Admin Dashboard
export async function apiGetAdminStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>('/admin/stats');
}

// Users Management
export async function apiGetUsers(params?: Record<string, string>): Promise<PaginatedResponse<AuthUser>> {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<PaginatedResponse<AuthUser>>(`/admin/users${query}`);
}

export async function apiGetUserById(id: number): Promise<{ user: AuthUser }> {
  return apiFetch<{ user: AuthUser }>(`/admin/users/${id}`);
}

export async function apiCreateUser(data: Partial<AuthUser> & { password: string }): Promise<{ user: AuthUser }> {
  return apiFetch<{ user: AuthUser }>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiUpdateUser(id: number, data: Partial<AuthUser>): Promise<{ user: AuthUser }> {
  return apiFetch<{ user: AuthUser }>(`/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function apiDeleteUser(id: number): Promise<void> {
  await apiFetch(`/admin/users/${id}`, { method: 'DELETE' });
}

export async function apiSuspendUser(id: number): Promise<{ user: AuthUser }> {
  return apiFetch<{ user: AuthUser }>(`/admin/users/${id}/suspend`, { method: 'POST' });
}

export async function apiActivateUser(id: number): Promise<{ user: AuthUser }> {
  return apiFetch<{ user: AuthUser }>(`/admin/users/${id}/activate`, { method: 'POST' });
}

// Plans Management
export async function apiGetPlans(activeOnly?: boolean): Promise<{ plans: Plan[] }> {
  const query = activeOnly ? '?active_only=1' : '';
  return apiFetch<{ plans: Plan[] }>(`/admin/plans${query}`);
}

export async function apiCreatePlan(data: Partial<Plan>): Promise<{ plan: Plan }> {
  return apiFetch<{ plan: Plan }>('/admin/plans', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiUpdatePlan(id: number, data: Partial<Plan>): Promise<{ plan: Plan }> {
  return apiFetch<{ plan: Plan }>(`/admin/plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function apiDeletePlan(id: number): Promise<void> {
  await apiFetch(`/admin/plans/${id}`, { method: 'DELETE' });
}

// Payment Settings
export async function apiGetPaymentSettings(): Promise<{ settings: PaymentSettings }> {
  return apiFetch<{ settings: PaymentSettings }>('/admin/payment-settings');
}

export async function apiUpdatePaymentSettings(
  gateway: 'stripe' | 'paypal',
  data: Partial<PaymentGatewaySettings> & { secret_key?: string; webhook_secret?: string }
): Promise<{ setting: PaymentGatewaySettings }> {
  return apiFetch<{ setting: PaymentGatewaySettings }>(`/admin/payment-settings/${gateway}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function apiTestPaymentConnection(gateway: 'stripe' | 'paypal'): Promise<{ success: boolean; message: string }> {
  return apiFetch<{ success: boolean; message: string }>(`/admin/payment-settings/${gateway}/test`, {
    method: 'POST',
  });
}

// Subscriptions
export async function apiGetSubscriptions(params?: Record<string, string>): Promise<PaginatedResponse<Subscription>> {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<PaginatedResponse<Subscription>>(`/admin/subscriptions${query}`);
}

export async function apiCancelSubscription(id: number): Promise<{ subscription: Subscription }> {
  return apiFetch<{ subscription: Subscription }>(`/admin/subscriptions/${id}/cancel`, { method: 'POST' });
}

// Transactions
export async function apiGetTransactions(params?: Record<string, string>): Promise<PaginatedResponse<Transaction>> {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<PaginatedResponse<Transaction>>(`/admin/transactions${query}`);
}

// Activity Logs
export async function apiGetActivityLogs(params?: Record<string, string>): Promise<PaginatedResponse<ActivityLog>> {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<PaginatedResponse<ActivityLog>>(`/admin/activity-logs${query}`);
}
