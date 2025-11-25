"""
TOTP (Time-based One-Time Password) для 2FA
"""
import pyotp
import qrcode
from io import BytesIO
import base64


def generate_totp_secret() -> str:
    """Генерация секретного ключа для TOTP"""
    return pyotp.random_base32()


def get_totp_uri(username: str, secret: str, issuer: str = "OpticsShop") -> str:
    """
    Получение URI для QR кода
    """
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=username, issuer_name=issuer)


def generate_qr_code(uri: str) -> str:
    """
    Генерация QR кода в base64
    """
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Конвертация в base64
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    
    return f"data:image/png;base64,{img_str}"


def verify_totp(secret: str, token: str) -> bool:
    """
    Проверка TOTP токена
    """
    try:
        totp = pyotp.TOTP(secret)
        return totp.verify(token, valid_window=1)  # Разрешаем 1 окно (30 сек до/после)
    except Exception:
        return False


def get_current_totp(secret: str) -> str:
    """
    Получение текущего TOTP кода (для тестирования)
    """
    totp = pyotp.TOTP(secret)
    return totp.now()

