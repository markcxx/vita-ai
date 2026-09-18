"""Better Auth tables are migrated by the Python backend, alongside business tables."""
from sqlalchemy import text

STATEMENTS = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false",
    "ALTER TABLE users ALTER COLUMN is_active SET DEFAULT true",
    "ALTER TABLE users ALTER COLUMN settings SET DEFAULT '{}'::json",
    """CREATE TABLE IF NOT EXISTS auth_sessions (
        id TEXT PRIMARY KEY, token TEXT UNIQUE NOT NULL,
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL, ip_address TEXT, user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL)""",
    "CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id)",
    """CREATE TABLE IF NOT EXISTS auth_accounts (
        id TEXT PRIMARY KEY, account_id TEXT NOT NULL, provider_id TEXT NOT NULL,
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        access_token TEXT, refresh_token TEXT, id_token TEXT,
        access_token_expires_at TIMESTAMPTZ, refresh_token_expires_at TIMESTAMPTZ,
        scope TEXT, password TEXT, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL,
        UNIQUE(provider_id, account_id))""",
    "CREATE INDEX IF NOT EXISTS auth_accounts_user_idx ON auth_accounts(user_id)",
    """CREATE TABLE IF NOT EXISTS auth_verifications (
        id TEXT PRIMARY KEY, identifier TEXT NOT NULL, value TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL)""",
    "CREATE INDEX IF NOT EXISTS auth_verifications_identifier_idx ON auth_verifications(identifier)",
    """CREATE TABLE IF NOT EXISTS registration_codes (
        email TEXT PRIMARY KEY, code_hash TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT now(), attempts INTEGER NOT NULL DEFAULT 0)""",
    """CREATE TABLE IF NOT EXISTS registration_tickets (
        token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL)""",
    """CREATE TABLE IF NOT EXISTS auth_rate_limits (
        id TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text, key TEXT PRIMARY KEY, count INTEGER NOT NULL, last_request BIGINT NOT NULL)""",
    "CREATE TABLE IF NOT EXISTS auth_delivery_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, last_request BIGINT NOT NULL)",
    "ALTER TABLE auth_rate_limits ADD COLUMN IF NOT EXISTS id TEXT NOT NULL DEFAULT gen_random_uuid()::text",
    "INSERT INTO schema_versions(version, applied_at) VALUES (2, now()) ON CONFLICT DO NOTHING",
]

async def upgrade_auth_schema(connection):
    # Raw DDL must respect the disposable integration-test schema too.
    schema = connection.sync_connection.get_execution_options().get("schema_translate_map", {}).get(None)
    if schema:
        quoted = connection.dialect.identifier_preparer.quote_identifier(schema)
        await connection.execute(text(f'SET LOCAL search_path TO {quoted}'))
    for statement in STATEMENTS:
        await connection.execute(text(statement))
