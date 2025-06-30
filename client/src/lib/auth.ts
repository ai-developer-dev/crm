import { User } from "@shared/schema";

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  userType: 'admin' | 'manager' | 'user';
  extension: string;
  phone?: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const getStoredAuth = (): { token: string | null; user: AuthUser | null } => {
  const token = localStorage.getItem('auth_token');
  const userData = localStorage.getItem('auth_user');
  
  let user = null;
  if (userData) {
    try {
      user = JSON.parse(userData);
    } catch (error) {
      console.error('Error parsing stored user data:', error);
      localStorage.removeItem('auth_user');
    }
  }
  
  return { token, user };
};

export const setStoredAuth = (token: string, user: AuthUser) => {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('auth_user', JSON.stringify(user));
};

export const clearStoredAuth = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
};

export const getAuthHeaders = (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
});
