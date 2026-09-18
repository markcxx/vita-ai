import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { authDb } from './db';
import { sendAuthEmail } from './email';
import { existingAccountEmail, verificationCodeEmail } from './email-templates';

export const emailSchema = z.string().trim().toLowerCase().email().max(320);
export const strongPassword = (value: unknown): value is string => typeof value === 'string' && value.length >= 8 && value.length <= 64 && /[a-zA-Z]/.test(value) && /\d/.test(value);
export function hash(value: string) {
  if (!process.env.AUTH_SECRET) throw new Error('AUTH_SECRET_NOT_CONFIGURED');
  return createHmac('sha256', process.env.AUTH_SECRET).update(value).digest('hex');
}
export class RegistrationError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function assertOrigin(request: Request) {
  if (request.headers.get('origin') !== new URL(process.env.APP_URL || 'http://localhost:3000').origin) {
    throw new RegistrationError('请求来源无效', 403);
  }
}
// Shared, atomic database counters also work across processes/restarts.
export async function rateLimit(key: string, max: number, windowSeconds: number) {
  const now = Date.now();
  const { rows } = await authDb.query(`INSERT INTO auth_delivery_limits(key,count,last_request) VALUES($1,1,$2)
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN auth_delivery_limits.last_request < $3 THEN 1 ELSE auth_delivery_limits.count+1 END,
    last_request=CASE WHEN auth_delivery_limits.last_request < $3 THEN $2 ELSE auth_delivery_limits.last_request END RETURNING count`,
  [key, now, now - windowSeconds * 1000]);
  if (rows[0].count > max) throw new RegistrationError('操作太频繁，请稍后再试', 429);
}
export async function sendCode(email: string) {
  await rateLimit(`send:${hash(email)}`, 5, 600);
  // A global cap bounds abuse without trusting client-supplied forwarding headers.
  await rateLimit('send:global', Number(process.env.AUTH_EMAIL_HOURLY_LIMIT || 100), 3600);
  const code = String(randomInt(100000, 1000000));
  const ttl = Math.min(900, Math.max(60, Number(process.env.EMAIL_VERIFICATION_TTL_SECONDS || 600)));
  const codeHash = hash(`${email}:${code}`);
  const { rowCount } = await authDb.query(`INSERT INTO registration_codes(email,code_hash,expires_at) VALUES($1,$2,now()+$3*interval '1 second')
    ON CONFLICT(email) DO UPDATE SET code_hash=$2,expires_at=now()+$3*interval '1 second',sent_at=now(),attempts=0
    WHERE registration_codes.sent_at < now()-interval '60 seconds' RETURNING email`, [email, codeHash, ttl]);
  if (!rowCount) throw new RegistrationError('请等待 60 秒后重新发送', 429);
  const existing = await authDb.query('SELECT id FROM users WHERE email=$1', [email]);
  // Same response/timing path for registered emails; never disclose the account to callers.
  try {
    const message = existing.rowCount ? existingAccountEmail() : verificationCodeEmail(code, ttl);
    await sendAuthEmail(email, message.subject, message.text, message.html);
  } catch {
    await authDb.query('DELETE FROM registration_codes WHERE email=$1 AND code_hash=$2', [email, codeHash]);
    throw new RegistrationError('验证码发送失败，请稍后重试', 503);
  }
}
export async function verifyCode(email: string, code: string) {
  await rateLimit(`verify:${hash(email)}`, 15, 600);
  const db = await authDb.connect();
  try {
    await db.query('BEGIN');
    const { rows } = await db.query('SELECT * FROM registration_codes WHERE email=$1 FOR UPDATE', [email]);
    const row = rows[0];
    if (!row || row.expires_at <= new Date() || row.attempts >= 5) throw new RegistrationError('验证码已失效，请重新发送');
    if (!timingSafeEqual(Buffer.from(row.code_hash), Buffer.from(hash(`${email}:${code}`)))) {
      await db.query('UPDATE registration_codes SET attempts=attempts+1 WHERE email=$1', [email]);
      await db.query('COMMIT');
      throw new RegistrationError('验证码不正确');
    }
    await db.query('DELETE FROM registration_codes WHERE email=$1', [email]);
    const token = randomBytes(32).toString('hex');
    await db.query(`INSERT INTO registration_tickets(token_hash,email,expires_at) VALUES($1,$2,now()+interval '10 minutes')`, [hash(token), email]);
    await db.query('COMMIT');
    return token;
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
}
export async function registrationRoute(request: Request, operation: 'send' | 'verify') {
  try {
    assertOrigin(request);
    const body = await request.json();
    const parsed = emailSchema.safeParse(body.email);
    if (!parsed.success) throw new RegistrationError('请输入有效的邮箱地址');
    if (operation === 'send') { await sendCode(parsed.data); return Response.json({ success: true }); }
    if (!/^\d{6}$/.test(body.code || '')) throw new RegistrationError('请输入 6 位验证码');
    return Response.json({ registrationToken: await verifyCode(parsed.data, body.code) });
  } catch (error) {
    return Response.json({ error: error instanceof RegistrationError ? error.message : '暂时无法处理请求，请稍后重试' },
      { status: error instanceof RegistrationError ? error.status : 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
