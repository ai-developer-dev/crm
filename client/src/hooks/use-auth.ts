import { useState, useEffect, createContext, useContext } from "react";
import { AuthState, AuthUser, getStoredAuth, setStoredAuth, clearStoredAuth, getAuthHeaders } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthState = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const checkAuth = async () => {
    const { token, user } = getStoredAuth();
    
    if (!token || !user) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      // Verify token is still valid by fetching current user
      const response = await fetch('/api/auth/me', {
        headers: getAuthHeaders(token),
      });

      if (response.ok) {
        const currentUser = await response.json();
        setAuthState({
          user: currentUser,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        // Token is invalid
        clearStoredAuth();
        setAuthState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      clearStoredAuth();
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiRequest('POST', '/api/auth/login', { email, password });
      const data = await response.json();
      
      setStoredAuth(data.token, data.user);
      setAuthState({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      clearStoredAuth();
      throw error;
    }
  };

  const logout = async () => {
    const { token } = getStoredAuth();
    
    try {
      if (token) {
        await apiRequest('POST', '/api/auth/logout');
      }
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      clearStoredAuth();
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return {
    ...authState,
    login,
    logout,
    checkAuth,
  };
};

export { AuthContext };
