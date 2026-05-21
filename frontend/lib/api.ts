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
