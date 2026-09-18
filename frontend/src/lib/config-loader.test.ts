import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadRootEnv } from '../../env-loader';
import { getBooleanConfig, getConfigValue } from './config';

const temporary: string[] = [];
afterEach(() => {
  vi.unstubAllEnvs();
  for (const directory of temporary.splice(0)) fs.rmSync(directory, { recursive: true });
  delete process.env.VITA_TEST_FILE_VALUE;
});

describe('environment configuration', () => {
  it('loads root dotenv values literally and preserves process overrides', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vita-env-'));
    temporary.push(directory);
    const file = path.join(directory, '.env');
    fs.writeFileSync(file, "VITA_TEST_FILE_VALUE='中文 # $literal'\nVITA_TEST_OVERRIDE=file\n");
    vi.stubEnv('VITA_TEST_OVERRIDE', 'process');
    loadRootEnv(file);
    expect(getConfigValue('VITA_TEST_FILE_VALUE')).toBe('中文 # $literal');
    expect(getConfigValue('VITA_TEST_OVERRIDE')).toBe('process');
  });
  it('supports optional files and default values', () => {
    loadRootEnv('/nonexistent/vita/.env');
    expect(getConfigValue('VITA_TEST_MISSING', 'fallback')).toBe('fallback');
  });
  it('reads booleans from the environment', () => {
    vi.stubEnv('VITA_TEST_BOOLEAN', 'false');
    expect(getBooleanConfig('VITA_TEST_BOOLEAN', true)).toBe(false);
    vi.stubEnv('VITA_TEST_BOOLEAN', 'true');
    expect(getBooleanConfig('VITA_TEST_BOOLEAN')).toBe(true);
  });
});
