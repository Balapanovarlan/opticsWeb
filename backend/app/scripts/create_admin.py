"""
Скрипт для создания первого администратора
"""
import asyncio
import sys
from pathlib import Path

# Добавляем путь к корню проекта
sys.path.append(str(Path(__file__).parent.parent.parent))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import AsyncSessionLocal
from app.db.models.user import User, UserRole
from app.core.security import hash_password


async def create_admin():
    """Создание администратора"""
    async with AsyncSessionLocal() as db:
        try:
            # Проверка существования админа
            result = await db.execute(select(User).where(User.username == "admin"))
            existing_admin = result.scalar_one_or_none()
            
            if existing_admin:
                print("⚠️  Администратор 'admin' уже существует!")
                print(f"   Email: {existing_admin.email}")
                print(f"   Роль: {existing_admin.role.value}")
                return
            
            # Создание нового администратора
            admin = User(
                username="admin",
                email="admin@optics.localhost",
                password_hash=hash_password("Admin123!"),  # Надежный пароль по умолчанию
                role=UserRole.ADMIN,
                is_active=True,
                is_2fa_enabled=False
            )
            
            db.add(admin)
            await db.commit()
            await db.refresh(admin)
            
            print("✅ Администратор успешно создан!")
            print(f"   Username: admin")
            print(f"   Email: admin@optics.localhost")
            print(f"   Password: Admin123!")
            print(f"   Роль: {admin.role.value}")
            print("\n⚠️  ВАЖНО: Смените пароль после первого входа!")
            
        except Exception as e:
            print(f"❌ Ошибка при создании администратора: {e}")
            await db.rollback()


async def create_test_users():
    """Создание тестовых пользователей"""
    async with AsyncSessionLocal() as db:
        try:
            test_users = [
                {
                    "username": "staff_user",
                    "email": "staff@optics.localhost",
                    "password": "Staff123!",
                    "role": UserRole.STAFF
                },
                {
                    "username": "regular_user",
                    "email": "user@optics.localhost",
                    "password": "User123!",
                    "role": UserRole.USER
                }
            ]
            
            created = []
            
            for user_data in test_users:
                # Проверка существования
                result = await db.execute(
                    select(User).where(User.username == user_data["username"])
                )
                if result.scalar_one_or_none():
                    print(f"⚠️  Пользователь '{user_data['username']}' уже существует")
                    continue
                
                # Создание
                user = User(
                    username=user_data["username"],
                    email=user_data["email"],
                    password_hash=hash_password(user_data["password"]),
                    role=user_data["role"],
                    is_active=True
                )
                
                db.add(user)
                created.append(user_data)
            
            await db.commit()
            
            if created:
                print("\n✅ Тестовые пользователи созданы:")
                for user_data in created:
                    print(f"   - {user_data['username']} ({user_data['role'].value})")
                    print(f"     Email: {user_data['email']}, Password: {user_data['password']}")
            
        except Exception as e:
            print(f"❌ Ошибка при создании тестовых пользователей: {e}")
            await db.rollback()


async def main():
    """Главная функция"""
    print("=" * 60)
    print("Создание администратора системы Optics")
    print("=" * 60)
    
    await create_admin()
    
    # Спросить о создании тестовых пользователей
    print("\n" + "=" * 60)
    create_test = input("Создать тестовых пользователей? (y/n): ").lower()
    if create_test == 'y':
        await create_test_users()
    
    print("\n" + "=" * 60)
    print("Готово!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())

