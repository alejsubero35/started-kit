import { createContext } from 'react';

export interface OperativoSummary {
  id: number;
  uuid: string;
  code: string;
  name: string;
  type?: string;
  status?: string;
}

export interface User {
  id: number | string;
  name?: string;
  email: string;
  phone?: string | null;
  organization?: string | null;
  is_active?: boolean;
  roles?: string[];
  permissions?: string[];
  current_operativo?: OperativoSummary | null;
}

export interface AuthContextType {
  user: User | null;
  login: (identifier: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export default AuthContext;
