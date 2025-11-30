import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/services/auth';

export default function GoogleAuthSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setTokens } = useAuth();

  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    if (accessToken && refreshToken) {
      // Сохраняем токены в localStorage
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      
      // Обновляем состояние auth context
      if (setTokens) {
        setTokens(accessToken, refreshToken);
      }

      // Перенаправляем на профиль
      setTimeout(() => {
        navigate('/profile');
      }, 500);
    } else {
      // Если нет токенов, перенаправляем на страницу входа
      navigate('/login?error=oauth_failed');
    }
  }, [searchParams, navigate, setTokens]);

  return (
    <div className="max-w-md mx-auto">
      <div className="card text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold mb-2">
          Вход через Google
        </h1>
        <p className="text-gray-600">
          Авторизация...
        </p>
      </div>
    </div>
  );
}

