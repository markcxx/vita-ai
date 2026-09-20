'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, FileText, LoaderCircle, ScanLine, Upload, X } from 'lucide-react';
import { AppDialog } from '@/components/ui/AppDialog';
import { Button } from '@/components/ui/button';
import { getAIHeaders } from '@/stores/settings-store';
import { candidateProfileSchema } from '@/lib/profile/profile-schema';
import { combineProfile, hasProfileContent, type ImportMode } from '@/lib/profile/profile-import';
import type { CandidateProfileData } from '@/types/candidate-profile';
import { ProfileImportLoading } from './profile-import-loading';
import { ProfileEditor } from './profile-editor';
import s from './profile-import.module.css';

const ACCEPT = '.pdf,.docx,.xlsx,.xls,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.webp';
const tabs = [['basic', '基本资料'], ['experience', '工作实习'], ['education', '教育背景'], ['projects', '项目经历'], ['skills', '技能意向'], ['certificates', '证书语言']] as const;

export function ProfileImportDialog({ current, version, onClose, onSave }: {
  current: CandidateProfileData; version?: number; onClose: () => void;
  onSave: (profile: CandidateProfileData, expectedVersion?: number) => Promise<boolean>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);
  const [draft, setDraft] = useState<CandidateProfileData | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [mode, setMode] = useState<ImportMode>('append');
  const [tab, setTab] = useState('basic');
  const [confirmed, setConfirmed] = useState(false);
  const existing = hasProfileContent(current);
  useEffect(() => () => controller.current?.abort(), []);

  function addFiles(items: File[]) {
    setError('');
    const next = [...files];
    for (const file of items) {
      if (!ACCEPT.split(',').some(ext => file.name.toLowerCase().endsWith(ext))) { setError(`${file.name} 暂不支持，请转换为下方支持的格式。`); return; }
      if (!file.size || file.size > 10 * 1024 * 1024) { setError('文件不能为空，单个文件不能超过 10 MB。'); return; }
      if (!next.some(f => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified)) next.push(file);
    }
    if (next.length > 6 || next.reduce((sum, f) => sum + f.size, 0) > 25 * 1024 * 1024) { setError('每次最多 6 个附件，合计不超过 25 MB。'); return; }
    setFiles(next);
  }

  async function analyze() {
    if (controller.current || !files.length) return;
    const request = new AbortController();
    controller.current = request;
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; request.abort(); }, 190_000);
    setBusy(true); setError('');
    const body = new FormData();
    files.forEach(file => body.append('files', file));
    try {
      const response = await fetch('/api/profile/import', { method: 'POST', headers: getAIHeaders(), body, signal: request.signal });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : data.error || '附件分析失败，请稍后重试');
      const parsed = candidateProfileSchema.safeParse(data.profile);
      if (!parsed.success || !hasProfileContent(parsed.data)) throw new Error('未取得完整可用的个人资料，请换一份材料后重试。');
      if (request.signal.aborted) return;
      setDraft(parsed.data); setWarnings(Array.isArray(data.warnings) ? data.warnings.filter((w: unknown) => typeof w === 'string') : []);
    } catch (e) {
      if (timedOut) setError('分析超时，请减少附件数量或更换模型后重试。');
      else if (!request.signal.aborted) setError(e instanceof Error ? e.message : '分析失败，请重试');
    } finally {
      clearTimeout(timeout);
      if (controller.current === request) { controller.current = null; setBusy(false); }
    }
  }

  function cancel() { controller.current?.abort(); controller.current = null; setBusy(false); }
  async function apply() {
    if (!draft || saving) return;
    setError('');
    let next: CandidateProfileData;
    try { next = combineProfile(current, draft, existing ? mode : 'replace'); }
    catch { setError('资料条目或文字超过上限，请精简内容后再保存。'); return; }
    setSaving(true);
    try { if (await onSave(next, version)) onClose(); else setError('保存未完成，识别结果已保留。请查看错误提示后重试。'); }
    finally { setSaving(false); }
  }

  function editor(section: string, id?: string) {
    if (!draft) return null;
    return <ProfileEditor section={section} focusId={id} profile={draft} setProfile={value => setDraft(previous => previous ? typeof value === 'function' ? value(previous) : value : previous)}/>;
  }
  function entries() {
    if (!draft) return [];
    if (tab === 'experience') return draft.experiences.map(e => ({ id: e.id, label: `${e.company || '未填写公司'} · ${e.position || '经历'}` }));
    if (tab === 'education') return draft.education.map(e => ({ id: e.id, label: `${e.institution || '教育经历'} · ${e.field}` }));
    if (tab === 'projects') return draft.projects.map(e => ({ id: e.id, label: e.name || '项目经历' }));
    if (tab === 'skills') return [...draft.skills.map(e => ({ id: e.id, label: e.name || '技能' })), { id: 'preferences-import', label: '求职意向' }];
    return [...draft.certifications.map(e => ({ id: e.id, label: e.name || '证书' })), ...draft.languages.map(e => ({ id: e.id, label: e.language || '语言能力' }))];
  }
  if (busy) return <ProfileImportLoading onCancel={cancel}/>;

  return <AppDialog open onClose={onClose} closeDisabled={busy || saving} maskClosable={false} title={draft ? '核对并填入个人资料' : '从附件整理个人资料'} width={draft ? 820 : 620} height={draft ? 'min(820px, calc(100dvh - 40px))' : undefined} bodyClassName="flex min-h-0 flex-col">
    <div className={`${s.body} min-h-0 overflow-y-auto`}>
      {!draft ? <>
        <p className={s.intro}>不必从空白开始。把简历、成绩单、证书、项目介绍或工作记录交给 AI，自动整理为可编辑的个人资料。</p>
        <input ref={input} type="file" accept={ACCEPT} multiple className="sr-only" aria-label="上传个人资料附件" onChange={e => { addFiles(Array.from(e.target.files || [])); e.target.value = ''; }}/>
        <button type="button" className={`${s.drop} ${drag ? s.drag : ''}`} onClick={() => input.current?.click()} onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); addFiles(Array.from(e.dataTransfer.files)); }}>
          <Upload size={26}/><strong>拖入材料，或点击选择附件</strong><span>PDF / DOCX / Excel / TXT / Markdown / CSV / JSON<br/>JPG / PNG / WebP · 最多 6 份，单份 10 MB，合计 25 MB</span>
        </button>
        <div className={s.files}>{files.map((file, i) => <div className={s.file} key={`${file.name}-${file.lastModified}`}><FileText size={16}/><span>{file.name}</span><small>{file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB`}</small><button aria-label={`移除 ${file.name}`} onClick={() => setFiles(items => items.filter((_, index) => index !== i))}><X size={15}/></button></div>)}</div>
        <p className={s.intro}>材料将发送给你在设置中配置的 AI 模型。图片需使用支持视觉的 OpenAI 兼容模型；扫描版 PDF 请转为清晰图片上传。分析后先核对，再决定如何填入。</p>
      </> : <>
        <div className="flex items-center gap-2 text-sm font-medium"><Check size={17} className="text-emerald-600"/>已整理 {files.length} 份材料，请核对识别结果</div>
        {existing && <div className={s.modes} role="radiogroup" aria-label="已有资料处理方式">
          <label className={s.mode}><input type="radio" name="import-mode" value="append" checked={mode === 'append'} disabled={saving} onChange={() => { setMode('append'); setConfirmed(false); }}/><div><strong>追加补充 · 推荐</strong><span>保留已有信息，填补空白字段，追加新经历；相同记录合并补充。</span></div></label>
          <label className={s.mode}><input type="radio" name="import-mode" value="replace" checked={mode === 'replace'} disabled={saving} onChange={() => { setMode('replace'); setConfirmed(false); }}/><div><strong>覆盖现有资料</strong><span>整份替换为本次识别结果，附件中没有的内容也会被清空。</span></div></label>
        </div>}
        {existing && current.isSample && <div className={s.notice}>当前资料含虚构示例。建议选择覆盖，避免将示例经历混入真实资料；追加后将继续保留示例标记。</div>}
        {!!warnings.length && <div className={s.notice}><strong>需要你留意</strong><ul>{warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul></div>}
        {existing && mode === 'append' && <p className={s.intro}>以下展示本次识别内容。姓名、联系方式等已有非空字段发生冲突时保留原值；已有个人简介也会保留。确认前可修改或删除识别条目。</p>}
        <div className={s.tabs} aria-label="识别资料分类">{tabs.map(([key, label]) => <button key={key} aria-pressed={tab === key} onClick={() => setTab(key)}>{label}</button>)}</div>
        <fieldset disabled={saving} className={s.review}>
          {tab === 'basic' ? [['identity', '姓名与求职方向'], ['contact', '联系方式'], ['summary', '个人简介'], ['links', '个人链接']].map(([id, label]) => <details key={id} className={s.edit} open><summary>{label}</summary>{editor('basic', id)}</details>) : entries().length ? entries().map(entry => <details key={entry.id} className={s.edit} open><summary>{entry.label}</summary>{editor(tab, entry.id)}</details>) : <p>{mode === 'replace' && existing ? '这批材料没有识别到该类信息，覆盖时此栏目会被清空。' : '这批材料没有识别到该类信息。追加时将保留已有内容。'}</p>}
        </fieldset>
        {existing && mode === 'replace' && <label className={`${s.notice} flex items-start gap-2`}><input type="checkbox" checked={confirmed} disabled={saving} onChange={e => setConfirmed(e.target.checked)} className="mt-1"/>我确认用本次结果替换整份资料，未识别到的已有内容会被清空。</label>}
      </>}
      {error && <div role="alert" className={s.error}>{error}</div>}
    </div>
    <div className={s.footer}>
      {draft ? <><Button variant="outline" disabled={saving} onClick={() => { setDraft(null); setError(''); setConfirmed(false); }}>重新选择材料</Button><Button disabled={saving || (existing && mode === 'replace' && !confirmed)} onClick={apply}>{saving ? <LoaderCircle size={15} className="animate-spin"/> : <Check size={15}/>} {saving ? '正在保存' : existing && mode === 'replace' ? '确认覆盖并保存' : '确认填入并保存'}</Button></> : <><Button variant="outline" onClick={onClose}>取消</Button><Button disabled={!files.length} onClick={analyze}><ScanLine size={16}/>开始智能整理</Button></>}
    </div>
  </AppDialog>;
}
