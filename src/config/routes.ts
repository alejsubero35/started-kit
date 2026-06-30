import React from 'react';
import {
  LayoutDashboard,
  MapPin,
  Users,
  BookOpen,
  UserPlus,
  Settings,
  LogIn,
} from 'lucide-react';

export interface RouteConfig {
  id: string;
  path: string;
  label: string;
  icon: React.ElementType;
  component: React.ComponentType;
  isPublic?: boolean;
  requiredRoles?: string[];
  children?: RouteConfig[];
  showInSidebar?: boolean;
}

const Login = React.lazy(() => import('@/features/auth/LoginPage'));
const DashboardPage = React.lazy(() => import('@/pages/DashboardPage'));
const OperativosPage = React.lazy(() => import('@/pages/operativos/OperativosPage'));
const CatalogsPage = React.lazy(() => import('@/pages/catalogs/CatalogsPage'));
const CatalogTypePage = React.lazy(() => import('@/pages/catalogs/CatalogTypePage'));
const NnaListPage = React.lazy(() => import('@/pages/nna/NnaListPage'));
const NnaWizardPage = React.lazy(() => import('@/pages/nna/NnaWizardPage'));
const SettingsPage = React.lazy(() => import('@/pages/SettingsPage'));
const NotFound = React.lazy(() => import('@/pages/NotFound'));
const Unauthorized = React.lazy(() => import('@/pages/Unauthorized'));

export const routeConfig: RouteConfig[] = [
  {
    id: 'login',
    path: '/login',
    label: 'Login',
    icon: LogIn,
    component: Login,
    isPublic: true,
    showInSidebar: false,
  },
  {
    id: 'dashboard',
    path: '/dashboard',
    label: 'Inicio',
    icon: LayoutDashboard,
    component: DashboardPage,
    showInSidebar: true,
  },
  {
    id: 'operativos',
    path: '/operativos',
    label: 'Operativos',
    icon: MapPin,
    component: OperativosPage,
    requiredRoles: ['super-admin', 'admin-nacional'],
    showInSidebar: true,
  },
  {
    id: 'nna',
    path: '/nna',
    label: 'Registro NNA',
    icon: Users,
    component: NnaListPage,
    requiredRoles: ['super-admin', 'admin-nacional', 'coordinador-estatal', 'registrador', 'consultor'],
    showInSidebar: true,
  },
  {
    id: 'nna-new',
    path: '/nna/new',
    label: 'Nuevo NNA',
    icon: UserPlus,
    component: NnaWizardPage,
    requiredRoles: ['super-admin', 'admin-nacional', 'coordinador-estatal', 'registrador'],
    showInSidebar: true,
  },
  {
    id: 'catalogs',
    path: '/catalogs',
    label: 'Catálogos',
    icon: BookOpen,
    component: CatalogsPage,
    requiredRoles: ['super-admin', 'admin-nacional'],
    showInSidebar: true,
  },
  {
    id: 'catalog-type',
    path: '/catalogs/:type',
    label: 'Catálogo',
    icon: BookOpen,
    component: CatalogTypePage,
    requiredRoles: ['super-admin', 'admin-nacional'],
    showInSidebar: false,
  },
  {
    id: 'settings',
    path: '/settings',
    label: 'Configuración',
    icon: Settings,
    component: SettingsPage,
    requiredRoles: ['super-admin', 'admin-nacional'],
    showInSidebar: true,
  },
  {
    id: 'unauthorized',
    path: '/unauthorized',
    label: 'Unauthorized',
    icon: Settings,
    component: Unauthorized,
    isPublic: true,
    showInSidebar: false,
  },
  {
    id: 'not-found',
    path: '*',
    label: 'Not Found',
    icon: Settings,
    component: NotFound,
    isPublic: true,
    showInSidebar: false,
  },
];

export const getPublicRoutes = () => routeConfig.filter((r) => r.isPublic);
export const getProtectedRoutes = () => routeConfig.filter((r) => !r.isPublic);

export const getSidebarRoutes = (userRoles: string[] = []) =>
  routeConfig.filter((route) => {
    if (!route.showInSidebar) return false;
    if (!route.requiredRoles?.length) return true;
    return route.requiredRoles.some((role) => userRoles.includes(role));
  });

export const getRouteByPath = (path: string) => routeConfig.find((r) => r.path === path);

export const hasRouteAccess = (route: RouteConfig, userRoles: string[] = []): boolean => {
  if (route.isPublic) return true;
  if (!route.requiredRoles?.length) return true;
  return route.requiredRoles.some((role) => userRoles.includes(role));
};

export const flattenRoutes = (routes: RouteConfig[]): RouteConfig[] => {
  const flat: RouteConfig[] = [];
  routes.forEach((route) => {
    flat.push(route);
    if (route.children) flat.push(...flattenRoutes(route.children));
  });
  return flat;
};

export const getAllRoutes = (): RouteConfig[] => flattenRoutes(routeConfig);
