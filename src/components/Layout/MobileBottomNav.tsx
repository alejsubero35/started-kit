import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { getSidebarRoutes } from '@/config/routes';
import { useDemoAuth } from '@/features/auth/DemoAuthContext';
import { LayoutDashboard, Users, UserPlus, BookOpen, MapPin } from 'lucide-react';

const MOBILE_NAV = [
  { id: 'dashboard', href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { id: 'nna', href: '/nna', label: 'NNA', icon: Users },
  { id: 'nna-new', href: '/nna/new', label: 'Nuevo', icon: UserPlus, center: true },
  { id: 'catalogs', href: '/catalogs', label: 'Catálogos', icon: BookOpen },
  { id: 'operativos', href: '/operativos', label: 'Operativos', icon: MapPin },
];

export function MobileBottomNav() {
  const location = useLocation();
  const { user } = useDemoAuth();
  const roles = Array.isArray(user?.roles) ? user.roles as string[] : [];
  const allowedPaths = new Set(getSidebarRoutes(roles).map((r) => r.path));

  const items = MOBILE_NAV.filter((item) => allowedPaths.has(item.href) || item.id === 'dashboard' || item.id === 'nna' || item.id === 'nna-new');

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(`${href}/`);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
      <div className="glass-header border-t border-border/50 shadow-soft-xl">
        <div className="flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            if (item.center) {
              return (
                <Link key={item.id} to={item.href} className="relative flex flex-col items-center -mt-6">
                  <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-glow">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-medium text-primary mt-1">{item.label}</span>
                </Link>
              );
            }

            return (
              <Link
                key={item.id}
                to={item.href}
                className={cn(
                  'flex flex-col items-center min-w-[56px] py-2 px-2 rounded-lg text-[10px]',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon className="h-5 w-5 mb-0.5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
