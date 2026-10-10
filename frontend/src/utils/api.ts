export type User = {
  id: string;
  email: string;
  name: string;
  role: string;
};

const resolveApiBase = () => {
  const configured = (import.meta.env.VITE_API_BASE as string | undefined)?.trim();
  if (configured) return configured;

  if (import.meta.env.DEV) return 'http://localhost:4000';

  return typeof window === 'undefined' ? '' : window.location.origin;
};

const API_BASE = resolveApiBase();

export function getToken() {
  return localStorage.getItem('disaster-token') ?? '';
}

export function saveSession(token: string, user: User) {
  localStorage.setItem('disaster-token', token);
  localStorage.setItem('disaster-user', JSON.stringify(user));
}

export function getCurrentUser(): User | null {
  const raw = localStorage.getItem('disaster-user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem('disaster-token');
  localStorage.removeItem('disaster-user');
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Request failed');
  }

  return (await response.json()) as T;
}

export { API_BASE };
