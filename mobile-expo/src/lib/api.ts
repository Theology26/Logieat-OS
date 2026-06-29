// Typed API client. JWT is kept in SecureStore and sent as a Bearer header.
import * as SecureStore from 'expo-secure-store';
import { config } from './config';

const TOKEN_KEY = 'logieat.jwt';

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}
export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}
export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public errors?: Record<string, string[]>) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}, auth = true): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${config.apiUrl}${path}`, { ...options, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, body.message ?? 'Request failed', body.errors);
  }
  return body as T;
}

// Calls the Go core service (dispatch bridge) with the same Bearer token.
async function coreRequest<T>(path: string, body: unknown): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${config.coreUrl}${path}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (b as any).message ?? 'Dispatch gagal');
  return b as T;
}

export const api = {
  registerOwner: (data: Record<string, unknown>) =>
    request<{ token: string; user: any; company: any; next: string }>(
      '/auth/register-owner', { method: 'POST', body: JSON.stringify(data) }, false,
    ),

  registerCourier: (data: Record<string, unknown>) =>
    request<{ message: string; status: string }>(
      '/auth/register-courier', { method: 'POST', body: JSON.stringify(data) }, false,
    ),

  login: async (email: string, password: string) => {
    const r = await request<{ token: string; user: any }>(
      '/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, false,
    );
    await setToken(r.token);
    return r;
  },

  me: () => request<{ user: any; company: any }>('/auth/me'),

  activateSubscription: (plan: string, method: string) =>
    request('/subscriptions/activate', { method: 'POST', body: JSON.stringify({ plan, method }) }),

  pendingCouriers: () => request<any[]>('/couriers/pending'),
  couriersAll: () => request<any[]>('/couriers'),
  approveCourier: (id: string) => request(`/couriers/${id}/approve`, { method: 'POST' }),
  rejectCourier: (id: string) => request(`/couriers/${id}/reject`, { method: 'POST' }),

  // Owner / catering app
  orders: () => request<any[]>('/orders'),
  createOrder: (data: Record<string, unknown>) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  analytics: () => request<any>('/analytics'),
  fleetLocations: () => request<{ couriers: any[]; locations: any[]; depot: any }>('/fleet/locations'),
  dispatchOptimize: (body: Record<string, unknown>) =>
    coreRequest<{ route: any[]; total_distance_km: number; total_time_minutes: number; spoilage_summary: any; model_type: string }>('/dispatch/optimize', body),
  dispatchAssign: (body: Record<string, unknown>) =>
    coreRequest<{ route_id: string; route: any[] }>('/dispatch/assign', body),

  // Courier app
  courierTasks: () => request<{ route: any | null; stops: any[] }>('/courier/tasks'),
  savePushToken: (token: string) =>
    request('/courier/push-token', { method: 'POST', body: JSON.stringify({ token }) }),
  startRoute: (routeId: string) => request(`/courier/routes/${routeId}/start`, { method: 'POST' }),
  completeRoute: (routeId: string) => request(`/courier/routes/${routeId}/complete`, { method: 'POST' }),

  // Proof-of-delivery upload. Let fetch set the multipart boundary itself.
  deliverStop: async (assignmentId: string, photoUri: string, lat?: number, lng?: number) => {
    const token = await getToken();
    const form = new FormData();
    form.append('photo', { uri: photoUri, name: 'pod.jpg', type: 'image/jpeg' } as any);
    if (lat != null) form.append('latitude', String(lat));
    if (lng != null) form.append('longitude', String(lng));
    const res = await fetch(`${config.apiUrl}/courier/assignments/${assignmentId}/deliver`, {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      body: form,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, body.message ?? 'Gagal konfirmasi', body.errors);
    return body;
  },

  logout: () => clearToken(),
};
