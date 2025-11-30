"""
Функции для отправки email (подтверждение регистрации)
"""
import smtplib
import random
import string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from datetime import datetime, timedelta, timezone
import logging

logger = logging.getLogger(__name__)


def generate_verification_code() -> str:
    """Генерация 6-значного кода подтверждения"""
    return ''.join(random.choices(string.digits, k=6))


def get_verification_expiry() -> datetime:
    """Время истечения кода (15 минут)"""
    return datetime.now(timezone.utc) + timedelta(minutes=15)


async def send_verification_email(email: str, code: str, username: str) -> bool:
    """
    Отправка email с кодом подтверждения
    
    ВАЖНО: Для production необходимо настроить SMTP сервер
    В данной реализации используется заглушка для демонстрации
    """
    try:
        smtp_server = "smtp.gmail.com"  # Или другой SMTP сервер
        smtp_port = 587
        smtp_username = "mrx11y@gmail.com"
        smtp_password = "teopeiopoeuhpdgi"  # Gmail App Password
        
        message = MIMEMultipart("alternative")
        message["Subject"] = f"Код подтверждения: {code}"
        message["From"] = smtp_username
        message["To"] = email
        
        text = f"""
        Здравствуйте, {username}!
        
        Ваш код подтверждения: {code}
        
        Код действителен 15 минут.
        
        Если вы не регистрировались на нашем сайте, игнорируйте это письмо.
        """
        
        html = f"""
        <html>
          <body>
            <h2>Подтверждение регистрации</h2>
            <p>Здравствуйте, <strong>{username}</strong>!</p>
            <p>Ваш код подтверждения:</p>
            <h1 style="color: #4F46E5; letter-spacing: 5px;">{code}</h1>
            <p>Код действителен 15 минут.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
              Если вы не регистрировались на нашем сайте, игнорируйте это письмо.
            </p>
          </body>
        </html>
        """
        
        part1 = MIMEText(text, "plain")
        part2 = MIMEText(html, "html")
        message.attach(part1)
        message.attach(part2)
        
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.sendmail(smtp_username, email, message.as_string())
        
        # ЗАГЛУШКА ДЛЯ ДЕМОНСТРАЦИИ (логирование кода в консоль)
        logger.info(f"===== EMAIL VERIFICATION =====")
        logger.info(f"To: {email}")
        logger.info(f"Username: {username}")
        logger.info(f"Verification Code: {code}")
        logger.info(f"==============================")
        
        # В production вернуть True после успешной отправки
        return True
        
    except Exception as e:
        logger.error(f"Error sending verification email: {e}")
        return False

