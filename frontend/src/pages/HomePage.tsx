import { Link } from 'react-router-dom';
import { useAuth } from '@/services/auth';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-16">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Добро пожаловать в магазин Оптики
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Интернет-магазин с встроенной системой защиты информации
        </p>
        <div className="flex justify-center space-x-4">
          <Link to="/products" className="btn btn-primary text-lg">
            Посмотреть каталог
          </Link>
          {!user && (
            <Link to="/register" className="btn btn-secondary text-lg">
              Регистрация
            </Link>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="grid md:grid-cols-3 gap-8">
        <div className="card text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h3 className="text-xl font-bold mb-2">Безопасность</h3>
          <p className="text-gray-600">
            JWT аутентификация, двухфакторная защита (2FA TOTP)
          </p>
        </div>

        <div className="card text-center">
          <div className="text-4xl mb-4">👥</div>
          <h3 className="text-xl font-bold mb-2">Управление доступом</h3>
          <p className="text-gray-600">
            RBAC система с ролями: Admin, Staff, User
          </p>
        </div>

        <div className="card text-center">
          <div className="text-4xl mb-4">📝</div>
          <h3 className="text-xl font-bold mb-2">Аудит</h3>
          <p className="text-gray-600">
            Полное логирование всех действий в системе
          </p>
        </div>
      </section>

      {/* Security Info */}
      <section className="card bg-primary-50 border border-primary-200">
        <h2 className="text-2xl font-bold text-primary-900 mb-4">
          🛡️ Система защиты информации
        </h2>
        <ul className="space-y-2 text-primary-800">
          <li>✅ HTTPS/TLS шифрование</li>
          <li>✅ Bcrypt хэширование паролей</li>
          <li>✅ HttpOnly cookies для токенов</li>
          <li>✅ Защита от CSRF, XSS, SQL injection</li>
          <li>✅ Rate limiting для входа</li>
          <li>✅ Централизованное логирование</li>
        </ul>
      </section>

      {/* User Info */}
      {user && (
        <section className="card bg-green-50 border border-green-200">
          <h2 className="text-xl font-bold text-green-900 mb-2">
            Добро пожаловать, {user.username}!
          </h2>
          <p className="text-green-800">
            Ваша роль: <span className="badge badge-success">{user.role}</span>
          </p>
          <p className="text-green-800 mt-2">
            2FA: {user.is_2fa_enabled ? '✅ Включен' : '❌ Отключен'}
          </p>
          <div className="mt-4 space-x-2">
            <Link to="/profile" className="btn btn-primary">
              Перейти в профиль
            </Link>
            {(user.role === 'admin' || user.role === 'staff') && (
              <Link to="/admin" className="btn btn-secondary">
                Админ-панель
              </Link>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

