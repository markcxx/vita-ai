import { randomUUID } from 'node:crypto';
import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { authDb } from './auth/db';
import { sendAuthEmail } from './auth/email';
import { resetPasswordEmail } from './auth/email-templates';
import { hash, strongPassword } from './auth/registration';

export const auth = betterAuth({
  appName: process.env.APP_NAME || 'VitaAI',
  baseURL: process.env.APP_URL || 'http://localhost:3000',
  secret: process.env.AUTH_SECRET,
  trustedOrigins: [process.env.APP_URL || 'http://localhost:3000'],
  database: authDb,
  advanced: { database: { generateId: () => randomUUID() }, cookiePrefix: 'vitaai' },
  logger: { level: 'error', log: (_level, _message, ...args) => { console.error('Auth operation failed', args.map(value => { const error = value as { code?: string; column?: string; table?: string }; return { code: error?.code, column: error?.column, table: error?.table }; })); } },
  user: { modelName: 'users', fields: { image: 'avatar_url', emailVerified: 'email_verified', createdAt: 'created_at', updatedAt: 'updated_at' } },
  session: {
    modelName: 'auth_sessions', fields: { userId: 'user_id', expiresAt: 'expires_at', ipAddress: 'ip_address', userAgent: 'user_agent', createdAt: 'created_at', updatedAt: 'updated_at' },
    expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 12, cookieCache: { enabled: false },
  },
  account: {
    modelName: 'auth_accounts',
    fields: { accountId: 'account_id', providerId: 'provider_id', userId: 'user_id', accessToken: 'access_token', refreshToken: 'refresh_token', idToken: 'id_token', accessTokenExpiresAt: 'access_token_expires_at', refreshTokenExpiresAt: 'refresh_token_expires_at', createdAt: 'created_at', updatedAt: 'updated_at' },
    accountLinking: { enabled: true, trustedProviders: [] },
    encryptOAuthTokens: true,
  },
  verification: { modelName: 'auth_verifications', fields: { expiresAt: 'expires_at', createdAt: 'created_at', updatedAt: 'updated_at' } },
  rateLimit: { enabled: true, storage: 'database', modelName: 'auth_rate_limits', fields: { lastRequest: 'last_request' }, window: 60, max: 60, customRules: { '/sign-in/email': { window: 60, max: 8 }, '/request-password-reset': { window: 60, max: 3 } } },
  emailAndPassword: {
    enabled: true, minPasswordLength: 8, maxPasswordLength: 64,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const message = resetPasswordEmail(url);
      await sendAuthEmail(user.email, message.subject, message.text, message.html);
    },
  },
  socialProviders: process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET ? {
    github: { clientId: process.env.AUTH_GITHUB_ID, clientSecret: process.env.AUTH_GITHUB_SECRET },
  } : {},
  hooks: { before: createAuthMiddleware(async (ctx) => {
    if (['/sign-up/email', '/reset-password', '/change-password', '/set-password'].includes(ctx.path)) {
      if (!strongPassword(ctx.body?.password ?? ctx.body?.newPassword)) throw new APIError('BAD_REQUEST', { message: '密码需为 8–64 位，且包含字母和数字' });
    }
    if (ctx.path === '/sign-up/email') {
      const email = String(ctx.body?.email || '').trim().toLowerCase();
      const token = ctx.headers?.get('x-vita-email-verification') || '';
      const { rowCount } = await authDb.query(`DELETE FROM registration_tickets WHERE token_hash=$1 AND email=$2 AND expires_at>now() RETURNING email`, [hash(token), email]);
      if (!rowCount) throw new APIError('BAD_REQUEST', { message: '请先完成邮箱验证码验证' });
      return { context: { ...ctx, body: { ...ctx.body, email } } };
    }
  }) },
  databaseHooks: { user: { create: { before: async (user, ctx) => {
    if (ctx?.path === '/sign-up/email') return { data: { ...user, emailVerified: true } };
    return { data: user };
  } } } },
});
