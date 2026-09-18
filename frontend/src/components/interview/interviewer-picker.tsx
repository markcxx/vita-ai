'use client';
import Image from 'next/image';
import { useState } from 'react';
import { Check, Plus, X, GripVertical, ArrowUp, ArrowDown, Volume2, Square, LoaderCircle } from 'lucide-react';
import { useInterviewerVoicePreview } from '@/hooks/use-interviewer-voice-preview';
import { Button } from '@/components/ui/button';
import { CustomInterviewerDialog } from './custom-interviewer-dialog';
import { getInterviewerAvatar } from '@/lib/interview/avatar';
import { getIndustryInterviewers, INTERVIEW_INDUSTRIES } from '@/lib/interview/interviewers';
import type { InterviewerConfig } from '@/types/interview';
import s from './interview.module.css';

export function InterviewerPicker({ selected, onChange }: { selected: InterviewerConfig[]; onChange: (items: InterviewerConfig[]) => void }) {
  const { preview, togglePreview } = useInterviewerVoicePreview();
  const [industry, setIndustry] = useState('all');
  const [dragged,setDragged] = useState<string|null>(null);
  function move(from:number,to:number) { if(to<0||to>=selected.length)return;const next=[...selected];const [p]=next.splice(from,1);next.splice(to,0,p);onChange(next); }
  const [custom, setCustom] = useState<InterviewerConfig[]>([]);
  const all = [...getIndustryInterviewers(), ...custom];
  const visible = all.filter(p => industry === 'all' || p.industries?.includes(industry) || p.industries?.includes('general') || p.type.startsWith('custom_'));
  const toggle = (p: InterviewerConfig) => onChange(selected.some(v => v.type === p.type) ? selected.filter(v => v.type !== p.type) : selected.length < 6 ? [...selected, p] : selected);
  return <div>
    <div className={s.filters} aria-label="按行业筛选面试官">{INTERVIEW_INDUSTRIES.map(([id, label]) => <button key={id} type="button" aria-pressed={industry === id} onClick={() => setIndustry(id)}>{label}</button>)}</div>
    <div className={s.picker}><div className={s.people}>
      {visible.map(p => { const active = selected.some(v => v.type === p.type); return <div key={p.type} className={s.personWithPreview}><button type="button" className={`${s.person} ${s.dimensionalPerson}`} data-tone={p.tone} aria-pressed={active} disabled={!active && selected.length >= 6} onClick={() => toggle(p)}>
        <span className={s.characterStage}><span className={s.stagePanel}/><span className={s.stagePlant}><i/><i/><i/></span><span className={s.stagePedestal}/><Image width={512} height={512} src={getInterviewerAvatar(p.avatar, p.type)} alt="" /></span>
        {active && <span className={s.personNumber}>{selected.findIndex(v=>v.type===p.type)+1}</span>}<span className={s.check}>{active && <Check size={15}/>}</span><span className={s.personInfo}><strong>{p.name}</strong><span>{p.title}</span><small className={s.focusPills}>{p.focusAreas.slice(0, 2).map(area => <em key={area}>{area}</em>)}</small></span>
      </button><Button type="button" variant="ghost" size="icon-sm" className={s.voicePreviewButton}
        aria-label={preview?.type === p.type ? `停止试听${p.name}` : `试听${p.name}的音色`}
        title={preview?.type === p.type ? '停止试听' : '音色试听'} aria-pressed={preview?.type === p.type}
        onClick={() => void togglePreview(p)}>
        {preview?.type === p.type ? (preview.loading ? <LoaderCircle size={16} className="animate-spin"/> : <Square size={14}/>) : <Volume2 size={16}/>}
      </Button></div>; })}
      <CustomInterviewerDialog onAdd={config => { const p = config; setCustom(v => [...v, p]); if(selected.length < 6) onChange([...selected, p]); }} trigger={<button type="button" className={`${s.person} ${s.custom}`}><Plus size={28}/><strong>自定义面试官</strong><span className={s.hint}>创建适合你的专业面试角色</span></button>}/>
    </div><aside className={`${s.card} ${s.panelSummary}`}><h3>面试阵容 <span className={s.hint}>{selected.length} / 6</span></h3><p className={s.hint}>每位面试官从自己的专业视角参与，AI 根据交流内容选择提问者。</p>
      {selected.length === 0 && <p className="py-8 text-sm text-muted-foreground">点击左侧卡片加入面试</p>}
      {selected.map((p,index) => <div key={p.type} className={s.member} draggable onDragStart={()=>setDragged(p.type)} onDragEnd={()=>setDragged(null)} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(dragged)move(selected.findIndex(v=>v.type===dragged),index);setDragged(null);}}><small>{String(index+1).padStart(2,'0')}</small><Image width={512} height={512} src={getInterviewerAvatar(p.avatar,p.type)} alt=""/><div className="flex-1"><strong>{p.name}</strong><span>{p.roundLabel || p.title}</span></div><div className={s.memberActions}><GripVertical size={14}/><button aria-label={`上移${p.name}`} disabled={index===0} onClick={()=>move(index,index-1)}><ArrowUp size={12}/></button><button aria-label={`下移${p.name}`} disabled={index===selected.length-1} onClick={()=>move(index,index+1)}><ArrowDown size={12}/></button><Button variant="ghost" size="icon-sm" aria-label={`移除${p.name}`} onClick={()=>toggle(p)}><X size={14}/></Button></div></div>)}
    </aside></div>
  </div>;
}
