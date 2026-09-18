import os
from datetime import UTC, datetime

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.models import User
from app.db.schema import create_schema


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_postgres_unicode_and_utc():
    engine = create_async_engine(os.environ["APP_DATABASE_URL"], hide_parameters=True)
    await create_schema(engine)
    await create_schema(engine)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    instant = datetime(2026, 9, 8, 2, 3, 4, 123456, tzinfo=UTC)
    async with factory() as session:
        user = User(name="中文用户🧑‍💻", created_at=instant)
        session.add(user)
        await session.commit()
        await session.refresh(user)
        assert user.created_at == instant
        assert user.name == "中文用户🧑‍💻"
        await session.delete(user)
        await session.commit()
    await engine.dispose()
