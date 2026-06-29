// REST client for the Go core API (UAS: Popular Programming Technology).
export const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const KEY = 'logieat.web.jwt';

export const getToken = () => localStorage.getItem(KEY);
export const setToken = (t: string) => localStorage.setItem(KEY, t);
export const clearToken = () => localStorage.removeItem(KEY);

async function request<T>(path: string, opts: RequestInit = {}, auth = true): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as any) };
  if (auth) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as any).message || `Error ${res.status}`);
  return body as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: any }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, false),
  me: () => request<{ user: any; company: any }>('/api/me'),
  orders: () => request<any[]>('/api/orders'),
  createOrder: (d: any) => request<any>('/api/orders', { method: 'POST', body: JSON.stringify(d) }),
  couriers: () => request<any[]>('/api/couriers'),
  analytics: () => request<any>('/api/analytics'),
  fleet: () => request<{ couriers: any[]; locations: any[]; depot: any }>('/api/fleet'),
  dispatchOptimize: (d: any) => request<any>('/api/dispatch/optimize', { method: 'POST', body: JSON.stringify(d) }),
  dispatchAssign: (d: any) => request<any>('/api/dispatch/assign', { method: 'POST', body: JSON.stringify(d) }),
};
