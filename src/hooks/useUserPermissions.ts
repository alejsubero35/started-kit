import { useDemoAuth } from '@/features/auth/DemoAuthContext';
import type { User } from '@/contexts/authContextObj';

function normalizeRoles(user: User | null): string[] {
  const roles = user?.roles;
  if (!roles) return [];
  return roles.map((r) => (typeof r === 'string' ? r : String(r)));
}

export function useUserPermissions() {
  const { user, hasRole } = useDemoAuth();
  const permissions = user?.permissions ?? [];
  const roles = normalizeRoles(user);

  const hasPermission = (permission: string | string[]): boolean => {
    const required = Array.isArray(permission) ? permission : [permission];
    if (required.length === 0) return true;
    if (hasRole('super-admin')) return true;
    return required.every((p) => permissions.includes(p));
  };

  return {
    permissions,
    roles,
    hasPermission,
    hasRole,
  };
}
