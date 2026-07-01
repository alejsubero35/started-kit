import React from 'react';
import { useUI } from '@/contexts/UIContext';
import { useDemoAuth } from '@/features/auth/DemoAuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  List,
  X,
  SignOut,
  UserCircle,
  Key,
} from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { assetUrl } from '@/lib/assets';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OfflineHeaderControls } from '@/offline/components/OfflineStatusBar';

interface HeaderProps {
  className?: string;
}

export function MasterHeader({ className = '' }: HeaderProps) {
  const {
    toggleSidebar,
    isMobile,
    isMobileDrawerOpen,
  } = useUI();

  const { user, logout } = useDemoAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b border-border/50 glass-header shadow-soft transition-smooth border-t-[3px] border-t-[#103B73] ${className}`}
    >
      <div className="relative flex h-16 w-full items-center gap-2 px-4 lg:gap-4 lg:px-8">
        {/* Left - Menu Toggle (only on mobile/tablet) */}
        <div className="flex shrink-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-10 w-10 rounded-lg hover:bg-muted/80 transition-smooth lg:hidden focus-modern"
          >
            {isMobile ? (
              isMobileDrawerOpen ? (
                <X className="h-5 w-5" weight="bold" />
              ) : (
                <List className="h-5 w-5" weight="bold" />
              )
            ) : (
              <List className="h-5 w-5" weight="bold" />
            )}
            <span className="sr-only">Toggle sidebar</span>
          </Button>
        </div>

        {/* Offline status + sync (centro) */}
        <OfflineHeaderControls className="min-w-0 flex-1" />

        {/* Center - Title with Logo (visible on mobile) */}
        <div className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 items-center gap-2 lg:hidden">
          <img
            src={assetUrl('img/logo.png')}
            alt="IDENNA"
            className="h-8 w-8 rounded bg-white p-0.5 object-contain"
          />
          <span className="text-base font-semibold text-foreground">SIRP-NNA</span>
        </div>

        {/* Right - User Avatar */}
        <div className="relative z-10 flex shrink-0 items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-lg p-0 hover:bg-muted/80 transition-smooth focus-modern"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 font-semibold text-primary-foreground">
                    {user?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="glass-card w-64 p-0 shadow-soft-lg" align="end" forceMount>
              <div className="border-b border-border/50 p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 ring-2 ring-border/50">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-lg font-semibold text-primary-foreground">
                      {user?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-tight">{user?.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
              </div>
              <div className="p-2">
                <DropdownMenuItem asChild className="cursor-pointer rounded-lg transition-smooth">
                  <Link to="/profile" className="flex items-center">
                    <UserCircle className="mr-3 h-4 w-4" weight="duotone" />
                    <span className="text-sm font-medium">Mi perfil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer rounded-lg transition-smooth">
                  <Link to="/profile#password" className="flex items-center">
                    <Key className="mr-3 h-4 w-4" weight="duotone" />
                    <span className="text-sm font-medium">Cambiar contraseña</span>
                  </Link>
                </DropdownMenuItem>
              </div>
              <div className="border-t border-border/50 p-2">
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer rounded-lg text-destructive transition-smooth focus:bg-destructive/10 focus:text-destructive"
                >
                  <SignOut className="mr-3 h-4 w-4" weight="duotone" />
                  <span className="text-sm font-medium">Cerrar sesión</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
