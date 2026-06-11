const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  isFormData = false
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(!isFormData ? options.headers ?? {} : {}),
    },
  });

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const message =
      (data as Record<string, unknown>)?.message ||
      ((data as Record<string, unknown>)?.errors
        ? Object.values((data as Record<string, string[]>).errors)
            .flat()
            .join(' ')
        : 'An error occurred');
    throw new Error(String(message));
  }

  return data as T;
}

// â”€â”€ Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Token helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function saveToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('auth_token');
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

// â”€â”€ Admin API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Stories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface StoryScene {
  scene_number: number;
  description: string;
  image_prompt: string;
}

export interface StoryAsset {
  id: number;
  story_id: number;
  scene_number: number;
  asset_type: 'image' | 'video';
  url: string;
  prompt: string | null;
}

export interface StoryStatus {
  status: string;
  processing_step: string | null;
  error_message: string | null;
  assembled_video_url: string | null;
  narration_url: string | null;
  assets_count: { images: number; videos: number };
}

export interface Story {
  id: number;
  user_id: number;
  title: string;
  content: string | null;
  theme: string;
  child_name: string | null;
  child_age: number | null;
  photo_url: string | null;
  video_url: string | null;
  assembled_video_url: string | null;
  narration_url: string | null;
  status: 'draft' | 'processing' | 'completed' | 'failed';
  processing_step: string | null;
  error_message: string | null;
  scenes: StoryScene[] | null;
  duration_seconds: number | null;
  language: string;
  created_at: string;
  updated_at: string;
  user?: AuthUser;
}

export async function apiGetStories(params?: Record<string, string>): Promise<PaginatedResponse<Story>> {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<PaginatedResponse<Story>>(`/stories${query}`);
}

export async function apiGetStory(id: number): Promise<{ story: Story; assets: StoryAsset[] }> {
  return apiFetch<{ story: Story; assets: StoryAsset[] }>(`/stories/${id}`);
}

export async function apiGetStoryStatus(id: number): Promise<StoryStatus> {
  return apiFetch<StoryStatus>(`/stories/${id}/status`);
}

export async function apiCreateStory(data: FormData): Promise<{ message: string; story: Story }> {
  return apiFetch<{ message: string; story: Story }>('/stories', {
    method: 'POST',
    body: data,
  }, true);
}

export async function apiUpdateStory(id: number, data: Partial<Story>): Promise<{ message: string; story: Story }> {
  return apiFetch<{ message: string; story: Story }>(`/stories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function apiDeleteStory(id: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/stories/${id}`, { method: 'DELETE' });
}

export async function apiGenerateStory(id: number): Promise<{ message: string; story: Story }> {
  return apiFetch<{ message: string; story: Story }>(`/stories/${id}/generate`, { method: 'POST' });
}

// System Health
export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  uptime: string;
  php_version: string;
  laravel_version: string;
  database: { status: 'connected' | 'disconnected'; type: string; size: string };
  cache: { status: 'active' | 'inactive'; driver: string };
  queue: { status: 'running' | 'stopped'; pending_jobs: number };
  storage: { used: string; total: string; percentage: number };
  memory: { used: string; limit: string; percentage: number };
  services: Array<{ name: string; status: 'online' | 'offline'; latency: number }>;
  recent_errors: Array<{ message: string; level: string; timestamp: string }>;
}

export async function apiGetSystemHealth(): Promise<SystemHealth> {
  return apiFetch<SystemHealth>('/admin/system-health');
}

// â”€â”€ Mail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface MailSetting {
  id?: number;
  driver: string;
  host: string;
  port: number;
  encryption: string;
  username: string;
  password: string;
  from_address: string;
  from_name: string;
  is_enabled: boolean;
}

export interface MailTemplate {
  id: number;
  key: string;
  name: string;
  subject: string;
  html_content: string;
  text_content: string | null;
  description: string | null;
  is_active: boolean;
  variables: string[] | null;
}

export interface MailLog {
  id: number;
  template_key: string | null;
  to_email: string;
  subject: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

export async function apiGetMailSettings(): Promise<{ settings: MailSetting | null }> {
  return apiFetch<{ settings: MailSetting | null }>('/admin/mail-settings');
}

export async function apiSaveMailSettings(data: Partial<MailSetting>): Promise<{ message: string; settings: MailSetting }> {
  return apiFetch<{ message: string; settings: MailSetting }>('/admin/mail-settings', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiTestMailConnection(test_email: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/admin/mail-settings/test', { method: 'POST', body: JSON.stringify({ test_email }) });
}

export async function apiGetMailTemplates(): Promise<{ templates: MailTemplate[] }> {
  return apiFetch<{ templates: MailTemplate[] }>('/admin/mail-templates');
}

export async function apiGetMailTemplate(key: string): Promise<{ template: MailTemplate }> {
  return apiFetch<{ template: MailTemplate }>(`/admin/mail-templates/${key}`);
}

export async function apiSaveMailTemplate(data: Partial<MailTemplate> & { id?: number }): Promise<{ message: string; template: MailTemplate }> {
  const id = data.id;
  delete data.id;
  const url = id ? `/admin/mail-templates/${id}` : '/admin/mail-templates';
  return apiFetch<{ message: string; template: MailTemplate }>(url, { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) });
}

export async function apiDeleteMailTemplate(id: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/admin/mail-templates/${id}`, { method: 'DELETE' });
}

export async function apiPreviewMailTemplate(html_content: string, subject: string, variables?: Record<string, string>): Promise<{ subject: string; html: string }> {
  return apiFetch<{ subject: string; html: string }>('/admin/mail-templates/preview', { method: 'POST', body: JSON.stringify({ html_content, subject, variables }) });
}

export async function apiTestMailTemplate(template_key: string, to_email: string, variables?: Record<string, string>): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/admin/mail-templates/test', { method: 'POST', body: JSON.stringify({ template_key, to_email, variables }) });
}

export async function apiSeedMailTemplates(): Promise<{ message: string; templates: MailTemplate[] }> {
  return apiFetch<{ message: string; templates: MailTemplate[] }>('/admin/mail-templates/seed', { method: 'POST' });
}

export async function apiGetMailLogs(params?: Record<string, string>): Promise<PaginatedResponse<MailLog>> {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<PaginatedResponse<MailLog>>(`/admin/mail-logs${query}`);
}

// â”€â”€ Storage Settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface StorageGatewaySettings {
  id: number;
  driver: string;
  is_active: boolean;
  region: string | null;
  bucket: string | null;
  endpoint: string | null;
  use_path_style_endpoint: boolean;
  has_key: boolean;
  has_secret: boolean;
}

export interface StorageSettings {
  local: StorageGatewaySettings;
  s3: StorageGatewaySettings;
  wasabi: StorageGatewaySettings;
}

export async function apiGetStorageSettings(): Promise<{ settings: StorageSettings }> {
  return apiFetch<{ settings: StorageSettings }>('/admin/storage-settings');
}

export async function apiUpdateStorageSettings(
  driver: string,
  data: Partial<StorageGatewaySettings> & { key?: string; secret?: string }
): Promise<{ setting: StorageGatewaySettings }> {
  return apiFetch<{ setting: StorageGatewaySettings }>(`/admin/storage-settings/${driver}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function apiTestStorageConnection(driver: string): Promise<{ success: boolean; message: string }> {
  return apiFetch<{ success: boolean; message: string }>(`/admin/storage-settings/${driver}/test`, {
    method: 'POST',
  });
}

// â”€â”€ Backup Settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface BackupSettings {
  id: number;
  is_enabled: boolean;
  destination: 'local' | 's3' | 'wasabi' | 'google_drive';
  local_path: string;
  region: string | null;
  bucket: string | null;
  endpoint: string | null;
  google_folder_id: string | null;
  backup_time: string;
  has_s3_key: boolean;
  has_s3_secret: boolean;
  has_google_json_key: boolean;
}

export async function apiGetBackupSettings(): Promise<{ settings: BackupSettings }> {
  return apiFetch<{ settings: BackupSettings }>('/admin/backup-settings');
}

export async function apiUpdateBackupSettings(
  data: Partial<BackupSettings> & { s3_key?: string; s3_secret?: string; google_json_key?: string }
): Promise<{ settings: BackupSettings }> {
  return apiFetch<{ settings: BackupSettings }>('/admin/backup-settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function apiRunBackup(): Promise<{ success: boolean; message: string }> {
  return apiFetch<{ success: boolean; message: string }>('/admin/backup-settings/run', {
    method: 'POST',
  });
}

export function apiGetDownloadBackupUrl(): string {
  const token = getToken();
  return `${API_URL}/admin/backup-settings/download${token ? `?api_token=${token}` : ''}`;
}

// â”€â”€ User Billing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function apiGetBillingPlans(): Promise<{ plans: Plan[] }> {
  return apiFetch<{ plans: Plan[] }>('/billing/plans');
}

export async function apiGetActiveSubscription(): Promise<{ subscription: Subscription | null }> {
  return apiFetch<{ subscription: Subscription | null }>('/billing/subscription');
}

export async function apiSubscribeStripe(planId: number): Promise<{ url: string }> {
  return apiFetch<{ url: string }>('/billing/subscribe/stripe', {
    method: 'POST',
    body: JSON.stringify({ plan_id: planId }),
  });
}

export async function apiSubscribePaypal(planId: number): Promise<{ url: string }> {
  return apiFetch<{ url: string }>('/billing/subscribe/paypal', {
    method: 'POST',
    body: JSON.stringify({ plan_id: planId }),
  });
}

export async function apiUserCancelSubscription(): Promise<{ message: string; subscription: Subscription }> {
  return apiFetch<{ message: string; subscription: Subscription }>('/billing/subscription/cancel', {
    method: 'POST',
  });
}

// -- Products ------------------------------------------------------------------

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  is_active: boolean;
  created_at: string;
}

export async function apiGetProducts(): Promise<{ products: Product[] }> {
  return apiFetch<{ products: Product[] }>('/admin/products');
}

export async function apiCreateProduct(data: Partial<Product>): Promise<{ product: Product }> {
  return apiFetch<{ product: Product }>('/admin/products', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateProduct(id: number, data: Partial<Product>): Promise<{ product: Product }> {
  return apiFetch<{ product: Product }>(`/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function apiDeleteProduct(id: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/admin/products/${id}`, { method: 'DELETE' });
}

// -- Packages ------------------------------------------------------------------

export interface PackageItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product: Product;
}

export interface Package {
  id: number;
  name: string;
  description: string | null;
  total_price: number;
  is_active: boolean;
  items: PackageItem[];
  created_at: string;
}

export async function apiGetPackages(): Promise<{ packages: Package[] }> {
  return apiFetch<{ packages: Package[] }>('/admin/packages');
}

export async function apiCreatePackage(data: { name: string; description?: string; is_active: boolean; items: { product_id: number; quantity: number }[] }): Promise<{ package: Package }> {
  return apiFetch<{ package: Package }>('/admin/packages', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdatePackage(id: number, data: { name: string; description?: string; is_active: boolean; items: { product_id: number; quantity: number }[] }): Promise<{ package: Package }> {
  return apiFetch<{ package: Package }>(`/admin/packages/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function apiDeletePackage(id: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/admin/packages/${id}`, { method: 'DELETE' });
}
