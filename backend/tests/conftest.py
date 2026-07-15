"""Shared pytest fixtures: an isolated Postgres test database migrated with
the real Alembic revisions (matching the live dev Postgres), a per-test
transactional AsyncSession, an HTTPX client wired to the FastAPI app via ASGI
transport, and an isolated PROJECTS_ROOT per test.
"""

import asyncio
from pathlib import Path

import asyncpg
import pytest
import pytest_asyncio
from alembic import command
from alembic.config import Config
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.core.deps import get_db
from app.main import fastapi_app

TEST_DB_NAME = "anku_test"
BACKEND_ROOT = Path(__file__).resolve().parents[1]


def _swap_database(url: str, db_name: str) -> str:
    base, _, _ = url.rpartition("/")
    return f"{base}/{db_name}"


def _asyncpg_dsn(url: str) -> str:
    return url.replace("postgresql+asyncpg://", "postgresql://", 1)


TEST_DATABASE_URL = _swap_database(settings.DATABASE_URL, TEST_DB_NAME)

test_engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool)


async def _ensure_test_database() -> None:
    admin_dsn = _asyncpg_dsn(_swap_database(settings.DATABASE_URL, "postgres"))
    conn = await asyncpg.connect(admin_dsn)
    try:
        exists = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = $1", TEST_DB_NAME)
        if not exists:
            await conn.execute(f'CREATE DATABASE "{TEST_DB_NAME}"')
    finally:
        await conn.close()


def _run_migrations() -> None:
    cfg = Config(str(BACKEND_ROOT / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", TEST_DATABASE_URL)
    command.upgrade(cfg, "head")


@pytest_asyncio.fixture(scope="session", autouse=True)
async def _prepare_database():
    await _ensure_test_database()
    await asyncio.to_thread(_run_migrations)
    yield
    await test_engine.dispose()


@pytest_asyncio.fixture
async def db_session():
    async with test_engine.connect() as conn:
        trans = await conn.begin()
        session = AsyncSession(
            bind=conn, join_transaction_mode="create_savepoint", expire_on_commit=False
        )
        try:
            yield session
        finally:
            await session.close()
            await trans.rollback()


@pytest.fixture(autouse=True)
def _isolated_projects_root(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "PROJECTS_ROOT", str(tmp_path))


@pytest_asyncio.fixture
async def client(db_session: AsyncSession):
    async def _override_get_db():
        yield db_session

    fastapi_app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    fastapi_app.dependency_overrides.clear()
