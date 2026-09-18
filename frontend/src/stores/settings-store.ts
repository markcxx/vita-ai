import { credentialHeaders } from '@/lib/local-credentials';
import { create } from 'zustand';

interface SettingsStore {
  // Editor settings
  autoSave: boolean;
  autoSaveInterval: number; // in milliseconds

  // Hydration state
  _hydrated: boolean;
  _syncing: boolean;

  // Actions
  setAutoSave: (enabled: boolean) => void;
  setAutoSaveInterval: (interval: number) => void;
  hydrate: () => void;
}

function getHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',

  };
}

// Sync settings to server (debounced)
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

function syncToServer(state: SettingsStore) {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    try {
      await fetch('/api/user/settings', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          autoSave: state.autoSave,
          autoSaveInterval: state.autoSaveInterval,
        }),
      });
    } catch {
      // silently fail, local state is still correct
    }
  }, 500);
}

export function getAIHeaders(): Record<string, string> {
  return credentialHeaders();
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  autoSave: true,
  autoSaveInterval: 500,
  _hydrated: false,
  _syncing: false,

  setAutoSave: (enabled) => {
    set({ autoSave: enabled });
    syncToServer(get());
  },

  setAutoSaveInterval: (interval) => {
    set({ autoSaveInterval: interval });
    syncToServer(get());
  },

  hydrate: async () => {
    if (get()._hydrated) return;

    try {
      localStorage.removeItem('jade_api_key');
      localStorage.removeItem('jade_provider_configs');
    } catch { /* ignore */ }

    // Load other settings from server
    try {
      const res = await fetch('/api/user/settings', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        set({
          ...(typeof data.autoSave === 'boolean' && { autoSave: data.autoSave }),
          ...(typeof data.autoSaveInterval === 'number' && { autoSaveInterval: data.autoSaveInterval }),
          _hydrated: true,
        });
        return;
      }
    } catch { /* fall through */ }

    set({ _hydrated: true });
  },
}));

// Auto-hydrate on client side so settings are ready before any component uses them
if (typeof window !== 'undefined') {
  useSettingsStore.getState().hydrate();
}
