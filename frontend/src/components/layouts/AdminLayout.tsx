import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/services/auth';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path ? 'bg-primary-100 text-primary-700' : 'text-gray-700 hover:bg-gray-100';
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <Link to="/" className="text-2xl font-bold text-primary-600">
            🥽 Оптика
          </Link>
          <p className="text-sm text-gray-600 mt-1">Админ-панель</p>
        </div>

        <nav className="mt-6">
          <Link
            to="/admin"
            className={`block px-6 py-3 ${isActive('/admin')}`}
          >
            📊 Дашборд
          </Link>
          <Link
            to="/admin/users"
            className={`block px-6 py-3 ${isActive('/admin/users')}`}
          >
            👥 Пользователи
          </Link>
          <Link
            to="/admin/logs"
            className={`block px-6 py-3 ${isActive('/admin/logs')}`}
          >
            📝 Журнал событий
          </Link>
        </nav>

        <div className="absolute bottom-0 w-64 p-6 border-t">
          <div className="mb-3">
            <p className="text-sm font-semibold">{user?.username}</p>
            <p className="text-xs text-gray-600">{user?.email}</p>
            <span className="badge badge-info mt-1">{user?.role}</span>
          </div>
          <Link to="/" className="btn btn-secondary w-full mb-2 text-sm">
            На главную
          </Link>
          <button onClick={handleLogout} className="btn btn-danger w-full text-sm">
            Выйти
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-gray-50 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

