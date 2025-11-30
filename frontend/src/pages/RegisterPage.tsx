import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '@/services/api';
import { Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  const navigate = useNavigate();

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Пароль должен содержать минимум 8 символов';
    }
    if (!/\d/.test(pwd)) {
      return 'Пароль должен содержать хотя бы одну цифру';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Пароль должен содержать хотя бы одну строчную букву';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Пароль должен содержать хотя бы одну заглавную букву';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Валидация
    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    try {
      await authAPI.register({ username, email, password });
      setShowVerification(true);
      setSuccess(false);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Ошибка регистрации';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setVerifying(true);

    try {
      await authAPI.verifyEmail(username, verificationCode);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Неверный код';
      setError(errorMessage);
    } finally {
      setVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    try {
      await authAPI.resendVerification(username);
      setError('');
      alert('Новый код отправлен на ваш email!');
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Ошибка отправки кода';
      setError(errorMessage);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto">
        <div className="card text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-green-600 mb-2">
            Email подтвержден!
          </h1>
          <p className="text-gray-600">
            Перенаправление на страницу входа...
          </p>
        </div>
      </div>
    );
  }

  if (showVerification) {
    return (
      <div className="max-w-md mx-auto">
        <div className="card">
          <h1 className="text-3xl font-bold text-center mb-6">Подтверждение email</h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-700 mb-2">
              Мы отправили код подтверждения на ваш email: <strong>{email}</strong>
            </p>
            <p className="text-xs text-gray-600">
              Введите 6-значный код из письма
            </p>
          </div>

          <form onSubmit={handleVerifyEmail} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Код подтверждения
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="input text-center text-2xl tracking-widest"
                placeholder="000000"
                maxLength={6}
                pattern="[0-9]{6}"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={verifying || verificationCode.length !== 6}
              className="btn btn-primary w-full"
            >
              {verifying ? 'Проверка...' : 'Подтвердить email'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={handleResendCode}
              className="text-sm text-primary-600 hover:underline"
            >
              Не получили код? Отправить повторно
            </button>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setShowVerification(false);
                setVerificationCode('');
                setError('');
              }}
              className="text-sm text-gray-600 hover:underline"
            >
              ← Вернуться к регистрации
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="card">
        <h1 className="text-3xl font-bold text-center mb-6">Регистрация</h1>

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
              minLength={3}
              maxLength={50}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
              autoComplete="email"
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
                autoComplete="new-password"
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
            <p className="text-xs text-gray-500 mt-1">
              Минимум 8 символов, цифра, строчная и заглавная буквы
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Подтверждение пароля
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input pr-10"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
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
          Продолжить с Google
        </button>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="text-primary-600 hover:underline">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

