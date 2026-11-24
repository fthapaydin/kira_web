import type {
  Apartment,
  AuthUser,
  Payment,
  Property,
  Tenant,
  UserSession,
  UserStatsResponse,
} from '../types/api';

// In local dev, Vite proxies /api -> https://api-kira-beta.fatalsoft.com.tr/api (zero CORS issues).
// In production, VITE_API_BASE_URL can point directly to the Java backend.
const API_BASE =
  import.meta.env.DEV
    ? '/api'
    : (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
      'https://api-kira-beta.fatalsoft.com.tr/api';

const STORAGE_KEYS = {
  accessToken: 'kt_access_token',
  refreshToken: 'kt_refresh_token',
  user: 'kt_user',
  deviceId: 'kt_device_id',
} as const;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function getOrCreateDeviceId(): string {
  const existing = localStorage.getItem(STORAGE_KEYS.deviceId);
  if (existing) return existing;
  const generated = `web-${crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)}`;
  localStorage.setItem(STORAGE_KEYS.deviceId, generated);
  return generated;
}

export function getWebDevicePayload() {
  return {
    deviceId: getOrCreateDeviceId(),
    deviceName: 'KiraTakip Web',
    platform: 'web',
    osVersion: navigator.platform || 'Web',
    appVersion: '1.0.0',
  };
}

export function getStoredToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.accessToken);
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.refreshToken);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(STORAGE_KEYS.user);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function persistSession(
  user: AuthUser,
  accessToken?: string | null,
  refreshToken?: string | null,
) {
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  if (accessToken) {
    localStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
  }
  if (refreshToken) {
    localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
  }
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
  localStorage.removeItem(STORAGE_KEYS.user);
}

function extractMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.errors) && obj.errors.length > 0) {
      return obj.errors.map(String).join('\n');
    }
    if (typeof obj.message === 'string' && obj.message.trim().length > 0) {
      return obj.message;
    }
  }
  return fallback;
}

function parseUserFromResponse(payload: Record<string, unknown>): {
  user: AuthUser;
  accessToken?: string;
  refreshToken?: string;
} {
  const data = (payload.data as Record<string, unknown> | undefined) ?? payload;
  const user: AuthUser = {
    id: Number(data.userId ?? data.id ?? 0),
    name: String(data.name ?? ''),
    surname: String(data.surname ?? ''),
    email: String(data.email ?? ''),
    phone: String(data.phone ?? ''),
    role: data.role ? String(data.role) : undefined,
    userType: data.userType ? String(data.userType) : undefined,
    credit: Number(data.credit ?? 0),
  };
  return {
    user,
    accessToken: typeof data.accessToken === 'string' ? data.accessToken : undefined,
    refreshToken: typeof data.refreshToken === 'string' ? data.refreshToken : undefined,
  };
}

let refreshPromise: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refreshToken,
            device: getWebDevicePayload(),
          }),
        });
        if (!res.ok) {
          clearSession();
          return null;
        }
        const json = (await res.json()) as Record<string, unknown>;
        const data = (json.data as Record<string, unknown> | undefined) ?? json;
        const newAccess = typeof data.accessToken === 'string' ? data.accessToken : null;
        const newRefresh = typeof data.refreshToken === 'string' ? data.refreshToken : null;
        if (newAccess) {
          localStorage.setItem(STORAGE_KEYS.accessToken, newAccess);
          if (newRefresh) {
            localStorage.setItem(STORAGE_KEYS.refreshToken, newRefresh);
          }
          return newAccess;
        }
        clearSession();
        return null;
      } catch {
        clearSession();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retryOnAuth = true,
): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError('Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.', 0);
  }

  const isAuthPath =
    path.startsWith('/auth/login') ||
    path.startsWith('/auth/register') ||
    path.startsWith('/auth/refresh');

  if ((res.status === 401 || res.status === 403) && retryOnAuth && !isAuthPath) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      return request<T>(path, options, false);
    }
    clearSession();
    throw new ApiError('Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.', res.status);
  }

  let json: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  if (!res.ok) {
    const fallback =
      res.status === 401
        ? 'E-posta veya şifre hatalı.'
        : 'İşlem sırasında bir hata oluştu.';
    throw new ApiError(extractMessage(json, fallback), res.status);
  }

  return json as T;
}

// ── Auth APIs ──

export async function loginApi(email: string, password: string): Promise<AuthUser> {
  const json = await request<Record<string, unknown>>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      device: getWebDevicePayload(),
    }),
  });
  const { user, accessToken, refreshToken } = parseUserFromResponse(json);
  persistSession(user, accessToken, refreshToken);
  return user;
}

export async function registerApi(params: {
  name: string;
  surname: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  phone: string;
  userType: 'LANDLORD' | 'TENANT';
}): Promise<AuthUser> {
  const json = await request<Record<string, unknown>>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: params.name,
      surname: params.surname,
      email: params.email,
      password: params.password,
      password_confirmation: params.passwordConfirmation,
      phone: params.phone,
      userType: params.userType,
      device: getWebDevicePayload(),
    }),
  });
  const { user, accessToken, refreshToken } = parseUserFromResponse(json);
  persistSession(user, accessToken, refreshToken);
  return user;
}

export async function fetchMeApi(): Promise<AuthUser> {
  const json = await request<Record<string, unknown>>('/auth/me');
  const { user } = parseUserFromResponse(json);
  persistSession(user);
  return user;
}

export async function forgotPasswordApi(email: string): Promise<void> {
  await request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPasswordApi(params: {
  verificationCode: string;
  password: string;
  passwordConfirmation: string;
}): Promise<void> {
  await request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ── Domain Data APIs (Same Java Backend as Mobile) ──

export async function fetchTenantsApi(params?: {
  page?: number;
  size?: number;
  isArchived?: boolean;
  search?: string;
}): Promise<Tenant[]> {
  const query = new URLSearchParams();
  query.set('page', String(Math.max(0, (params?.page ?? 1) - 1)));
  query.set('size', String(params?.size ?? 100));
  if (params?.isArchived !== undefined) {
    query.set('isArchived', String(params.isArchived));
  }
  if (params?.search?.trim()) {
    query.set('search', params.search.trim());
  }

  const json = await request<Record<string, unknown>>(`/v1/tenant?${query.toString()}`);
  const data = json.data as Record<string, unknown> | Tenant[] | undefined;
  let list: Tenant[] = [];
  if (Array.isArray(data)) {
    list = data;
  } else if (data && Array.isArray(data.content)) {
    list = data.content as Tenant[];
  } else if (Array.isArray(json.content)) {
    list = json.content as Tenant[];
  }
  return list.map((t) => ({
    ...t,
    payments: Array.isArray(t.payments) ? t.payments : [],
  }));
}

export async function fetchPropertiesApi(): Promise<Property[]> {
  const json = await request<Record<string, unknown>>('/v1/property');
  const list = Array.isArray(json.data) ? (json.data as Property[]) : [];
  return list;
}

export async function fetchApartmentsApi(): Promise<Apartment[]> {
  const json = await request<Record<string, unknown>>('/v1/apartment');
  const list = Array.isArray(json.data) ? (json.data as Apartment[]) : [];
  return list;
}

export async function fetchUserStatsApi(): Promise<UserStatsResponse> {
  const json = await request<Record<string, unknown>>('/v1/user/stats');
  return (json.data as UserStatsResponse | undefined) ?? (json as UserStatsResponse);
}

export async function updatePaymentApi(
  paymentId: number,
  body: { isPaid: boolean; paidAmount: number; paymentDate?: string | null },
): Promise<Payment> {
  const payload: Record<string, unknown> = {
    isPaid: body.isPaid,
    paidAmount: body.isPaid ? body.paidAmount : 0,
  };
  if (body.isPaid && body.paymentDate) {
    payload.paymentDate = body.paymentDate;
  }
  const json = await request<Record<string, unknown>>(`/v1/payment/${paymentId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return (json.data as Payment | undefined) ?? (json as unknown as Payment);
}

export async function bulkUpdatePaymentsApi(params: {
  ids: number[];
  isPaid: boolean;
  paidAmount?: number;
}): Promise<Payment[]> {
  const json = await request<Record<string, unknown>>('/v1/payment/bulk-update', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return Array.isArray(json.data) ? (json.data as Payment[]) : [];
}

// ── Tenant CRUD ──

export async function createTenantApi(params: {
  name: string;
  surname: string;
  type: 1 | 2;
  contractDuration: number;
  phone?: string;
  rentAmount: number;
  depositAmount: number;
  startDate: string;
  description?: string;
  apartmentId: number;
}): Promise<Tenant> {
  const body: Record<string, unknown> = {
    name: params.name,
    surname: params.surname,
    type: params.type === 2 ? 'WORKPLACE' : 'HOUSE',
    contractDuration: params.contractDuration,
    rentAmount: Math.round(params.rentAmount),
    depositAmount: Math.round(params.depositAmount),
    startDate: params.startDate,
    apartmentId: params.apartmentId,
  };
  if (params.phone?.trim()) body.phone = params.phone.trim();
  if (params.description?.trim()) body.description = params.description.trim();

  const json = await request<Record<string, unknown>>('/v1/tenant', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const t = (json.data as Tenant | undefined) ?? (json as unknown as Tenant);
  return { ...t, payments: Array.isArray(t.payments) ? t.payments : [] };
}

export async function updateTenantApi(
  id: number,
  params: {
    name?: string;
    surname?: string;
    type: 1 | 2;
    contractDuration?: number;
    phone?: string;
    rentAmount?: number;
    depositAmount?: number;
    startDate?: string;
    description?: string;
    isArchived?: boolean;
    apartmentId?: number;
  },
): Promise<Tenant> {
  const body: Record<string, unknown> = {
    type: params.type === 2 ? 'WORKPLACE' : 'HOUSE',
  };
  if (params.name !== undefined) body.name = params.name;
  if (params.surname !== undefined) body.surname = params.surname;
  if (params.contractDuration !== undefined) body.contractDuration = params.contractDuration;
  if (params.phone !== undefined) body.phone = params.phone;
  if (params.rentAmount !== undefined) body.rentAmount = Math.round(params.rentAmount);
  if (params.depositAmount !== undefined) body.depositAmount = Math.round(params.depositAmount);
  if (params.startDate !== undefined) body.startDate = params.startDate;
  if (params.description !== undefined) body.description = params.description;
  if (params.isArchived !== undefined) body.isArchived = params.isArchived;
  if (params.apartmentId !== undefined) body.apartmentId = params.apartmentId;

  const json = await request<Record<string, unknown>>(`/v1/tenant/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  const t = (json.data as Tenant | undefined) ?? (json as unknown as Tenant);
  return { ...t, payments: Array.isArray(t.payments) ? t.payments : [] };
}

export async function deleteTenantApi(id: number): Promise<void> {
  await request(`/v1/tenant/${id}`, { method: 'DELETE' });
}

// ── Property & Apartment CRUD ──

export async function createPropertyApi(params: {
  name: string;
  address?: string;
}): Promise<Property> {
  const json = await request<Record<string, unknown>>('/v1/property', {
    method: 'POST',
    body: JSON.stringify({
      name: params.name,
      ...(params.address?.trim() ? { address: params.address.trim() } : {}),
    }),
  });
  return (json.data as Property | undefined) ?? (json as unknown as Property);
}

export async function updatePropertyApi(
  id: number,
  params: { name: string; address?: string },
): Promise<Property> {
  const json = await request<Record<string, unknown>>(`/v1/property/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name: params.name, address: params.address ?? '' }),
  });
  return (json.data as Property | undefined) ?? (json as unknown as Property);
}

export async function deletePropertyApi(id: number): Promise<void> {
  await request(`/v1/property/${id}`, { method: 'DELETE' });
}

export async function createApartmentApi(params: {
  propertyId: number;
  doorNumber: string;
  floor?: string;
  roomCount?: string;
}): Promise<Apartment> {
  const json = await request<Record<string, unknown>>('/v1/apartment', {
    method: 'POST',
    body: JSON.stringify({
      propertyId: params.propertyId,
      doorNumber: params.doorNumber,
      ...(params.floor?.trim() ? { floor: params.floor.trim() } : {}),
      ...(params.roomCount?.trim() ? { roomCount: params.roomCount.trim() } : {}),
    }),
  });
  return (json.data as Apartment | undefined) ?? (json as unknown as Apartment);
}

export async function deleteApartmentApi(id: number): Promise<void> {
  await request(`/v1/apartment/${id}`, { method: 'DELETE' });
}

// ── Account Security & Sessions ──

export async function changePasswordApi(params: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await request('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({
      old_password: params.currentPassword,
      new_password: params.newPassword,
    }),
  });
}

export async function fetchSessionsApi(): Promise<UserSession[]> {
  const json = await request<Record<string, unknown>>('/v1/sessions');
  const rawList = Array.isArray(json.data)
    ? (json.data as Record<string, unknown>[])
    : Array.isArray(json)
      ? (json as unknown as Record<string, unknown>[])
      : [];
  return rawList.map((item) => ({
    id: String(item.sessionId ?? item.id ?? ''),
    deviceName: (item.deviceName ?? item.device_name ?? null) as string | null,
    platform: (item.platform ?? null) as string | null,
    osVersion: (item.osVersion ?? item.os_version ?? null) as string | null,
    ipAddress: (item.ipAddress ?? item.ip_address ?? null) as string | null,
    lastActiveAt: (item.lastActiveAt ?? item.last_active_at ?? item.updatedAt ?? null) as string | null,
    createdAt: (item.createdAt ?? item.created_at ?? null) as string | null,
    current: Boolean(item.current ?? item.isCurrent ?? false),
  }));
}

export async function deleteSessionApi(sessionId: string): Promise<void> {
  await request(`/v1/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
  });
}
