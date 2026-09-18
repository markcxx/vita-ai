import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('@/stores/settings-store', () => ({ useSettingsStore: { getState: () => ({ autoSave: false, _hydrated: true, autoSaveInterval: 500 }) } }));
import { useResumeStore } from './resume-store';
import type { Resume } from '@/types/resume';
const resume = { id: 'test-resume', title: 'Before', sections: [], version: 1 } as unknown as Resume;
beforeEach(() => { useResumeStore.getState().reset(); useResumeStore.getState().setResume(resume); });
afterEach(() => { useResumeStore.getState().reset(); vi.unstubAllGlobals(); });
it('keeps unsaved state when the server rejects the write', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 500 })));
  useResumeStore.getState().setTitle('Unsaved');
  await useResumeStore.getState().save();
  expect(useResumeStore.getState().isDirty).toBe(true);
  expect(useResumeStore.getState().isSaving).toBe(false);
});
it('does not mark newer edits saved when an older request completes', async () => {
  let complete!: (response: Response) => void;
  const fetch = vi.fn().mockImplementation(() => new Promise<Response>(resolve => { complete = resolve; }));
  vi.stubGlobal('fetch', fetch);
  useResumeStore.getState().setTitle('First edit');
  const pending = useResumeStore.getState().save();
  useResumeStore.getState().setTitle('Newer edit');
  await useResumeStore.getState().save();
  expect(fetch).toHaveBeenCalledTimes(1);
  complete(Response.json({ version: 2 }));
  await pending;
  expect(useResumeStore.getState().isDirty).toBe(true);
  expect(useResumeStore.getState().currentResume?.title).toBe('Newer edit');
  expect(useResumeStore.getState().currentResume?.version).toBe(2);
});
it('records successful saves and submits the last known server version', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ version: 2 }));
  vi.stubGlobal('fetch', fetch);
  useResumeStore.getState().setTitle('Saved');
  await useResumeStore.getState().save();
  expect(JSON.parse(fetch.mock.calls[0][1].body).expectedVersion).toBe(1);
  expect(useResumeStore.getState().isDirty).toBe(false);
  expect(useResumeStore.getState().currentResume?.version).toBe(2);
});
