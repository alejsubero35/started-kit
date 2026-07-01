import { apiService } from './api.service';
import type { User } from '@/contexts/authContextObj';

interface LoginCredentials {
  email: string;
  password: string;
  device_name?: string;
}

interface ApiLoginResponse {
  token: string;
  user: User;
  message?: string;
}

interface ApiMeResponse {
  data: User;
}

export const idennaAuthService = {
  STORAGE_USER_KEY: 'auth_user',

  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    const response = await apiService.post<LoginCredentials, ApiLoginResponse>(
      '/login',
      {
        email: credentials.email,
        password: credentials.password,
        device_name: credentials.device_name ?? this.getDeviceName(),
      },
      false,
    );

    if (!response?.token) {
      throw new Error('El servidor no devolvió un token de autenticación.');
    }

    apiService.setToken(response.token);

    const user = response.user ?? (await this.getCurrentUser());
    if (!user) {
      throw new Error('No se pudo obtener el usuario autenticado.');
    }

    try {
      localStorage.setItem(this.STORAGE_USER_KEY, JSON.stringify(user));
    } catch {
      // noop
    }

    return { user, token: response.token };
  },

  async logout(): Promise<void> {
    await apiService.post('/logout', {}, true);
  },

  async changePassword(payload: {
    current_password?: string;
    password: string;
    password_confirmation: string;
  }): Promise<void> {
    await apiService.put('/me/password', payload, true);
  },

  async getCurrentUser(): Promise<User | null> {
    const token = apiService.loadToken();
    if (!token) return null;

    try {
      const response = await apiService.get<ApiMeResponse>('/me', true);
      return response.data ?? null;
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        (error as { response?: { status?: number } }).response?.status === 401
      ) {
        await this.logout().catch(() => undefined);
        return null;
      }
      throw error;
    }
  },

  getDeviceName(): string {
    if (typeof navigator === 'undefined') return 'PWA';
    const ua = navigator.userAgent;
    if (/Mobile|Android|iPhone/i.test(ua)) return 'Móvil PWA';
    return 'Escritorio PWA';
  },
};
