'use client';

import { useCallback, useEffect, useState } from 'react';
import { LoaderCircle, Sparkles, Upload } from 'lucide-react';
import Image from 'next/image';
import { ProfileImportDialog } from '@/components/profile/profile-import-dialog';
import { ProfileNavigation } from '@/components/profile/profile-navigation';
import { ProfileEditor, profileEditorTitle } from '@/components/profile/profile-editor';
import { ProfileOverview, PROFILE_TABS, type ProfileAddKind } from '@/components/profile/profile-overview';
import styles from '@/components/profile/profile.module.css';
import templateStyles from '../templates/templates.module.css';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AppDialog } from '@/components/ui/AppDialog';
import { getAIHeaders } from '@/stores/settings-store';
import { candidateProfileSchema, EMPTY_CANDIDATE_PROFILE, SAMPLE_CANDIDATE_PROFILES } from '@/lib/profile/profile-schema';
import type { CandidateProfileData, CandidateProfileRecord } from '@/types/candidate-profile';
import type { ProfileOptimizationChange } from '@/lib/profile/profile-optimization';

function requestHeaders(includeAI = false) {

  return {
    'Content-Type': 'application/json',

    ...(includeAI ? getAIHeaders() : {}),
  };
}

function readProfile(data: unknown): CandidateProfileData {
  const result = candidateProfileSchema.safeParse(data);
  if (!result.success) throw new Error('个人资料格式不完整，请重试或联系管理员');
  return result.data;
}

type OptimizationProposal = {
  title: string;
  reason: string;
  optimizedProfile: CandidateProfileData;
  changes: ProfileOptimizationChange[];
};

export default function CandidateProfilePage() {
  const [importOpen, setImportOpen] = useState(false);
  const [record, setRecord] = useState<CandidateProfileRecord | null>(null);
  const [profile, setProfile] = useState<CandidateProfileData>(structuredClone(EMPTY_CANDIDATE_PROFILE));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [proposal, setProposal] = useState<OptimizationProposal | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [editingTitle, setEditingTitle] = useState('个人资料');
  const [editingId, setEditingId] = useState<string | undefined>();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<CandidateProfileData>(structuredClone(EMPTY_CANDIDATE_PROFILE));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/profile', { headers: requestHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '加载失败');
      const nextProfile = readProfile(data.data);
      setRecord(data);
      setProfile(nextProfile);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '个人资料加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = useCallback(async (nextProfile = profile, expectedVersion?: number) => {
    setSaving(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT', headers: requestHeaders(), body: JSON.stringify(expectedVersion === undefined ? nextProfile : { data: nextProfile, expectedVersion }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.error || '保存失败');
      const savedProfile = readProfile(data.data);
      setRecord(data);
      setProfile(savedProfile);
      toast.success('个人资料已保存');
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败');
      return false;
    } finally {
      setSaving(false);
    }
  }, [profile]);

  const loadSample = async () => {
    if (record && !window.confirm('加载虚构示例会覆盖当前个人资料，是否继续？')) return;
    setLoading(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'POST', headers: requestHeaders(),
        body: JSON.stringify(SAMPLE_CANDIDATE_PROFILES[Math.floor(Math.random() * SAMPLE_CANDIDATE_PROFILES.length)]),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '示例加载失败');
      const sample = readProfile(data.data);
      setRecord(data);
      setProfile(sample);
      toast.success(`已随机加载虚构示例：${sample.personalInfo.fullName} · ${sample.personalInfo.jobTitle}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '示例加载失败');
    } finally {
      setLoading(false);
    }
  };

  const optimize = async () => {
    setOptimizing(true);
    try {
      if (!await save()) return;
      const response = await fetch('/api/ai/profile/optimize', {
        method: 'POST', headers: requestHeaders(true), body: '{}',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI 优化失败');
      setProposal(data.proposal);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'AI 优化失败');
    } finally {
      setOptimizing(false);
    }
  };

  const openEditor = (section: string, id?: string) => {
    setDraft(structuredClone(profile));
    setEditingId(id);
    setEditingTitle(profileEditorTitle(section,id,profile));
    setEditing(section);
  };
  const addEntry = (kind: ProfileAddKind) => {
    const next = structuredClone(profile);
    const id = crypto.randomUUID();
    if (kind === 'experience') next.experiences.push({id,type:'internship',company:'',position:'',location:'',startDate:'',endDate:'',current:false,description:'',highlights:[]});
    if (kind === 'education') next.education.push({id,institution:'',degree:'',field:'',startDate:'',endDate:'',gpa:'',description:''});
    if (kind === 'projects') next.projects.push({id,name:'',role:'',startDate:'',endDate:'',description:'',technologies:[],highlights:[],url:''});
    if (kind === 'skills') next.skills.push({id,name:'',skills:[]});
    if (kind === 'certifications') next.certifications.push({id,name:'',issuer:'',date:''});
    if (kind === 'languages') next.languages.push({id,language:'',proficiency:'',description:''});
    setDraft(next);
    setEditingId(id);
    setEditingTitle(profileEditorTitle(kind === 'certifications' || kind === 'languages' ? 'certificates' : kind,id,next));
    setEditing(kind === 'certifications' || kind === 'languages' ? 'certificates' : kind);
  };

  if (loading) {
    return <div className="flex min-h-80 items-center justify-center"><LoaderCircle className="animate-spin text-zinc-400" /></div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <Image className={styles.motto} src="/images/profile/handwritten-motto.png" alt="更好的自己，正在路上" width={186} height={84} />
        <div className={templateStyles.heroContent}><p className={templateStyles.eyebrow}>个人资料库</p><h1 className={templateStyles.headline}>收藏成长的点滴，<br />为下一次机会做好准备。</h1>{profile.isSample && <span className={styles.sample}>虚构示例</span>}</div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={optimizing || saving || !record} onClick={() => setImportOpen(true)}><Upload size={16}/>附件智能填入</Button><Button disabled={optimizing || saving} onClick={optimize} className="gap-2 bg-slate-900 text-white hover:bg-slate-800">{optimizing ? <LoaderCircle size={16} className="animate-spin"/> : <Sparkles size={16}/>}一键优化表达</Button></div>
      </header>
      {importOpen && <ProfileImportDialog current={profile} version={record?.version} onClose={() => setImportOpen(false)} onSave={save}/>}
      <ProfileNavigation value={activeTab} onChange={setActiveTab}/>
      <main className={styles.content}>
        <div className={styles.sectionHeading}><div><h2>{PROFILE_TABS.find(([key])=>key===activeTab)?.[1]}</h2><p>{activeTab==='basic'?'个人信息与求职方向':'整理每一段经历，让成长清晰可见。'}</p></div><button className={styles.sampleAction} disabled={saving || optimizing} onClick={loadSample}>加载虚构示例</button></div>
        <ProfileOverview profile={profile} section={activeTab} onEdit={openEditor} onAdd={addEntry}/>
      </main>
      <AppDialog open={editing!==null} onClose={()=>setEditing(null)} closeDisabled={saving} title={'编辑'+editingTitle} width={720} bodyClassName="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-auto p-6"><fieldset disabled={saving}><ProfileEditor section={editing || 'basic'} profile={draft} setProfile={setDraft} focusId={editingId}/></fieldset></div>
        <div className="flex shrink-0 justify-end gap-3 border-t p-4"><Button variant="outline" disabled={saving} onClick={()=>setEditing(null)}>取消</Button><Button disabled={saving} onClick={async()=>{if(await save({...draft,isSample:false}))setEditing(null);}}>{saving?'保存中…':'保存修改'}</Button></div>
      </AppDialog>
      <AppDialog open={Boolean(proposal)} onClose={() => setProposal(null)} title={proposal?.title || '资料优化'} width={820} height="min(760px, calc(100dvh - 48px))" bodyClassName="flex min-h-0 flex-col">
        {proposal && <><div className="min-h-0 flex-1 overflow-y-auto px-5 py-4"><div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-400/10 dark:text-amber-100">{proposal.reason}</div><div className="space-y-4">{proposal.changes.map((change) => <div key={change.path} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"><div className="mb-2 text-sm font-semibold">{change.label}</div><div className="grid gap-3 md:grid-cols-2"><div><div className="mb-1 text-[11px] text-red-500">优化前</div><div className="whitespace-pre-wrap rounded-md bg-red-50 p-2 text-xs leading-5 text-red-900 dark:bg-red-500/10 dark:text-red-100">{Array.isArray(change.before) ? change.before.join('\n') : change.before}</div></div><div><div className="mb-1 text-[11px] text-emerald-600">优化后</div><div className="whitespace-pre-wrap rounded-md bg-emerald-50 p-2 text-xs leading-5 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100">{Array.isArray(change.after) ? change.after.join('\n') : change.after}</div></div></div><p className="mt-2 text-xs text-zinc-500">{change.reason}</p></div>)}</div></div><div className="flex justify-end gap-2 border-t px-5 py-3"><Button variant="outline" onClick={() => setProposal(null)}>暂不应用</Button><Button disabled={saving} onClick={async () => { if (await save(proposal.optimizedProfile)) setProposal(null); }}>{saving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}应用全部优化</Button></div></>}
      </AppDialog>
    </div>
  );
}
