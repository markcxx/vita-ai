import path from 'node:path';
import { config } from 'dotenv';

/** pnpm and the standalone server run from frontend/. Process variables win. */
export function loadRootEnv(envPath = path.resolve(process.cwd(), '../.env')) {
  const result = config({ path: envPath, override: false, quiet: true });
  if (result.error && (result.error as NodeJS.ErrnoException).code !== 'ENOENT') {
    throw new Error('Unable to load the root .env file');
  }
}
