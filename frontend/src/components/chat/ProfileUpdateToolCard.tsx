'use client';

import { useState } from 'react';
import { AppDialog } from '@/components/ui/AppDialog';
import { Button } from '@/components/ui/button';
import { ProfileEditor } from '@/components/profile/profile-editor';
import { candidateProfileSchema } from '@/lib/profile/profile-schema';
import { combineProfile, type ImportMode } from '@/lib/profile/profile-import';
import { getAIHeaders } from '@/stores/settings-store';
import type { CandidateProfileData } from '@/types/candidate-profile';

const tabs = [['basic', '基本资料'], ['experience', '工作实习'], ['education', '教育背景'], ['projects', '项目经历'], ['skills', '技能意向'], ['certificates', '证书语言']] as const;

export function ProfileUpdateToolCard({ candidateInfo, onSaved }: { candidateInfo: string; onSaved?: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<CandidateProfileData | null>(null);
  const [current, setCurrent] = useState<CandidateProfileData | null>(null);
  const [version, setVersion] = useState(0);
  const [mode, setMode] = useState<ImportMode>('append');
  const [tab, setTab] = useState('basic');

  async function prepare() {
    if (busy) return;
    setOpen(true); setBusy(true); setError(''); setDraft(null);
    try {
      const [profileResponse, draftResponse] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/ai/profile/draft', { method: 'POST', headers: { ...getAIHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ candidateInfo }) }),
      ]);
      const existing = await profileResponse.json();
      const extracted = await draftResponse.json();
      if (!profileResponse.ok || !draftResponse.ok) throw new Error(extracted.detail || existing.detail || '整理失败，请重试');
      setCurrent(candidateProfileSchema.parse(existing.data));
      setVersion(existing.version);
      setDraft(candidateProfileSchema.parse(extracted.profile));
    } catch (e) { setError(e instanceof Error ? e.message : '整理失败，请重试'); }
    finally { setBusy(false); }
  }

  async function save() {
    if (!draft || !current || saving) return;
    setSaving(true); setError('');
    try {
      const data = combineProfile(current, draft, mode);
      const response = await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, expectedVersion: version }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || '保存失败，请重试');
      setSaved(true); setOpen(false); onSaved?.();
    } catch (e) { setError(e instanceof Error ? e.message : '保存失败，请重试'); }
    finally { setSaving(false); }
  }

  function editor(section: string, id?: string) {
    if (!draft) return null;
    return <ProfileEditor section={section} focusId={id} profile={draft} setProfile={value => setDraft(previous => previous ? typeof value === 'function' ? value(previous) : value : previous)}/>;
  }
  function entries() {
    if (!draft) return [];
    if (tab === 'experience') return draft.experiences.map(e => ({ id: e.id, label: e.company || '工作经历' }));
    if (tab === 'education') return draft.education.map(e => ({ id: e.id, label: e.institution || '教育经历' }));
    if (tab === 'projects') return draft.projects.map(e => ({ id: e.id, label: e.name || '项目经历' }));
    if (tab === 'skills') return [...draft.skills.map(e => ({ id: e.id, label: e.name || '技能' })), { id: 'preferences', label: '求职意向' }];
    return [...draft.certifications.map(e => ({ id: e.id, label: e.name || '证书' })), ...draft.languages.map(e => ({ id: e.id, label: e.language || '语言' }))];
  }

  return <section className="my-3 rounded-lg border p-4 text-sm">
    <p className="mb-3">{saved ? '个人资料库已更新' : '把对话中的资料整理到个人资料库，核对后保存。'}</p>
    <Button size="sm" disabled={busy || saved} onClick={() => void prepare()}>{saved ? '已保存' : '整理并核对资料'}</Button>
    <AppDialog open={open} onClose={() => setOpen(false)} closeDisabled={busy || saving} title="核对个人资料" width={768} bodyClassName="p-4">
      {busy ? <p role="status" className="py-8 text-center">正在整理对话资料…</p> : <div className="space-y-4">
        {error && <p role="alert" className="text-red-600">{error}</p>}
        {draft && <>
          <div className="flex flex-wrap gap-4">
            <label><input type="radio" name="profile-import-mode" checked={mode === 'append'} onChange={() => setMode('append')}/> 追加补充</label>
            <label><input type="radio" name="profile-import-mode" checked={mode === 'replace'} onChange={() => setMode('replace')}/> 覆盖资料库</label>
          </div>
          <p className="text-xs text-muted-foreground">{mode === 'append' ? '保留已有信息，补充空字段和新经历；已有非空字段不会被替换。' : '将用下方全部内容替换资料库，未包含的原有内容也会被移除。'}</p>
          <div className="flex flex-wrap gap-2">{tabs.map(([key, name]) => <Button key={key} size="sm" variant={tab === key ? 'default' : 'outline'} onClick={() => setTab(key)}>{name}</Button>)}</div>
          <div className="max-h-[48vh] space-y-5 overflow-y-auto p-1">
            {tab === 'basic' ? <>{editor('basic')}{editor('basic', 'contact')}{editor('basic', 'links')}{editor('basic', 'summary')}</>
              : entries().length ? entries().map(entry => <details key={entry.id} open className="rounded border p-3"><summary className="mb-3 cursor-pointer font-medium">{entry.label}</summary>{editor(tab, entry.id)}</details>) : <p className="text-muted-foreground">本次没有提取到相关内容。</p>}
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" disabled={saving} onClick={() => setOpen(false)}>取消</Button><Button disabled={saving} onClick={() => void save()}>{saving ? '保存中…' : mode === 'append' ? '确认追加' : '确认覆盖'}</Button></div>
        </>}
        {!draft && error && <Button onClick={() => void prepare()}>重试</Button>}
      </div>}
    </AppDialog>
  </section>;
}
