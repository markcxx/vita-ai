'use client';
import { useEffect, useState } from 'react';
import { Check, FileText } from 'lucide-react';
import type { Resume } from '@/types/resume';
import { Button } from '@/components/ui/button';
export function ResumeSelector({value,onChange}:{value:string|undefined;onChange:(value:string|undefined)=>void}) {
 const [resumes,setResumes]=useState<Resume[]>([]); const [error,setError]=useState(false);
 useEffect(()=>{ fetch('/api/resume',{headers:{}}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>setResumes(Array.isArray(data)?data:[])).catch(()=>setError(true));},[]);
 return <div><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-medium">关联简历（选填）</h3><Button variant="ghost" size="sm" onClick={()=>onChange(undefined)} aria-pressed={!value}>不使用简历</Button></div><p className="mb-4 text-xs text-muted-foreground">选择已有简历，让面试问题更贴近你的经历。</p><div className="grid gap-3 sm:grid-cols-2">{resumes.map(r=><button key={r.id} type="button" aria-pressed={value===r.id} onClick={()=>onChange(r.id)} className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${value===r.id?'border-brand bg-brand-muted':'bg-card hover:bg-muted'}`}><FileText className="h-10 w-8 shrink-0 text-sky-400"/><span className="flex-1 text-sm font-medium">{r.title}</span>{value===r.id&&<Check size={16}/>}</button>)}</div>{!resumes.length&&<p className="py-3 text-sm text-muted-foreground">{error?'暂时无法加载简历，可继续面试或稍后重新进入。':'暂无可选简历，可以直接根据岗位开始面试。'}</p>}</div>;
}
