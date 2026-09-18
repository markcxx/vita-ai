import { toast } from 'sonner';

// Memory caches the local workspace preferences stored by the backend.
let values: Record<string, string> = {};
let pending: Promise<void> = Promise.resolve();

export function hydratePreferences(preferences: Record<string, string> = {}) {
  values = { ...preferences };
  window.dispatchEvent(new Event('user-preferences-loaded'));
}

export function getPreference(key: string): string | null {
  return values[key] ?? null;
}

export function setPreference(key: string, value: string) {
  values[key] = value;
  pending = pending.then(async () => {
    const response = await fetch('/api/user/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uiPreferences: { [key]: value } }),
    });
    if (!response.ok) throw new Error('偏好设置保存失败');
  }).catch(() => { toast.error('偏好设置未保存，请检查网络后重试'); });
}
