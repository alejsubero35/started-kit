import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUI } from '@/contexts/UIContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Question, CaretDown, List } from '@phosphor-icons/react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { getSidebarRoutes } from '@/config/routes';
import { useDemoAuth } from '@/features/auth/DemoAuthContext';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href?: string;
  badge?: string | number;
  children?: SidebarItem[];
}

export function MasterSidebar({ className = '' }: { className?: string }) {
  const { user } = useDemoAuth();
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const items: SidebarItem[] = getSidebarRoutes(roles).map((r) => ({
    id: r.id,
    label: r.label,
    icon: r.icon,
    href: r.path,
  }));

  const {
    isSidebarOpen,
    isSidebarCollapsed,
    isMobile,
    isMobileDrawerOpen,
    closeMobileDrawer,
    isDesktop,
  } = useUI();

  const location = useLocation();
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set());

  if (isMobile && !isMobileDrawerOpen) return null;
  if (isDesktop && !isSidebarOpen) return null;

  const toggleExpanded = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const isItemActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(`${href}/`);

  const renderSidebarItem = (item: SidebarItem, level = 0) => {
    const Icon = item.icon;
    const isActive = item.href ? isItemActive(item.href) : false;
    const isExpanded = expandedItems.has(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const isCollapsed = isSidebarCollapsed && level === 0;

    const itemContent = (
      <>
        <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/80')} />
        {!isCollapsed && (
          <>
            <span className="flex-1 text-sm font-medium">{item.label}</span>
            {item.badge && (
              <Badge variant="secondary" className="ml-auto h-5 px-2 text-xs">{item.badge}</Badge>
            )}
            {hasChildren && (
              <CaretDown className={cn('h-4 w-4 shrink-0 transition-transform', isExpanded && 'rotate-180')} />
            )}
          </>
        )}
      </>
    );

    if (hasChildren) {
      return (
        <Collapsible key={item.id} open={isExpanded} onOpenChange={() => toggleExpanded(item.id)}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className={cn('w-full justify-start gap-3 h-10 rounded-lg text-sidebar-foreground/85 hover:text-sidebar-primary hover:bg-sidebar-accent', isCollapsed && 'justify-center px-2')}>
              {itemContent}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-1 ml-3 pl-3 border-l border-border/30">
            {item.children?.map((child) => renderSidebarItem(child, level + 1))}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    if (item.href) {
      return (
        <Link key={item.id} to={item.href}>
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start gap-3 h-10 rounded-lg text-sidebar-foreground/85 hover:text-sidebar-primary hover:bg-sidebar-accent',
              isActive && 'bg-sidebar-accent text-sidebar-primary font-semibold shadow-sm',
              isCollapsed && 'justify-center px-2',
            )}
            onClick={() => isMobile && closeMobileDrawer()}
          >
            {itemContent}
          </Button>
        </Link>
      );
    }

    return null;
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex flex-col h-full glass-sidebar transition-all duration-300',
          isSidebarCollapsed ? 'w-16' : 'w-64',
          isMobile && 'fixed inset-y-0 left-0 z-50 w-64 shadow-soft-xl',
          className,
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white p-1 overflow-hidden">
                <img src="/img/logo.png" alt="IDENNA" className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0">
                <span className="block font-semibold text-sidebar-foreground leading-tight">SIRP-NNA</span>
                <span className="block text-[10px] text-sidebar-foreground/70 truncate">IDENNA</span>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-white p-1 overflow-hidden">
              <img src="/img/logo.png" alt="IDENNA" className="h-full w-full object-contain" />
            </div>
          )}
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={closeMobileDrawer} className="h-9 w-9 text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent">
              <List className="h-4 w-4" />
            </Button>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const el = renderSidebarItem(item);
            if (isSidebarCollapsed && !item.children && el) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>{el}</TooltipTrigger>
                  <TooltipContent side="right"><p>{item.label}</p></TooltipContent>
                </Tooltip>
              );
            }
            return el;
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          {!isSidebarCollapsed && (
            <Button variant="ghost" className="w-full justify-start gap-3 h-10 text-sidebar-foreground/85 hover:text-sidebar-primary hover:bg-sidebar-accent">
              <Question className="h-4 w-4" />
              <span className="text-sm">Ayuda</span>
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
