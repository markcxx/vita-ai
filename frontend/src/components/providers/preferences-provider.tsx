"use client";

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { hydratePreferences } from '@/lib/user-preferences';

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const { setTheme } = useTheme();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setFailed(false);
    fetch('/api/user/settings', { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Unable to load user preferences');
        return response.json();
      })
      .then(settings => {
        if (controller.signal.aborted) return;
        hydratePreferences(settings.uiPreferences);
        if (settings.uiPreferences?.theme) setTheme(settings.uiPreferences.theme);
        setLoaded(true);
      })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [setTheme, attempt]);
  if (!loaded) return <div className="p-8 text-sm text-zinc-500">{failed ? <><p>用户设置加载失败。</p><button className="mt-2 underline" onClick={() => setAttempt(value => value + 1)}>重新加载</button></> : '正在加载用户设置…'}</div>;
  return children;
}
