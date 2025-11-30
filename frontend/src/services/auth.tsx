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
  setTokens?: (accessToken: string, refreshToken: string) => void;
  isAdmin: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // ВАЖНО: Инициализируем loading как true только если есть токен в localStorage
  // Иначе будет мгновенный редирект на /login до проверки
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => {
    // Проверяем наличие токена при инициализации
    const hasToken = !!localStorage.getItem('access_token');
    console.log('🎬 [AUTH] Initial loading state:', hasToken ? 'true (has token)' : 'false (no token)');
    return hasToken; // Если токен есть - показываем загрузку, если нет - сразу false
  });

  // Проверка текущего пользователя при загрузке
  useEffect(() => {
    console.log('🔄 [AUTH] AuthProvider mounted');
    
    // Проверяем токен перед вызовом checkAuth
    const hasToken = !!localStorage.getItem('access_token');
    
    if (hasToken) {
      console.log('✅ [AUTH] Token found, checking auth...');
      checkAuth();
    } else {
      console.log('ℹ️ [AUTH] No token on mount, skipping auth check');
      setLoading(false);
    }
  }, []);

  const checkAuth = async () => {
    console.log('🔍 [AUTH] Checking authentication...');
    console.log('📍 [AUTH] Current URL:', window.location.href);
    console.log('🌐 [AUTH] Origin:', window.location.origin);
    
    // Детальная проверка localStorage
    const token = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    
    console.log('🔑 [AUTH] Tokens check:', {
      access: token ? `exists (${token.length} chars)` : '❌ NOT FOUND',
      refresh: refreshToken ? `exists (${refreshToken.length} chars)` : '❌ NOT FOUND',
      localStorageLength: localStorage.length,
      allKeys: Object.keys(localStorage)
    });

    // Если токена нет — нет смысла дергать backend
    if (!token) {
      console.log('ℹ️ [AUTH] No access token, user is not authenticated');
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const userData = await authAPI.getCurrentUser();
      console.log('✅ [AUTH] User authenticated:', userData.username);
      setUser(userData);
    } catch (error: any) {
      // Игнорируем 401/403 ошибки при проверке авторизации
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log(`ℹ️ [AUTH] User not authenticated (${error.response?.status})`);
        console.log('🔑 [AUTH] Clearing invalid tokens...');
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
    
    // Проверяем localStorage ДО логина
    console.log('📦 [AUTH] localStorage BEFORE login:', {
      access: localStorage.getItem('access_token') ? 'exists' : 'none',
      refresh: localStorage.getItem('refresh_token') ? 'exists' : 'none'
    });
    
    try {
      const response = await authAPI.login({ username, password, totp_token });
      console.log('✅ [AUTH] Login successful, user:', response.user);
      
      // Немедленно проверяем localStorage ПОСЛЕ логина
      setTimeout(() => {
        const savedToken = localStorage.getItem('access_token');
        const savedRefreshToken = localStorage.getItem('refresh_token');
        
        console.log('📦 [AUTH] localStorage AFTER login:', {
          access: savedToken ? `${savedToken.substring(0, 20)}... (${savedToken.length} chars)` : 'MISSING',
          refresh: savedRefreshToken ? `${savedRefreshToken.substring(0, 20)}... (${savedRefreshToken.length} chars)` : 'MISSING'
        });
        
        if (!savedToken || !savedRefreshToken) {
          console.error('❌ [AUTH] CRITICAL: Tokens NOT in localStorage after login!');
          console.error('   - Response had tokens:', {
            access: !!response.access_token,
            refresh: !!response.refresh_token
          });
        }
      }, 100);
      
      // Устанавливаем пользователя из ответа
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

  const setTokens = (accessToken: string, refreshToken: string) => {
    console.log('🔑 [AUTH] Setting tokens manually (OAuth)');
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    // После установки токенов проверяем аутентификацию
    checkAuth();
  };

  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'admin' || user?.role === 'staff';

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, refreshUser, setTokens, isAdmin, isStaff }}
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

