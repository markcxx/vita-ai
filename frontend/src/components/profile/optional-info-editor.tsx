'use client';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CandidateProfileData } from '@/types/candidate-profile';

type Personal = CandidateProfileData['personalInfo'];
export function profileLinks(personal: Personal) {
  // An explicit empty array means the user removed all links; do not revive legacy values.
  return personal.links ?? ([['website','个人主页'],['github','个人链接'],['linkedin','其他链接']] as const)
    .filter(([key]) => personal[key].trim())
    .map(([key,label]) => ({id:'legacy-'+key,label,url:personal[key]}));
}
export function LinksEditor({personal,onChange}:{personal:Personal;onChange:(next:Personal)=>void}) {
 const links=profileLinks(personal);
 const update=(next:typeof links)=>onChange({...personal,links:next,
   website:next.find(e=>e.id==='legacy-website')?.url || '',
   github:next.find(e=>e.id==='legacy-github')?.url || '',
   linkedin:next.find(e=>e.id==='legacy-linkedin')?.url || ''});
 return <div className="space-y-5"><p className="text-sm text-zinc-500">按需添加个人主页、作品展示或其他相关链接，名称由你决定，也可以留空。</p>
 {links.length===0&&<p className="py-4 text-sm text-zinc-400">尚未添加链接</p>}
 {links.map((link,index)=><div key={link.id} className="flex items-end gap-3"><div className="grid flex-1 gap-3 sm:grid-cols-[1fr_2fr]">
 <label className="space-y-2 text-sm">链接名称<Input value={link.label} placeholder="例如：作品展示" onChange={e=>update(links.map((v,i)=>i===index?{...v,label:e.target.value}:v))}/></label>
 <label className="space-y-2 text-sm">网址<Input value={link.url} placeholder="https://" onChange={e=>update(links.map((v,i)=>i===index?{...v,url:e.target.value}:v))}/></label></div>
 <Button variant="ghost" size="icon" aria-label={'删除链接'+(index+1)} onClick={()=>update(links.filter((_,i)=>i!==index))}><Trash2 size={16}/></Button></div>)}
 <Button variant="outline" disabled={links.length>=100} onClick={()=>update([...links,{id:crypto.randomUUID(),label:'',url:''}])}><Plus size={15} className="mr-2"/>添加链接</Button></div>;
}
const contactFields=[['phone','手机'],['email','邮箱'],['wechat','微信'],['location','所在地']] as const;
export function ContactEditor({personal,onChange}:{personal:Personal;onChange:(next:Personal)=>void}) {
 const [added,setAdded]=useState<string[]>(()=>contactFields.filter(([key])=>personal[key].trim()).map(([key])=>key));
 const shown=contactFields.filter(([key])=>personal[key].trim()||added.includes(key));
 return <div className="space-y-5"><p className="text-sm text-zinc-500">只添加你希望提供的联系方式，未填写的项目不会展示。</p>
 {shown.length===0&&<p className="py-4 text-sm text-zinc-400">尚未添加联系方式</p>}
 {shown.map(([key,label])=><div key={key} className="flex items-end gap-3"><label className="flex-1 space-y-2 text-sm">{label}<Input value={personal[key]} onChange={e=>onChange({...personal,[key]:e.target.value})}/></label><Button variant="ghost" size="icon" aria-label={'删除'+label} onClick={()=>{onChange({...personal,[key]:''});setAdded(added.filter(v=>v!==key));}}><Trash2 size={16}/></Button></div>)}
 <div className="flex flex-wrap gap-2">{contactFields.filter(([key])=>!shown.some(([v])=>v===key)).map(([key,label])=><Button key={key} variant="outline" size="sm" onClick={()=>setAdded([...added,key])}><Plus size={14} className="mr-1"/>添加{label}</Button>)}</div></div>;
}
