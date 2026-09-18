"""Run integration tests in a disposable PostgreSQL schema, never business tables."""
import asyncio
import os
from uuid import uuid4

import pytest
import sqlalchemy.ext.asyncio as asyncio_sqlalchemy
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine

_test_url = os.environ.get("TEST_DATABASE_URL")
_test_schema = "vita_test_" + uuid4().hex


def _postgres_url(value):
    return make_url(value).set(drivername="postgresql+psycopg")


async def _schema_action(create):
    engine = create_async_engine(_postgres_url(_test_url), hide_parameters=True)
    try:
        async with engine.begin() as connection:
            statement = f'CREATE SCHEMA "{_test_schema}"' if create else f'DROP SCHEMA "{_test_schema}" CASCADE'
            await connection.execute(text(statement))
    finally:
        await engine.dispose()


if _test_url:
    asyncio.run(_schema_action(True))
    url = _postgres_url(_test_url)
    os.environ["APP_DATABASE_URL"] = url.render_as_string(hide_password=False)
else:
    os.environ["APP_DATABASE_URL"] = "postgresql+psycopg://test@127.0.0.1:1/unavailable_test_database"

# Explicit schema qualification also works with transaction-mode connection pools,
# which may reject or reset connection-level search_path parameters.
if _test_url:
    def isolated_engine(*args, **kwargs):
        options = {**kwargs.pop("execution_options", {}), "schema_translate_map": {None: _test_schema}}
        return create_async_engine(*args, execution_options=options, **kwargs)

    asyncio_sqlalchemy.create_async_engine = isolated_engine


# Test model calls are mocked; do not use local production credentials.
os.environ["APP_AI_API_KEY"] = "test"
os.environ["APP_AI_BASE_URL"] = "https://example.test/v1"
os.environ["APP_AI_MODEL"] = "test"
os.environ["APP_AI_PROVIDER"] = "openai"


async def _initialize():
    from app.db.schema import create_schema
    from app.db.session import engine
    try:
        await create_schema(engine)
    finally:
        await engine.dispose()


if _test_url:
    try:
        asyncio.run(_initialize())
    except BaseException:
        asyncio.run(_schema_action(False))
        raise


@pytest.hookimpl(trylast=True)
def pytest_unconfigure(config):
    if _test_url:
        asyncio.run(_schema_action(False))


def pytest_collection_modifyitems(items):
    if not _test_url:
        marker = pytest.mark.skip(reason="Set TEST_DATABASE_URL to run isolated PostgreSQL integration tests")
        for item in items:
            if item.path.name in {"test_api.py", "test_postgres.py"}:
                item.add_marker(marker)
