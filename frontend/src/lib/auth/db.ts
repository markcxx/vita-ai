import { Pool } from 'pg';

const globalAuth = globalThis as unknown as { authPool?: Pool };
export const authDb = globalAuth.authPool ?? new Pool({
  connectionString: process.env.DATABASE_URL?.replace('postgresql+psycopg://', 'postgresql://'),
  max: 5,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
});
if (process.env.NODE_ENV !== 'production') globalAuth.authPool = authDb;
