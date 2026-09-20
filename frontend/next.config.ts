import type { NextConfig } from 'next';
import path from 'node:path';
import { loadRootEnv } from './env-loader';

loadRootEnv();


const nextConfig: NextConfig = {
  output: 'standalone',
  // Allow six profile attachments (25 MB total) plus multipart headers.
  experimental: { proxyClientMaxBodySize: '30mb' },
  logging: { incomingRequests: { ignore: [/\/api\/auth\/callback\//, /\/reset-password\?/] } },
  outputFileTracingRoot: path.resolve(process.cwd(), '..'),
};

export default nextConfig;
