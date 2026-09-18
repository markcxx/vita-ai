from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()
if not settings.database_url.startswith("postgresql+psycopg://"):
    raise RuntimeError("Configure DATABASE_URL with PostgreSQL")

engine = create_async_engine(
    settings.database_url, pool_pre_ping=True, pool_recycle=1800,
    hide_parameters=True,
)
SessionFactory = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionFactory() as session:
        yield session


async def init_database() -> None:
    from app.db.schema import create_schema

    await create_schema(engine)
