import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '@/services/auth';

export default function MainLayout() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="text-2xl font-bold text-primary-600">
              🥽 Оптика
            </Link>

            <div className="flex items-center space-x-6">
              <Link to="/products" className="text-gray-700 hover:text-primary-600">
                Каталог
              </Link>

              {user ? (
                <>
                  <Link to="/profile" className="text-gray-700 hover:text-primary-600">
                    Профиль
                  </Link>

                  {(user.role === 'admin' || user.role === 'staff') && (
                    <Link to="/admin" className="text-gray-700 hover:text-primary-600">
                      Админ-панель
                    </Link>
                  )}

                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">
                      {user.username}
                      <span className="ml-2 badge badge-info">{user.role}</span>
                    </span>
                    <button onClick={handleLogout} className="btn btn-secondary text-sm">
                      Выйти
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn-primary text-sm">
                    Войти
                  </Link>
                  <Link to="/register" className="btn btn-secondary text-sm">
                    Регистрация
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2024 Оптика. Система защиты информации.</p>
        </div>
      </footer>
    </div>
  );
}

