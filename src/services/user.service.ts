import { apiService } from './api.service';

export interface UserContextPlan {
  id: number;
  name: string;
  slug: string;
  features?: string[];
}

export interface UserContextBusinessType {
  id?: number;
  name?: string;
  slug?: string;
  features?: string[];
}

export interface UserContextTenant {
  id?: number;
  name?: string;
  slug?: string;
  domain?: string;
}

export interface UserContextResponse {
  user: { id: string | number; name: string | null; email: string | null };
  roles: string[];
  permissions: string[];
  is_super_admin: boolean;
  is_tenant_admin?: boolean;
  is_affiliate_partner?: boolean;
  scope: 'central' | 'tenant' | 'affiliate';
  features: string[];
  business_tier?: string;
  plan?: UserContextPlan | null;
  business_type?: UserContextBusinessType | null;
  tenant?: UserContextTenant | null;
  navigation_groups?: Array<{ name: string; sort: number }>;
}

const STORAGE_USER_KEY = 'auth_user';

function asStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>;
          if (typeof obj.slug === 'string') return obj.slug;
          if (typeof obj.name === 'string') return obj.name;
        }
        return null;
      })
      .filter((item): item is string => !!item);
  }
  if (typeof value === 'string') return [value];
  return [];
}

function extractUserId(raw: unknown): string | number | null {
  if (!raw || typeof raw !== 'object') return null;
  const direct = (raw as { id?: string | number }).id;
  if (direct !== undefined && direct !== null && direct !== '') return direct;
  const nested = (raw as { data?: { id?: string | number } }).data?.id;
  if (nested !== undefined && nested !== null && nested !== '') return nested;
  return null;
}

function normalizeRoles(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object') return [];
  const source =
    (raw as { roles?: unknown }).roles ??
    (raw as { data?: { roles?: unknown } }).data?.roles;
  return asStringArray(source);
}

function normalizePermissions(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object') return [];
  const source =
    (raw as { permissions?: unknown }).permissions ??
    (raw as { data?: { permissions?: unknown } }).data?.permissions;
  return asStringArray(source);
}

function normalizeFeatures(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object') return [];
  const direct = (raw as { features?: unknown }).features;
  if (Array.isArray(direct)) return asStringArray(direct);
  if (direct && typeof direct === 'object') {
    return Object.entries(direct as Record<string, unknown>)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([key]) => key);
  }
  const planFeatures = (raw as { plan?: { features?: unknown } }).plan?.features;
  if (Array.isArray(planFeatures)) return asStringArray(planFeatures);
  return [];
}

function normalizeContext(raw: unknown): UserContextResponse {
  const payload =
    raw && typeof raw === 'object' && 'data' in (raw as object) && (raw as { data?: unknown }).data
      ? (raw as { data: unknown }).data
      : raw;

  const userSource =
    payload && typeof payload === 'object' && 'user' in (payload as object)
      ? (payload as { user: unknown }).user
      : payload;

  const id = extractUserId(userSource) ?? extractUserId(payload) ?? 0;
  const name =
    (userSource as { name?: string | null })?.name ??
    (userSource as { first_name?: string; last_name?: string })?.first_name ??
    null;
  const email = (userSource as { email?: string | null })?.email ?? null;

  const roles = normalizeRoles(payload);
  const permissions = normalizePermissions(payload);
  const features = normalizeFeatures(payload);

  const scopeRaw = (payload as { scope?: string })?.scope;
  const scope: UserContextResponse['scope'] =
    scopeRaw === 'tenant' || scopeRaw === 'affiliate' || scopeRaw === 'central'
      ? scopeRaw
      : 'tenant';

  const isSuperAdmin =
    Boolean((payload as { is_super_admin?: boolean })?.is_super_admin) ||
    roles.includes('super-admin');

  return {
    user: { id, name: name ?? null, email },
    roles,
    permissions,
    is_super_admin: isSuperAdmin,
    is_tenant_admin: Boolean((payload as { is_tenant_admin?: boolean })?.is_tenant_admin),
    is_affiliate_partner: Boolean((payload as { is_affiliate_partner?: boolean })?.is_affiliate_partner),
    scope,
    features,
    business_tier: (payload as { business_tier?: string })?.business_tier,
    plan: ((payload as { plan?: UserContextPlan | null }).plan ?? null) as UserContextPlan | null,
    business_type: ((payload as { business_type?: UserContextBusinessType | null }).business_type ??
      null) as UserContextBusinessType | null,
    tenant: ((payload as { tenant?: UserContextTenant | null }).tenant ?? null) as UserContextTenant | null,
    navigation_groups: Array.isArray((payload as { navigation_groups?: unknown }).navigation_groups)
      ? ((payload as { navigation_groups: Array<{ name: string; sort: number }> }).navigation_groups)
      : [],
  };
}

function getStoredAuthUser(): unknown {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function fetchContextEndpoint(endpoint: string): Promise<UserContextResponse> {
  const response = await apiService.get<unknown>(endpoint, true, {
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  return normalizeContext(response);
}

export const userService = {
  getContextFromStorage(): UserContextResponse {
    return normalizeContext(getStoredAuthUser());
  },

  async getContext(): Promise<UserContextResponse> {
    const token = apiService.loadToken();
    if (!token) {
      return this.getContextFromStorage();
    }

    const endpoints = ['/user/context', '/me'];

    for (const endpoint of endpoints) {
      try {
        return await fetchContextEndpoint(endpoint);
      } catch (error) {
        if (endpoint === endpoints[endpoints.length - 1]) {
          console.warn(`[userService] No se pudo obtener contexto desde API (${endpoint})`, error);
        }
      }
    }

    return this.getContextFromStorage();
  },
};
