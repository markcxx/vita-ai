from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert

from app.db.models import SchemaVersion
from app.db.session import Base
from app.db.auth_schema import upgrade_auth_schema


async def create_schema(engine):
    """Initialize an empty PostgreSQL database without replacing existing data."""
    async with engine.begin() as connection:
        # Serialize first-start DDL across workers. Released on commit/rollback.
        await connection.execute(text("SELECT pg_advisory_xact_lock(8848136)"))
        await connection.run_sync(Base.metadata.create_all)
        await connection.execute(
            insert(SchemaVersion).values(version=1).on_conflict_do_nothing()
        )
        await upgrade_auth_schema(connection)
