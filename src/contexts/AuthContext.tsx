// Auth provider for SIRP-NNA
import { useState, useEffect, useRef, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { idennaAuthService as authService } from '@/services/idenna.auth.service';
import { apiService } from '@/services/api.service';
import { resetApiBaseFromEnv } from '@/config/api';
import { AuthContext, User, AuthContextType } from './authContextObj';
import { useQueryClient } from '@tanstack/react-query';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const STORAGE_USER_KEY = authService.STORAGE_USER_KEY;
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });
  const shouldLogout = useRef(false);
  const isLoggingOut = useRef(false);
  const lastLoginAt = useRef(0);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoading(true);
      try {
        resetApiBaseFromEnv();
        const startedWithToken = !!apiService.loadToken();
        const current = await authService.getCurrentUser();
        if (mounted && current) {
          setUser(current);
          localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(current));
        } else if (mounted && current === null && startedWithToken) {
          shouldLogout.current = true;
        }
      } catch {
        // noop
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    const handleLogoutEvent = () => {
      shouldLogout.current = false;
      logout();
    };
    window.addEventListener('app-logout', handleLogoutEvent);
    return () => {
      mounted = false;
      window.removeEventListener('app-logout', handleLogoutEvent);
    };
  }, [STORAGE_USER_KEY]);

  useEffect(() => {
    if (shouldLogout.current && (Date.now() - lastLoginAt.current) / 1000 > 5) {
      shouldLogout.current = false;
      logout();
    } else {
      shouldLogout.current = false;
    }
  }, [user]);

  const login = async (identifier: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      shouldLogout.current = false;
      queryClient.removeQueries({ queryKey: ['user', 'context'] });
      resetApiBaseFromEnv();
      const response = await authService.login({ email: identifier, password });
      setUser(response.user as User);
      lastLoginAt.current = Date.now();
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(response.user));
      toast({ title: 'Inicio de sesión', description: 'Autenticación correcta' });
      navigate('/dashboard');
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo iniciar sesión';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;
    setIsLoading(true);
    try {
      await authService.logout();
    } catch {
      // noop
    }
    queryClient.removeQueries({ queryKey: ['user', 'context'] });
    apiService.clearToken();
    localStorage.removeItem(STORAGE_USER_KEY);
    setUser(null);
    toast({ title: 'Sesión cerrada', description: 'Has cerrado sesión' });
    navigate('/login');
    isLoggingOut.current = false;
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export type { User, AuthContextType } from './authContextObj';
