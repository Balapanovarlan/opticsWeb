import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '@/services/api';
import { useAuth } from '@/services/auth';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [users, logsStats] = await Promise.all([
        adminAPI.getUsers(),
        adminAPI.getLogsStats(),
      ]);

      setStats({
        totalUsers: users.length,
        adminUsers: users.filter((u) => u.role === 'admin').length,
        staffUsers: users.filter((u) => u.role === 'staff').length,
        regularUsers: users.filter((u) => u.role === 'user').length,
        activeUsers: users.filter((u) => u.is_active).length,
        with2FA: users.filter((u) => u.is_2fa_enabled).length,
        logsStats,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Панель администратора</h1>

      {/* Welcome */}
      <div className="card mb-6 bg-primary-50 border border-primary-200">
        <h2 className="text-xl font-bold text-primary-900">
          Добро пожаловать, {user?.username}!
        </h2>
        <p className="text-primary-800 mt-2">
          Вы вошли как <span className="badge badge-info">{user?.role}</span>
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card bg-blue-50 border border-blue-200">
          <div className="text-3xl mb-2">👥</div>
          <div className="text-3xl font-bold text-blue-900">{stats.totalUsers}</div>
          <div className="text-blue-700">Всего пользователей</div>
        </div>

        <div className="card bg-green-50 border border-green-200">
          <div className="text-3xl mb-2">✅</div>
          <div className="text-3xl font-bold text-green-900">{stats.activeUsers}</div>
          <div className="text-green-700">Активных</div>
        </div>

        <div className="card bg-purple-50 border border-purple-200">
          <div className="text-3xl mb-2">🔒</div>
          <div className="text-3xl font-bold text-purple-900">{stats.with2FA}</div>
          <div className="text-purple-700">С включенным 2FA</div>
        </div>

        <div className="card bg-orange-50 border border-orange-200">
          <div className="text-3xl mb-2">📝</div>
          <div className="text-3xl font-bold text-orange-900">
            {stats.logsStats?.total_events || 0}
          </div>
          <div className="text-orange-700">Событий в логах</div>
        </div>
      </div>

      {/* Users by Role */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h3 className="text-xl font-bold mb-4">Пользователи по ролям</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span>👨‍💼 Администраторы</span>
              <span className="badge badge-error">{stats.adminUsers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>👤 Персонал (Staff)</span>
              <span className="badge badge-warning">{stats.staffUsers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>👤 Пользователи</span>
              <span className="badge badge-info">{stats.regularUsers}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-bold mb-4">События по статусу</h3>
          <div className="space-y-3">
            {stats.logsStats?.by_status && Object.entries(stats.logsStats.by_status).map(([status, count]: any) => (
              <div key={status} className="flex justify-between items-center">
                <span>
                  {status === 'success' && '✅ Успешные'}
                  {status === 'failed' && '❌ Неудачные'}
                  {status === 'warning' && '⚠️ Предупреждения'}
                </span>
                <span className={`badge ${
                  status === 'success' ? 'badge-success' :
                  status === 'failed' ? 'badge-error' : 'badge-warning'
                }`}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Operations */}
      {stats.logsStats?.top_operations && (
        <div className="card mb-6">
          <h3 className="text-xl font-bold mb-4">Топ операций</h3>
          <div className="space-y-2">
            {Object.entries(stats.logsStats.top_operations).slice(0, 5).map(([operation, count]: any) => (
              <div key={operation} className="flex justify-between items-center">
                <span className="text-sm">{operation}</span>
                <span className="badge badge-info">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6">
        <Link to="/admin/users" className="card hover:shadow-lg transition-shadow text-center">
          <div className="text-4xl mb-2">👥</div>
          <h3 className="text-lg font-bold">Управление пользователями</h3>
          <p className="text-gray-600 text-sm mt-2">Создание, редактирование, удаление</p>
        </Link>

        <Link to="/admin/logs" className="card hover:shadow-lg transition-shadow text-center">
          <div className="text-4xl mb-2">📝</div>
          <h3 className="text-lg font-bold">Журнал событий</h3>
          <p className="text-gray-600 text-sm mt-2">Просмотр логов и аудит</p>
        </Link>

        <Link to="/" className="card hover:shadow-lg transition-shadow text-center">
          <div className="text-4xl mb-2">🏠</div>
          <h3 className="text-lg font-bold">На главную</h3>
          <p className="text-gray-600 text-sm mt-2">Вернуться на сайт</p>
        </Link>
      </div>
    </div>
  );
}

