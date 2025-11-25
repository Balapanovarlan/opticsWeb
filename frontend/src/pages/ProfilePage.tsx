import { useState } from 'react';
import { useAuth } from '@/services/auth';
import { twoFAAPI } from '@/services/api';
import { QRCodeSVG } from 'qrcode.react';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [totpToken, setTotpToken] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handleEnable2FA = async () => {
    try {
      setError('');
      setLoading(true);
      const response = await twoFAAPI.enable();
      setSecret(response.secret);
      setQrCode(response.qr_code);
      setShow2FASetup(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка включения 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    try {
      setError('');
      setLoading(true);
      await twoFAAPI.verify(totpToken);
      setSuccess('2FA успешно активирован!');
      await refreshUser();
      setShow2FASetup(false);
      setTotpToken('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Неверный код');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    try {
      setError('');
      setLoading(true);
      await twoFAAPI.disable(disablePassword);
      setSuccess('2FA успешно отключен');
      await refreshUser();
      setDisablePassword('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка отключения 2FA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Профиль пользователя</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {/* Информация о пользователе */}
      <div className="card mb-6">
        <h2 className="text-xl font-bold mb-4">Основная информация</h2>
        <div className="space-y-3">
          <div>
            <span className="text-gray-600">Имя пользователя:</span>
            <span className="ml-2 font-semibold">{user.username}</span>
          </div>
          <div>
            <span className="text-gray-600">Email:</span>
            <span className="ml-2 font-semibold">{user.email}</span>
          </div>
          <div>
            <span className="text-gray-600">Роль:</span>
            <span className="ml-2">
              <span className="badge badge-info">{user.role}</span>
            </span>
          </div>
          <div>
            <span className="text-gray-600">Статус:</span>
            <span className="ml-2">
              <span className={`badge ${user.is_active ? 'badge-success' : 'badge-error'}`}>
                {user.is_active ? 'Активен' : 'Неактивен'}
              </span>
            </span>
          </div>
          <div>
            <span className="text-gray-600">Дата регистрации:</span>
            <span className="ml-2">{new Date(user.created_at).toLocaleString('ru-RU')}</span>
          </div>
          {user.last_login && (
            <div>
              <span className="text-gray-600">Последний вход:</span>
              <span className="ml-2">{new Date(user.last_login).toLocaleString('ru-RU')}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2FA управление */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Двухфакторная аутентификация (2FA)</h2>

        <div className="mb-4">
          <span className="text-gray-600">Статус:</span>
          <span className="ml-2">
            <span className={`badge ${user.is_2fa_enabled ? 'badge-success' : 'badge-warning'}`}>
              {user.is_2fa_enabled ? '✅ Включен' : '❌ Отключен'}
            </span>
          </span>
        </div>

        {!user.is_2fa_enabled && !show2FASetup && (
          <div>
            <p className="text-gray-600 mb-4">
              Включите двухфакторную аутентификацию для дополнительной защиты вашего аккаунта.
            </p>
            <button
              onClick={handleEnable2FA}
              disabled={loading}
              className="btn btn-primary"
            >
              Включить 2FA
            </button>
          </div>
        )}

        {show2FASetup && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-bold mb-2">Шаг 1: Отсканируйте QR код</h3>
              <p className="text-sm text-gray-600 mb-4">
                Откройте Google Authenticator на вашем телефоне и отсканируйте этот QR код
              </p>
              <div className="flex justify-center bg-white p-4 rounded-lg">
                <img src={qrCode} alt="QR Code" className="w-64 h-64" />
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-600">Секретный ключ (если не работает QR):</p>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">{secret}</code>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-2">Шаг 2: Введите код из приложения</h3>
              <input
                type="text"
                value={totpToken}
                onChange={(e) => setTotpToken(e.target.value)}
                placeholder="000000"
                maxLength={6}
                pattern="[0-9]{6}"
                className="input mb-2"
              />
              <button
                onClick={handleVerify2FA}
                disabled={loading || totpToken.length !== 6}
                className="btn btn-primary mr-2"
              >
                Подтвердить
              </button>
              <button
                onClick={() => {
                  setShow2FASetup(false);
                  setTotpToken('');
                  setError('');
                }}
                className="btn btn-secondary"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {user.is_2fa_enabled && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">
                ✅ Двухфакторная аутентификация активна и защищает ваш аккаунт
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2">Отключить 2FA</h3>
              <p className="text-sm text-gray-600 mb-2">
                Для отключения введите ваш пароль:
              </p>
              <input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Ваш пароль"
                className="input mb-2"
              />
              <button
                onClick={handleDisable2FA}
                disabled={loading || !disablePassword}
                className="btn btn-danger"
              >
                Отключить 2FA
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

