'use client';
import { createAuthClient } from 'better-auth/react';
export const authClient = createAuthClient();
export function safeCallback(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/dashboard';
  return value;
}
