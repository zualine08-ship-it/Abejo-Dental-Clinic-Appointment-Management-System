import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import axiosInstance from './axios';

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  age?: number;
  gender?: string;
  address?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<User>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is authenticated
  const checkAuth = async (): Promise<boolean> => {
    try {
      const response = await axiosInstance.get('/api/me');
      setUser(response.data.user);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      return false;
    }
  };

  // Login
  const login = async (email: string, password: string, rememberMe = false): Promise<User> => {
    try {
      const response = await axiosInstance.post('/api/login', {
        email,
        password,
        rememberMe,
      });

      const userData = response.data.user;
      setUser(userData);
      setIsAuthenticated(true);
      return userData;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Login failed';
      setUser(null);
      setIsAuthenticated(false);
      throw new Error(message);
    }
  };

  // Logout
  const logout = async () => {
    try {
      await axiosInstance.post('/api/logout');
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Check auth on mount
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn('Auth check timeout - setting isLoading to false');
        setIsLoading(false);
      }
    }, 20000); // 20 second timeout

    checkAuth().finally(() => {
      clearTimeout(timeoutId);
      setIsLoading(false);
    });

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
