import { useState, useEffect } from 'react';
import { adminAPI, AuditLog, LogsResponse } from '@/services/api';

export default function AdminLogsPage() {
  const [logsData, setLogsData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    username: '',
    operation: '',
    status: '',
    role: '',
    sort_by: 'timestamp',
    sort_order: 'desc',
  });

  useEffect(() => {
    loadLogs();
  }, [filters.page, filters.limit, filters.sort_by, filters.sort_order]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      );
      const data = await adminAPI.getLogs(cleanFilters);
      setLogsData(data);
    } catch (err: any) {
      setError('Ошибка загрузки логов');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterApply = () => {
    setFilters({ ...filters, page: 1 });
    loadLogs();
  };

  const handleClearFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      username: '',
      operation: '',
      status: '',
      role: '',
      sort_by: 'timestamp',
      sort_order: 'desc',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <span className="badge badge-success">Успех</span>;
      case 'failed':
        return <span className="badge badge-error">Ошибка</span>;
      case 'warning':
        return <span className="badge badge-warning">Предупреждение</span>;
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  const totalPages = logsData ? Math.ceil(logsData.total / logsData.limit) : 0;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Журнал событий</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="card mb-6">
        <h3 className="text-lg font-bold mb-4">Фильтры</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Пользователь</label>
            <input
              type="text"
              value={filters.username}
              onChange={(e) => setFilters({ ...filters, username: e.target.value })}
              className="input"
              placeholder="Введите имя"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Операция</label>
            <select
              value={filters.operation}
              onChange={(e) => setFilters({ ...filters, operation: e.target.value })}
              className="input"
            >
              <option value="">Все</option>
              <option value="login_success">Успешный вход</option>
              <option value="login_failed">Неудачный вход</option>
              <option value="logout">Выход</option>
              <option value="2fa_enabled">2FA включен</option>
              <option value="2fa_disabled">2FA отключен</option>
              <option value="registration">Регистрация</option>
              <option value="user_created">Создание пользователя</option>
              <option value="user_deleted">Удаление пользователя</option>
              <option value="role_changed">Изменение роли</option>
              <option value="logs_viewed">Просмотр логов</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Статус</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="input"
            >
              <option value="">Все</option>
              <option value="success">Успех</option>
              <option value="failed">Ошибка</option>
              <option value="warning">Предупреждение</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Роль</label>
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              className="input"
            >
              <option value="">Все</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
              <option value="user">User</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Сортировка</label>
            <select
              value={filters.sort_by}
              onChange={(e) => setFilters({ ...filters, sort_by: e.target.value })}
              className="input"
            >
              <option value="timestamp">По времени</option>
              <option value="username">По пользователю</option>
              <option value="operation">По операции</option>
              <option value="status">По статусу</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Порядок</label>
            <select
              value={filters.sort_order}
              onChange={(e) => setFilters({ ...filters, sort_order: e.target.value })}
              className="input"
            >
              <option value="desc">По убыванию</option>
              <option value="asc">По возрастанию</option>
            </select>
          </div>
        </div>

        <div className="flex space-x-2 mt-4">
          <button onClick={handleFilterApply} className="btn btn-primary">
            Применить фильтры
          </button>
          <button onClick={handleClearFilters} className="btn btn-secondary">
            Сбросить
          </button>
        </div>
      </div>

      {/* Stats */}
      {logsData && (
        <div className="mb-4 text-gray-600">
          Найдено записей: <span className="font-bold">{logsData.total}</span>
          {' | '}
          Страница: <span className="font-bold">{logsData.page} из {totalPages}</span>
        </div>
      )}

      {/* Logs Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">Время</th>
                  <th className="text-left py-3 px-2">Пользователь</th>
                  <th className="text-left py-3 px-2">Роль</th>
                  <th className="text-left py-3 px-2">Операция</th>
                  <th className="text-left py-3 px-2">Статус</th>
                  <th className="text-left py-3 px-2">IP</th>
                  <th className="text-left py-3 px-2">Детали</th>
                </tr>
              </thead>
              <tbody>
                {logsData?.logs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('ru-RU')}
                    </td>
                    <td className="py-3 px-2">{log.username || '—'}</td>
                    <td className="py-3 px-2">
                      {log.role ? (
                        <span className={`badge ${
                          log.role === 'admin' ? 'badge-error' :
                          log.role === 'staff' ? 'badge-warning' : 'badge-info'
                        }`}>
                          {log.role}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-2">{log.operation}</td>
                    <td className="py-3 px-2">{getStatusBadge(log.status)}</td>
                    <td className="py-3 px-2">{log.ip_address || '—'}</td>
                    <td className="py-3 px-2 max-w-xs truncate">{log.details || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-6">
              <button
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                disabled={filters.page === 1}
                className="btn btn-secondary disabled:opacity-50"
              >
                ← Назад
              </button>

              <span className="text-gray-600">
                Страница {filters.page} из {totalPages}
              </span>

              <button
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                disabled={filters.page >= totalPages}
                className="btn btn-secondary disabled:opacity-50"
              >
                Вперед →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

