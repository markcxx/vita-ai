import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn(), connect: vi.fn(), mail: vi.fn() }));
vi.mock('./db', () => ({ authDb: { query: mocks.query, connect: mocks.connect } }));
vi.mock('./email', () => ({ sendAuthEmail: mocks.mail }));
import { registrationRoute, strongPassword, verifyCode, hash } from './registration';
beforeEach(() => { vi.resetAllMocks(); process.env.AUTH_SECRET = 'test-secret-only'; process.env.APP_URL = 'http://localhost:3000'; });
it('does not report successful delivery when SMTP fails', async () => {
  mocks.query.mockResolvedValue({ rows: [{ count: 1 }], rowCount: 1 });
  mocks.mail.mockRejectedValue(new Error('SMTP failed with private detail'));
  const result = await registrationRoute(new Request('http://localhost:3000/api/auth/send-code', { method: 'POST', headers: { origin: 'http://localhost:3000', 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'test@example.com' }) }), 'send');
  expect(result.status).toBe(503);
  expect(JSON.stringify(await result.json())).not.toContain('private');
  expect(mocks.query.mock.calls.some(([sql]) => sql.startsWith('DELETE FROM registration_codes'))).toBe(true);
});
it('rejects unexpected origins before accessing SMTP or database', async () => {
  const response = await registrationRoute(new Request('http://localhost:3000/api/auth/send-code', { method: 'POST', headers: { origin: 'https://evil.example' }, body: '{}' }), 'send');
  expect(response.status).toBe(403); expect(mocks.query).not.toHaveBeenCalled();
});
it('commits the failed attempt counter and never issues a registration ticket', async () => {
  mocks.query.mockResolvedValue({ rows: [{ count: 1 }] });
  const query = vi.fn().mockImplementation(async (sql: string) => sql.startsWith('SELECT') ? { rows: [{ code_hash: hash('test@example.com:123456'), expires_at: new Date(Date.now() + 60000), attempts: 0 }] } : { rows: [] });
  mocks.connect.mockResolvedValue({ query, release: vi.fn() });
  await expect(verifyCode('test@example.com', '000000')).rejects.toThrow('验证码不正确');
  expect(query.mock.calls.some(([sql]) => sql.includes('attempts=attempts+1'))).toBe(true);
  expect(query.mock.calls.some(([sql]) => sql === 'COMMIT')).toBe(true);
  expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO registration_tickets'))).toBe(false);
});
it('enforces password rules on the server', () => {
  expect(strongPassword('password')).toBe(false); expect(strongPassword('12345678')).toBe(false);
  expect(strongPassword('Password123')).toBe(true);
});
