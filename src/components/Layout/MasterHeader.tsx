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
  const { toggleSidebar, isMobile, isMobileDrawerOpen } = useUI();
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
      <div className="relative flex h-14 w-full items-center gap-2 px-3 sm:px-4 lg:h-16 lg:gap-4 lg:px-8">
        {/* Izquierda: menú + marca (móvil) */}
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-9 w-9 shrink-0 rounded-xl hover:bg-muted/80 transition-smooth lg:hidden focus-modern"
          >
            {isMobile && isMobileDrawerOpen ? (
              <X className="h-5 w-5" weight="bold" />
            ) : (
              <List className="h-5 w-5" weight="bold" />
            )}
            <span className="sr-only">Abrir menú</span>
          </Button>

          <Link
            to="/dashboard"
            className="flex min-w-0 items-center gap-1.5 lg:hidden"
            aria-label="Ir al inicio"
          >
            <img
              src={assetUrl('img/logo.png')}
              alt=""
              className="h-7 w-7 shrink-0 rounded-md bg-white p-0.5 object-contain shadow-sm"
            />
            <span className="truncate text-sm font-semibold tracking-tight text-[#103B73]">
              SIRP-NNA
            </span>
          </Link>
        </div>

        {/* Centro: estado offline (desktop ocupa el centro; móvil va a la derecha) */}
        <OfflineHeaderControls className="min-w-0 flex-1 lg:mx-2" />

        {/* Derecha: avatar */}
        <div className="relative z-10 flex shrink-0 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-9 w-9 rounded-full p-0 ring-2 ring-transparent hover:bg-muted/80 hover:ring-border/40 transition-smooth focus-modern lg:h-10 lg:w-10"
              >
                <Avatar className="h-8 w-8 lg:h-9 lg:w-9">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback className="bg-gradient-to-br from-[#103B73] to-[#0d3260] text-sm font-semibold text-white">
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
                    <AvatarFallback className="bg-gradient-to-br from-[#103B73] to-[#0d3260] text-lg font-semibold text-white">
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
