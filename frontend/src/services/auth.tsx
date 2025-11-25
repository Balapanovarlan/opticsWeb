/**
 * Контекст аутентификации
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, User } from './api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string, totp_token?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Проверка текущего пользователя при загрузке
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    console.log('🔍 [AUTH] Checking authentication...');
    const token = localStorage.getItem('access_token');
    console.log('🔑 [AUTH] Token in localStorage:', token ? `exists (${token.length} chars)` : 'not found');
    
    try {
      const userData = await authAPI.getCurrentUser();
      console.log('✅ [AUTH] User authenticated:', userData.username);
      setUser(userData);
    } catch (error: any) {
      // Игнорируем 401/403 ошибки при проверке авторизации (пользователь просто не авторизован)
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log(`ℹ️ [AUTH] User not authenticated (${error.response?.status})`);
        console.log('🔑 [AUTH] Clearing tokens...');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      } else {
        console.error('❌ [AUTH] Auth check error:', error);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string, totp_token?: string) => {
    console.log('🔐 [AUTH] Starting login for:', username);
    try {
      const response = await authAPI.login({ username, password, totp_token });
      console.log('✅ [AUTH] Login successful, user:', response.user);
      
      // Проверяем, что токены действительно сохранились
      const savedToken = localStorage.getItem('access_token');
      const savedRefreshToken = localStorage.getItem('refresh_token');
      
      if (savedToken && savedRefreshToken) {
        console.log('💾 [AUTH] Tokens saved to localStorage');
        console.log(`   - access_token: ${savedToken.length} chars`);
        console.log(`   - refresh_token: ${savedRefreshToken.length} chars`);
      } else {
        console.error('❌ [AUTH] Tokens NOT saved to localStorage!');
        console.error('   - access_token:', savedToken ? 'exists' : 'MISSING');
        console.error('   - refresh_token:', savedRefreshToken ? 'exists' : 'MISSING');
        console.error('   - Response data:', response);
      }
      
      // Устанавливаем пользователя из ответа (не делаем запрос /auth/me)
      setUser(response.user);
    } catch (error: any) {
      console.error('❌ [AUTH] Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    console.log('🚪 [AUTH] Logging out...');
    await authAPI.logout();
    setUser(null);
    console.log('✅ [AUTH] Logged out, tokens cleared');
  };

  const refreshUser = async () => {
    const userData = await authAPI.getCurrentUser();
    setUser(userData);
  };

  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'admin' || user?.role === 'staff';

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, refreshUser, isAdmin, isStaff }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

