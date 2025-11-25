/**
 * API клиент для взаимодействия с backend
 */
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Функции для работы с токенами в localStorage
const getAccessToken = (): string | null => {
  return localStorage.getItem('access_token');
};

const getRefreshToken = (): string | null => {
  return localStorage.getItem('refresh_token');
};

const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
};

const clearTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

// Создание axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Флаг для предотвращения бесконечных попыток refresh
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: any) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor для добавления токена и логирования
api.interceptors.request.use(
  (config) => {
    console.log(`📤 [API] ${config.method?.toUpperCase()} ${config.url}`);
    
    // Добавляем токен в заголовок Authorization
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`🔑 [API] Token added to request (length: ${token.length})`);
    } else {
      console.warn(`⚠️ [API] No access token found in localStorage`);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor для обработки ошибок
api.interceptors.response.use(
  (response) => {
    console.log(`📥 [API] ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Публичные endpoints, которые не требуют авторизации
    const publicEndpoints = ['/auth/login', '/auth/register', '/auth/refresh', '/products'];
    const isPublicEndpoint = publicEndpoints.some(endpoint => 
      originalRequest?.url?.includes(endpoint)
    );

    // Если это публичный endpoint или уже пытались обновить токен, просто возвращаем ошибку
    if (isPublicEndpoint || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      // Если уже идет процесс обновления токена, добавляем запрос в очередь
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api.request(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          console.warn('⚠️ [API] No refresh token available, cannot refresh');
          console.warn('⚠️ [API] Available tokens:', {
            access: !!getAccessToken(),
            refresh: false
          });
          processQueue(new Error('No refresh token'), null);
          clearTokens();
          // Не выбрасываем ошибку, просто редиректим
          if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
            window.location.href = '/login';
          }
          return Promise.reject(error); // Возвращаем оригинальную ошибку
        }
        
        console.log('🔄 [API] Attempting to refresh token...');
        const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
        const { access_token } = response.data;
        
        // Сохраняем новый токен
        if (access_token) {
          localStorage.setItem('access_token', access_token);
          console.log('✅ [API] Token refreshed successfully');
        } else {
          console.error('❌ [API] No access_token in refresh response');
        }
        
        processQueue(null, null);
        // Повторить оригинальный запрос
        return api.request(originalRequest);
      } catch (refreshError: any) {
        console.error('❌ [API] Token refresh failed:', refreshError);
        processQueue(refreshError, null);
        clearTokens();
        // Если refresh не удался, перенаправить на логин только если не на странице логина
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ============= Типы =============

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'staff' | 'user';
  is_2fa_enabled: boolean;
  is_active: boolean;
  is_blocked: boolean;
  created_at: string;
  last_login: string | null;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url?: string;
  in_stock: boolean;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  user_id: number | null;
  username: string | null;
  role: string | null;
  operation: string;
  target_table: string | null;
  target_id: number | null;
  status: 'success' | 'failed' | 'warning';
  ip_address: string | null;
  details: string | null;
}

export interface LogsResponse {
  total: number;
  page: number;
  limit: number;
  logs: AuditLog[];
}

// ============= Auth API =============

export const authAPI = {
  register: async (data: { username: string; email: string; password: string }) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  login: async (data: { username: string; password: string; totp_token?: string }) => {
    const response = await api.post('/auth/login', data);
    console.log('📦 [API] Login response:', {
      has_access_token: !!response.data.access_token,
      has_refresh_token: !!response.data.refresh_token,
      has_user: !!response.data.user
    });
    
    // Сохраняем токены в localStorage
    if (response.data.access_token && response.data.refresh_token) {
      setTokens(response.data.access_token, response.data.refresh_token);
      console.log('💾 [API] Tokens saved to localStorage');
      
      // Проверяем, что токены действительно сохранились
      const saved = localStorage.getItem('access_token');
      if (!saved) {
        console.error('❌ [API] CRITICAL: Token not saved to localStorage!');
      }
    } else {
      console.error('❌ [API] No tokens in login response!', response.data);
    }
    return response.data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      // Всегда очищаем токены, даже если запрос не удался
      clearTokens();
    }
    return { message: 'Logged out' };
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  refresh: async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
    // Обновляем access token
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
    }
    return response.data;
  },
};

// ============= 2FA API =============

export const twoFAAPI = {
  enable: async () => {
    const response = await api.post('/2fa/enable');
    return response.data;
  },

  verify: async (totp_token: string) => {
    const response = await api.post('/2fa/verify', { totp_token });
    return response.data;
  },

  disable: async (password: string) => {
    const response = await api.post('/2fa/disable', { password });
    return response.data;
  },
};

// ============= Admin API =============

export const adminAPI = {
  // Users
  getUsers: async (): Promise<User[]> => {
    const response = await api.get('/admin/users');
    return response.data;
  },

  getUser: async (userId: number): Promise<User> => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },

  createUser: async (data: {
    username: string;
    email: string;
    password: string;
    role: 'admin' | 'staff' | 'user';
  }) => {
    const response = await api.post('/admin/users', data);
    return response.data;
  },

  updateUser: async (
    userId: number,
    data: {
      email?: string;
      is_active?: boolean;
      is_blocked?: boolean;
      role?: 'admin' | 'staff' | 'user';
    }
  ) => {
    const response = await api.put(`/admin/users/${userId}`, data);
    return response.data;
  },

  deleteUser: async (userId: number) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },

  updateUserRole: async (userId: number, role: 'admin' | 'staff' | 'user') => {
    const response = await api.put(`/admin/users/${userId}/role`, { role });
    return response.data;
  },

  reset2FA: async (userId: number) => {
    const response = await api.post(`/admin/users/${userId}/reset-2fa`);
    return response.data;
  },

  // Logs
  getLogs: async (params?: {
    page?: number;
    limit?: number;
    from_date?: string;
    to_date?: string;
    role?: string;
    operation?: string;
    status?: string;
    username?: string;
    ip_address?: string;
    sort_by?: string;
    sort_order?: string;
  }): Promise<LogsResponse> => {
    const response = await api.get('/admin/logs', { params });
    return response.data;
  },

  getLog: async (logId: number): Promise<AuditLog> => {
    const response = await api.get(`/admin/logs/${logId}`);
    return response.data;
  },

  getLogsStats: async (params?: { from_date?: string; to_date?: string }) => {
    const response = await api.get('/admin/logs/stats/summary', { params });
    return response.data;
  },
};

// ============= Products API =============

export const productsAPI = {
  getProducts: async (category?: string): Promise<Product[]> => {
    const response = await api.get('/products', { params: { category } });
    return response.data;
  },

  getProduct: async (productId: number): Promise<Product> => {
    const response = await api.get(`/products/${productId}`);
    return response.data;
  },
};

// Экспорт функций для работы с токенами
export { getAccessToken, getRefreshToken, setTokens, clearTokens };

export default api;

