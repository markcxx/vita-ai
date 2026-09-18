'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { setCredentialOwner, credentialHeaders, hasModelCredentials, requiresModelCredentials } from '@/lib/local-credentials';
import { useUIStore } from '@/stores/ui-store';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
const AccountContext = createContext({ email: '' });
export function AccountProvider({ children, userId, email }: { children: React.ReactNode; userId: string; email: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setCredentialOwner(userId);
    const showCredentials = () => { useUIStore.getState().setSettingsTab('credentials'); useUIStore.getState().openModal('settings'); };
    if (!hasModelCredentials()) showCredentials();
    const original = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
      if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/') || url.pathname.startsWith('/api/auth/')) return original(input, init);
      const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
      if (requiresModelCredentials(url.pathname, method) && !hasModelCredentials()) {
        showCredentials();
        const message = '请先在设置中填写自己的 API Key、Base URL 和模型名称';
        toast.error(message);
        return Response.json({ detail: message, error: message }, { status: 428 });
      }
      const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
      if (/^\/api\/(ai|interview|files|resume-analysis|student-strengths)(\/|$)/.test(url.pathname) || url.pathname === '/api/resume/parse') {
        for (const [key, value] of Object.entries(credentialHeaders())) headers.set(key, value);
      }
      const response = await original(input, { ...init, headers });
      if (response.status === 401) window.location.replace(`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return response;
    };
    setReady(true);
    return () => { window.fetch = original; setCredentialOwner(null); };
  }, [userId]);
  return <AccountContext.Provider value={{ email }}>{ready ? children : <div className="p-8 text-sm text-gray-500">正在加载工作台…</div>}</AccountContext.Provider>;
}
export function AccountMenu() {
  const { email } = useContext(AccountContext);
  const [busy, setBusy] = useState(false);
  return <div className="mt-2 border-t border-zinc-200 pt-3 dark:border-zinc-800"><p className="truncate px-2 text-xs text-zinc-500" title={email}>{email}</p><button type="button" disabled={busy} className="mt-1 w-full rounded-lg px-2 py-2 text-left text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800" onClick={async () => { setBusy(true); const result = await authClient.signOut(); if (!result.error) { setCredentialOwner(null); window.location.replace('/login'); } else setBusy(false); }}>{busy ? '正在退出…' : '退出登录'}</button></div>;
}
