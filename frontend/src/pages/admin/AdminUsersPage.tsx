import { useState, useEffect } from 'react';
import { adminAPI, User } from '@/services/api';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Create user form
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'staff' | 'user',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError('Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminAPI.createUser(newUser);
      setSuccess(`Пользователь ${newUser.username} создан`);
      setShowCreateModal(false);
      setNewUser({ username: '', email: '', password: '', role: 'user' });
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка создания пользователя');
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!confirm(`Удалить пользователя ${username}?`)) return;

    try {
      await adminAPI.deleteUser(userId);
      setSuccess(`Пользователь ${username} удален`);
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка удаления');
    }
  };

  const handleToggleBlock = async (user: User) => {
    try {
      await adminAPI.updateUser(user.id, { is_blocked: !user.is_blocked });
      setSuccess(`Пользователь ${user.username} ${!user.is_blocked ? 'заблокирован' : 'разблокирован'}`);
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка');
    }
  };

  const handleReset2FA = async (user: User) => {
    if (!confirm(`Сбросить 2FA для ${user.username}?`)) return;

    try {
      await adminAPI.reset2FA(user.id);
      setSuccess(`2FA сброшен для ${user.username}`);
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка');
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Управление пользователями</h1>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          ➕ Создать пользователя
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button onClick={() => setError('')} className="float-right font-bold">×</button>
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
          <button onClick={() => setSuccess('')} className="float-right font-bold">×</button>
        </div>
      )}

      {/* Users Table */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-2">ID</th>
              <th className="text-left py-3 px-2">Пользователь</th>
              <th className="text-left py-3 px-2">Email</th>
              <th className="text-left py-3 px-2">Роль</th>
              <th className="text-left py-3 px-2">Статус</th>
              <th className="text-left py-3 px-2">2FA</th>
              <th className="text-left py-3 px-2">Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-2">{user.id}</td>
                <td className="py-3 px-2 font-semibold">{user.username}</td>
                <td className="py-3 px-2">{user.email}</td>
                <td className="py-3 px-2">
                  <span className={`badge ${
                    user.role === 'admin' ? 'badge-error' :
                    user.role === 'staff' ? 'badge-warning' : 'badge-info'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="py-3 px-2">
                  <span className={`badge ${user.is_active ? 'badge-success' : 'badge-error'}`}>
                    {user.is_active ? 'Активен' : 'Неактивен'}
                  </span>
                  {user.is_blocked && <span className="badge badge-error ml-1">Заблокирован</span>}
                </td>
                <td className="py-3 px-2">
                  {user.is_2fa_enabled ? '✅' : '❌'}
                </td>
                <td className="py-3 px-2">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleToggleBlock(user)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {user.is_blocked ? 'Разблокировать' : 'Заблокировать'}
                    </button>
                    {user.is_2fa_enabled && (
                      <button
                        onClick={() => handleReset2FA(user)}
                        className="text-sm text-orange-600 hover:underline"
                      >
                        Сбросить 2FA
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteUser(user.id, user.username)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Удалить
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Создать пользователя</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Имя пользователя</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="input"
                  required
                  minLength={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Пароль</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="input"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Роль</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                  className="input"
                >
                  <option value="user">User</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex space-x-2">
                <button type="submit" className="btn btn-primary flex-1">
                  Создать
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

