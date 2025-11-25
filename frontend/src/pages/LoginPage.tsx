import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/services/auth';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpToken, setTotpToken] = useState('');
  const [require2FA, setRequire2FA] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password, totpToken || undefined);
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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
              autoComplete="current-password"
              disabled={require2FA}
            />
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

