'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Code2, LayoutGrid, Play, Trash2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import type { InterviewSession, HistoryStats } from '@/types/interview';
import s from './interview.module.css';
import { ScrollStage } from '@/components/layout/scroll-stage';

export function InterviewLobby() {
  const [sessions,setSessions] = useState<InterviewSession[]>([]);
  const [history,setHistory] = useState<HistoryStats['sessions']>([]);
  const [loading,setLoading] = useState(true);
  const [failed,setFailed] = useState(false);
  const [all,setAll] = useState(false);
  const [page,setPage] = useState(1);
  const [trendCount,setTrendCount] = useState(3);
  const [deleteId,setDeleteId] = useState<string|null>(null);
  const [deleting,setDeleting] = useState(false);
  useEffect(()=>{
     const headers={};
    Promise.all([fetch('/api/interview',{headers}),fetch('/api/interview/history/stats',{headers})].map(async p=>{const r=await p;if(!r.ok)throw new Error();return r.json();}))
      .then(([list,stats])=>{setSessions(Array.isArray(list)?list:[]);setHistory(stats.sessions||[]);}).catch(()=>setFailed(true)).finally(()=>setLoading(false));
  },[]);
  const scores=useMemo(()=>new Map(history.map(h=>[h.id,h.overallScore])),[history]);
  const trend=useMemo(()=>[...history].sort((a,b)=>+new Date(a.createdAt)-+new Date(b.createdAt)).slice(-trendCount),[history,trendCount]);
  const visible=all?sessions.slice((page-1)*5,page*5):sessions.slice(0,2);
  async function remove() {
    if(!deleteId||deleting)return;setDeleting(true);
    try {const r=await fetch(`/api/interview/${deleteId}`,{method:'DELETE',headers:{}});if(!r.ok)throw new Error();setSessions(v=>v.filter(i=>i.id!==deleteId));setHistory(v=>v.filter(i=>i.id!==deleteId));setDeleteId(null);setPage(1);}catch{toast.error('删除未成功，请重试');}finally{setDeleting(false);}
  }
  return <ScrollStage title="模拟面试" actions={<Button asChild><Link href="/interview/new"><Play size={15}/>开始模拟面试</Link></Button>}><div className={s.lobby}>
    <header className={s.hero} data-scroll-hero><div data-scroll-intro><p className={s.lobbyEyebrow}>模拟面试 · MOCK INTERVIEW</p><h1>让每一次开口，<br/>更接近心动 <span>offer</span></h1></div><div className={s.heroActions}><Link href="/interview/new"><Button><Play size={18} fill="currentColor"/>开始模拟面试</Button></Link><a href="#interview-history">查看练习记录 <ArrowRight size={17}/></a></div></header>
    <div className={s.lobbySteps}>{[['岗位与简历','选择目标岗位，匹配你的简历'],['选择面试官','AI 面试官将基于真实场景提问'],['开始练习','进行模拟面试，获取针对性反馈']].map(([label,desc],i)=><div key={label}><b>{i+1}</b><span><strong>{label}</strong><small>{desc}</small></span></div>)}</div>
    <main className={s.lobbyGrid} id="interview-history"><section className={s.recentCard}><header><h2>最近的面试</h2><button onClick={()=>{setAll(v=>!v);setPage(1);}}>{all?'收起':'查看全部'} <ArrowRight size={15}/></button></header>
      {loading ? <div className={s.lobbyEmpty}>正在加载面试记录…</div> : !visible.length ? <div className={s.lobbyEmpty}>{failed?'暂时无法获取记录，请刷新重试':'还没有面试记录，从一次练习开始吧。'}<Link href="/interview/new">开始第一次面试 <ArrowRight size={14}/></Link></div> : visible.map((item,i)=>{
        const complete=item.status==='completed'; const score=scores.get(item.id);
        return <article className={s.sessionRow} key={item.id}><div className={s.sessionIcon} data-tone={i%2?'yellow':'blue'}>{i%2?<LayoutGrid/>:<Code2/>}</div><div className={s.sessionInfo}><strong>{item.name||item.jobTitle}</strong><p>{item.selectedInterviewers.map(p=>p.title).join(' · ')}</p><small>{new Date(item.createdAt).toLocaleString('zh-CN',{hour12:false})}</small></div><span className={s.sessionStatus} data-complete={complete}>● {complete?'已完成':item.status==='paused'?'已暂停':item.status==='preparing'?'待开始':'进行中'}</span><span className={s.sessionScore}>{score!=null?<><b>{score}</b>分</>:'—'}</span><Link href={`/interview/${item.id}${complete?'/report':''}`}><Button variant={complete?'outline':'default'}>{complete?'查看报告':'继续面试'}</Button></Link><button className={s.deleteSession} aria-label={`删除${item.name||item.jobTitle}`} onClick={()=>setDeleteId(item.id)}><Trash2 size={17}/></button></article>;
      })}
      {all&&sessions.length>5&&<div className={s.historyPagination}><Button variant="outline" disabled={page===1} onClick={()=>setPage(p=>p-1)}>上一页</Button><span>{page} / {Math.ceil(sessions.length/5)}</span><Button variant="outline" disabled={page*5>=sessions.length} onClick={()=>setPage(p=>p+1)}>下一页</Button></div>}
    </section><aside className={s.trendCard}><header><h2>最近表现</h2><Select value={String(trendCount)} onValueChange={value=>setTrendCount(Number(value))}><SelectTrigger size="sm" aria-label="趋势范围"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="3">近3次面试</SelectItem><SelectItem value="5">近5次面试</SelectItem></SelectContent></Select></header><PerformanceTrend points={trend}/><p><TrendingUp size={20}/>{trend.length>1&&trend.at(-1)!.overallScore>trend[0].overallScore?'持续练习，表现在稳步提升！':'每一次复盘，都让下一次更从容。'}</p></aside></main>
    <AlertDialog open={!!deleteId} onOpenChange={open=>!open&&!deleting&&setDeleteId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>删除面试记录？</AlertDialogTitle><AlertDialogDescription>删除后无法恢复本次对话和报告。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel><AlertDialogAction disabled={deleting} onClick={e=>{e.preventDefault();void remove();}}>{deleting?'删除中…':'删除'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div></ScrollStage>;
}
function PerformanceTrend({points}:{points:HistoryStats['sessions']}) {
  if(!points.length)return <div className={s.trendEmpty}>完成面试后，查看你的成长趋势</div>;
  const coords=points.map((p,i)=>({x:38+(points.length===1?.5:i/(points.length-1))*280,y:175-Math.max(0,Math.min(100,p.overallScore))*1.45,score:p.overallScore}));
  return <svg viewBox="0 0 355 215" className={s.trendSvg} aria-label="近期面试评分趋势" role="img"><defs><linearGradient id="score-trend-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#6fd6bd" stopOpacity=".22"/><stop offset="1" stopColor="#6fd6bd" stopOpacity=".02"/></linearGradient></defs>{[0,25,50,75,100].map(n=><g key={n}><line x1="38" x2="335" y1={175-n*1.45} y2={175-n*1.45} stroke="#edf0f5"/><text x="26" y={179-n*1.45} textAnchor="end" fontSize="10" fill="#929bab">{n}</text></g>)}<path d={`M${coords[0].x},175 ${coords.map(p=>`L${p.x},${p.y}`).join(' ')} L${coords.at(-1)!.x},175 Z`} fill="url(#score-trend-fill)"/><polyline points={coords.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#2cbd99" strokeWidth="2"/>{coords.map((p,i)=><g key={i}><circle cx={p.x} cy={p.y} r="5" fill="#35c19e" stroke="white" strokeWidth="2"/><text x={p.x} y={p.y-13} textAnchor="middle" fontSize="12" fill="#1b2538">{p.score}</text><text x={p.x} y="198" textAnchor="middle" fontSize="11" fill="#929bab">第{i+1}次</text></g>)}</svg>;
}
