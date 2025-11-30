import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/services/auth';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpToken, setTotpToken] = useState('');
  const [require2FA, setRequire2FA] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  // Проверка ошибок OAuth из URL
  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (oauthError) {
      const message = searchParams.get('message');
      setError(message || 'Ошибка входа через Google');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username.trim(), password, totpToken || undefined);
      navigate('/profile');
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Ошибка входа';
      
      if (errorMessage.includes('2FA') || errorMessage.includes('Требуется 2FA код')) {
        setRequire2FA(true);
        setError('Введите 2FA код из Google Authenticator');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="card">
        <h1 className="text-3xl font-bold text-center mb-6">Вход в систему</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Имя пользователя
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input"
              required
              autoComplete="username"
              disabled={require2FA}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Пароль
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pr-10"
                required
                autoComplete="current-password"
                disabled={require2FA}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {require2FA && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                2FA код (Google Authenticator)
              </label>
              <input
                type="text"
                value={totpToken}
                onChange={(e) => setTotpToken(e.target.value)}
                className="input"
                placeholder="000000"
                maxLength={6}
                pattern="[0-9]{6}"
                required
                autoFocus
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Или</span>
          </div>
        </div>

        <button
          onClick={() => window.location.href = 'http://localhost:8000/auth/google/login'}
          className="btn btn-secondary w-full flex items-center justify-center gap-2"
          type="button"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Войти через Google
        </button>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Нет аккаунта?{' '}
            <Link to="/register" className="text-primary-600 hover:underline">
              Зарегистрироваться
            </Link>
          </p>
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">Тестовые аккаунты:</p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>👨‍💼 admin / Admin123! (администратор)</li>
            <li>👤 staff_user / Staff123! (персонал)</li>
            <li>👤 regular_user / User123! (пользователь)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

