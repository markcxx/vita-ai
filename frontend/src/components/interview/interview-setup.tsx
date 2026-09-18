'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, ChevronDown, FileText, Keyboard, Mic, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { InterviewerPicker } from './interviewer-picker';
import { DeviceCheck } from './device-check';
import { InterviewArt } from './interview-art';
import { getAIHeaders } from '@/stores/settings-store';
import { getInterviewerAvatar } from '@/lib/interview/avatar';
import type { Resume } from '@/types/resume';
import type { InterviewInteractionMode, InterviewerConfig } from '@/types/interview';
import s from './interview.module.css';

const steps = ['岗位与简历', '选择面试官', '面试准备'];
export function InterviewSetup() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [name, setName] = useState('');
  const [jd, setJd] = useState('');
  const [resumeId, setResumeId] = useState<string>();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [resumeStatus, setResumeStatus] = useState('正在加载简历…');
  const [selected, setSelected] = useState<InterviewerConfig[]>([]);
  const [mode, setMode] = useState<InterviewInteractionMode>('voice');
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('mode') === 'text') setMode('text');

    fetch('/api/resume', { headers: {} }).then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => { setResumes(Array.isArray(data) ? data : []); setResumeStatus('暂无简历，可直接根据岗位开始面试。'); })
      .catch(() => setResumeStatus('简历暂时无法加载，可稍后重试或不关联简历。'));
  }, []);
  const resume = resumes.find(r => r.id === resumeId);
  const canContinue = step === 0 ? !!title.trim() && !!jd.trim() : selected.length > 0;
  async function start() {
    if (creating || !title.trim() || !jd.trim() || !selected.length) return;
    setCreating(true);
    try {

      const response = await fetch('/api/interview', { method: 'POST', headers: { 'Content-Type': 'application/json',  ...getAIHeaders() }, body: JSON.stringify({ name: name.trim() || `${title.trim()}面试`, jobTitle: title.trim(), jobDescription: jd, resumeId, interviewers: selected, interactionMode: mode }) });
      if (!response.ok) throw new Error('创建面试失败，请稍后重试');
      const data = await response.json(); router.push(`/interview/${data.session.id}`);
    } catch (error) { toast.error(error instanceof Error ? error.message : '创建失败'); setCreating(false); }
  }
  const axis = <div className={s.setupAxis}>{steps.map((label, i) => <div key={label} data-active={step === i} data-done={step > i}><b>{step > i ? <Check size={16}/> : i + 1}</b><span>{label}</span></div>)}</div>;
  const footer = <footer className={s.setupFooter}><span>{step === 1 ? `已选择 ${selected.length} 位面试官` : ''}</span><Button variant="outline" disabled={creating} onClick={() => step ? setStep(step - 1) : router.push('/interview')}>上一步</Button><Button disabled={!canContinue || creating} onClick={() => step < 2 ? setStep(step + 1) : void start()}>{creating ? '正在进入…' : step === 2 ? '进入面试' : `下一步：${steps[step + 1]}`}</Button></footer>;
  return <div className={s.setup} data-step={step}>
    <div className={s.setupMain}>
      <header className={s.setupHeader}>
        {step > 0 && <div className={s.headerArt}><InterviewArt/></div>}
        <Link href="/interview" className={s.back}><ArrowLeft size={16}/>返回模拟面试</Link>
        <h1>{step === 1 ? '选择你的面试官' : step === 2 ? '准备开始' : '准备你的面试'}</h1>
        <p>{step === 1 ? '可选择多位面试官，从不同专业视角展开交流。' : step === 2 ? '请完成面试准备，检查设备状态，确保顺利进行面试。' : '告诉我们目标岗位，面试问题将结合你的经历。'}</p>
        {axis}
      </header>
      {step === 0 && <section className={s.detailsForm}>
        <label>面试名称<div className={s.countedInput}><Input maxLength={50} value={name} onChange={e => setName(e.target.value)} placeholder={title ? `${title}面试` : '为这次练习取一个名称'}/><small>{name.length}/50</small></div></label>
        <label>目标岗位 <em>*</em><div className={s.countedInput}><Input maxLength={50} value={title} onChange={e => setTitle(e.target.value)} placeholder="例如：前端开发工程师、财务专员"/><small>{title.length}/50</small></div></label>
        <label>职位描述 <em>*</em><p className={s.hint}>粘贴招聘信息，生成更贴近岗位的问题。</p><div className={s.countedInput}><Textarea maxLength={5000} value={jd} onChange={e => setJd(e.target.value)} placeholder="填写岗位职责、能力要求和你希望重点练习的内容…"/><small>{jd.length}/5000</small></div></label>
        <div className={s.resumeChoices}><h3>关联简历（选填）</h3><p className={s.hint}>选择相关简历，面试问题将结合你的简历生成。</p><div>{resumes.map(r => <button key={r.id} aria-pressed={r.id === resumeId} onClick={() => setResumeId(r.id)}><ResumePaper/><span><strong>{r.title}</strong><small>更新于 {new Date(r.updatedAt).toLocaleDateString('zh-CN')}</small></span>{r.id === resumeId ? <Check size={18}/> : <Circle size={18}/>}</button>)}<button className={s.noResume} onClick={() => setResumeId(undefined)} aria-pressed={!resumeId}>不使用简历</button></div>{!resumes.length && <p className={s.hint}>{resumeStatus}</p>}</div>
      </section>}
      {step === 1 && <div className={s.pickerBody}><InterviewerPicker selected={selected} onChange={setSelected}/></div>}
      {step === 2 && <div className={s.readyGrid}><section className={s.readyCard}><h2>选择交流方式</h2><p className={s.hint}>选择你希望的面试交流方式，建议使用语音面试，获得更真实的面试体验。</p><div className={s.options}>{([['voice', '语音面试', '通过语音进行实时对话，\n更贴近真实面试场景。', Mic], ['text', '文字面试', '通过文字进行问答，\n适合不方便发声的场景。', Keyboard]] as const).map(([value, label, hint, Icon]) => <button className={s.option} key={value} aria-pressed={mode === value} onClick={() => setMode(value)}><i/ ><Icon size={30}/><span><strong>{label}</strong><small>{hint}</small></span></button>)}</div>{mode === 'voice' ? <DeviceCheck/> : <div className={s.textModeNote}><Keyboard size={32}/><h3>从容组织你的回答</h3><p>使用文字与面试官交流，无需开启麦克风。</p></div>}{footer}</section><aside className={s.readySummary}><h2>本次面试</h2><small>面试岗位</small><h3>{title}</h3><small>已关联简历</small><div className={s.summaryResume}>{resume ? <><ResumePaper/><span><strong>{resume.title}</strong><small>更新于 {new Date(resume.updatedAt).toLocaleDateString('zh-CN')}</small></span></> : <p className={s.hint}>未关联简历 · 根据岗位要求提问</p>}</div><small>面试阵容</small><div className={s.readyPeople}>{selected.map((p,i) => <div key={p.type}><div><Image width={512} height={512} src={getInterviewerAvatar(p.avatar,p.type)} alt=""/><span><strong>{p.name}</strong><small>{p.title}</small></span></div>{i < selected.length - 1 && <ChevronDown size={15}/>}</div>)}</div><div className={s.questionSummary}><FileText size={28}/><span><strong>共 8 道主要问题</strong><small>根据回答，自然追问与切换面试官</small></span></div></aside></div>}
      {step !== 2 && footer}
    </div>
    {step === 0 && <aside className={s.preparationArt}><InterviewArt documents/><div><h2>将结合岗位要求与简历经历<br/>进行提问。</h2><p>我们会根据你填写的岗位信息和简历内容，<br/>生成更具针对性的面试问题。</p></div><span>更好的自己，从每一次面试开始</span></aside>}
  </div>;
}
function ResumePaper() { return <div className={s.resumePaper} aria-hidden="true"><b/><i/><i/><i/><b/><i/><i/><i/></div>; }
