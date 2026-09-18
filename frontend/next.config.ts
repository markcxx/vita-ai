import type { NextConfig } from 'next';
import path from 'node:path';
import { loadRootEnv } from './env-loader';

loadRootEnv();


const nextConfig: NextConfig = {
  output: 'standalone',
  logging: { incomingRequests: { ignore: [/\/api\/auth\/callback\//, /\/reset-password\?/] } },
  outputFileTracingRoot: path.resolve(process.cwd(), '..'),
};

export default nextConfig;
