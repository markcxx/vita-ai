'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { MonthPicker } from '@/components/ui/month-picker';
import { AppSelect } from '@/components/ui/app-select';
import { Checkbox } from '@/components/ui/checkbox';
import { ContactEditor, LinksEditor } from './optional-info-editor';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { CandidateProfileData } from '@/types/candidate-profile';

const splitList = (value: string) => value.split(/[\n,，、]+/).map(v => v.trim()).filter(Boolean);
type ProfileSetter = Dispatch<SetStateAction<CandidateProfileData>>;
type FieldSpec<T> = { key: keyof T; label: string; kind?: 'text' | 'paragraph' | 'list' };

function Field({ label, value, onChange, multiline = false }: {
  label: string; value: string; onChange: (value: string) => void; multiline?: boolean;
}) {
  return <label className={`block space-y-2 ${multiline ? 'sm:col-span-2' : ''}`}>
    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{label}</span>
    {multiline ? <Textarea rows={5} value={value} onChange={e => onChange(e.target.value)} />
      : <Input value={value} onChange={e => onChange(e.target.value)} />}
  </label>;
}

function AchievementsField({value,onChange}:{value:string[];onChange:(values:string[])=>void}) {
 const [text,setText]=useState(()=>value.join('\n'));
 return <label className="block space-y-2 sm:col-span-2"><span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">成果与亮点（每行一条）</span><Textarea className="min-h-40 resize-y" rows={6} value={text} onChange={e=>{setText(e.target.value);onChange(e.target.value.split('\n').map(v=>v.trim()).filter(Boolean));}} placeholder="每行记录一条成果，可以完整描述你的行动和结果。"/></label>;
}

function EntryForm<T extends { id: string }>({ item, fields, update, remove }: {
  item: T; fields: FieldSpec<T>[]; update: (next: T) => void; remove: () => void;
}) {
  return <div className="space-y-6">
    <div className="grid gap-5 sm:grid-cols-2">{fields.map(({ key, label, kind }) => {
      const value = item[key];
      if(key==='startDate'||key==='endDate'||key==='date') return <MonthPicker key={String(key)} label={label} value={String(value??'')} disabled={key==='endDate' && 'current' in item && item.current===true} onChange={text=>update({...item,[key]:text})}/>;
      if(key==='highlights') return <AchievementsField key={item.id+'-highlights'} value={Array.isArray(value)?value:[]} onChange={values=>update({...item,[key]:values})}/>;
      return <Field key={String(key)} label={label} value={Array.isArray(value) ? value.join('、') : String(value ?? '')}
        multiline={kind === 'paragraph'} onChange={text => update({ ...item, [key]: kind === 'list' ? splitList(text) : text })} />;
    })}</div>
    <Button variant="ghost" className="gap-2 text-red-500 hover:text-red-600" onClick={remove}><Trash2 size={15}/>删除此条内容</Button>
  </div>;
}

export function profileEditorTitle(section: string, id?: string, profile?: CandidateProfileData) {
  if (section === 'basic') return ({ identity:'个人名片', contact:'联系方式', summary:'关于我', links:'个人链接' }[id || 'identity'] || '个人名片');
  if (section === 'skills') {
    if (id?.startsWith('preferences')) return '求职意向';
    return id ? '技能分类' : '个人优势';
  }
  if (section === 'certificates') return profile?.languages.some(e => e.id === id) ? '语言能力' : '证书';
  return ({experience:'工作与实习经历',education:'教育经历',projects:'项目经历'}[section] || '个人资料');
}

export function ProfileEditor({ section, profile: p, setProfile, focusId: id }: {
  focusId?: string; section: string; profile: CandidateProfileData; setProfile: ProfileSetter;
}) {
  if (section === 'basic') {
    const onPersonalChange = (personalInfo: CandidateProfileData['personalInfo']) => setProfile({...p,personalInfo});
    if(id==='links') return <LinksEditor personal={p.personalInfo} onChange={onPersonalChange}/>;
    if(id==='contact') return <ContactEditor personal={p.personalInfo} onChange={onPersonalChange}/>;
    const fields: ['fullName' | 'jobTitle', string][] = [['fullName','姓名'],['jobTitle','求职方向']];
    return id === 'summary'
      ? <div className="space-y-4"><Field label="个人简介（选填）" multiline value={p.summary} onChange={summary => setProfile({...p,summary})}/><Button variant="ghost" disabled={!p.summary} onClick={()=>setProfile({...p,summary:''})}>清空个人简介</Button></div>
      : <div className="grid gap-5 sm:grid-cols-2">{fields.map(([key,label]) => <Field key={key} label={label} value={p.personalInfo[key]} onChange={value => setProfile({...p,personalInfo:{...p.personalInfo,[key]:value}})}/>)}</div>;
  }
  if (section === 'skills' && id?.startsWith('preferences')) {
    const fields = [['targetRoles','目标岗位'],['targetIndustries','目标行业'],['preferredLocations','意向城市']] as const;
    const selected = id.includes(':') ? id.split(':')[1] : null;
    return <div className="space-y-6">{fields.filter(([key]) => !selected || selected === key).map(([key,label]) => <section key={key} className="space-y-3"><h3 className="text-sm font-medium">{label}（选填）</h3>{p.preferences[key].map((value,index)=><div key={index} className="flex items-center gap-2"><Input aria-label={label+(index+1)} value={value} onChange={e=>setProfile({...p,preferences:{...p.preferences,[key]:p.preferences[key].map((v,i)=>i===index?e.target.value:v)}})}/><Button variant="ghost" size="icon" aria-label={'删除'+label+(index+1)} onClick={()=>setProfile({...p,preferences:{...p.preferences,[key]:p.preferences[key].filter((_,i)=>i!==index)}})}><Trash2 size={15}/></Button></div>)}<Button variant="outline" size="sm" onClick={()=>setProfile({...p,preferences:{...p.preferences,[key]:[...p.preferences[key],'']}})}>添加{label}</Button></section>)}</div>;
  }
  if (section === 'experience') {
    const item = p.experiences.find(e => e.id === id);
    if (item) return <div className="space-y-5"><label className="flex items-center gap-3 whitespace-nowrap text-sm">经历类型<AppSelect label="经历类型" value={item.type} onValueChange={value => setProfile({...p,experiences:p.experiences.map(v => v.id===id?{...v,type:value as 'work'|'internship'}:v)})} options={[{value:'internship',label:'实习'},{value:'work',label:'工作'}]}/></label>
      <label className="flex items-center gap-2 text-sm"><Checkbox checked={item.current} onCheckedChange={checked => setProfile({...p,experiences:p.experiences.map(v=>v.id===id?{...v,current:checked===true}:v)})}/>目前仍在职</label>
      <EntryForm item={item} fields={[{key:'company',label:'单位名称'},{key:'position',label:'岗位'},{key:'location',label:'地点'},{key:'startDate',label:'开始时间'},{key:'endDate',label:'结束时间（在职时显示至今）'},{key:'description',label:'主要职责',kind:'paragraph'},{key:'highlights',label:'工作成果（多个用顿号分隔）',kind:'list'}]} update={next=>setProfile({...p,experiences:p.experiences.map(v=>v.id===id?next:v)})} remove={()=>setProfile({...p,experiences:p.experiences.filter(v=>v.id!==id)})}/></div>;
  }
  if (section === 'education') {
    const item=p.education.find(e=>e.id===id);
    if(item)return <EntryForm item={item} fields={[{key:'institution',label:'学校'},{key:'degree',label:'学历'},{key:'field',label:'专业'},{key:'gpa',label:'GPA'},{key:'startDate',label:'开始时间'},{key:'endDate',label:'结束时间'},{key:'description',label:'课程、学习与实践',kind:'paragraph'}]} update={next=>setProfile({...p,education:p.education.map(v=>v.id===id?next:v)})} remove={()=>setProfile({...p,education:p.education.filter(v=>v.id!==id)})}/>;
  }
  if (section === 'projects') {
    const item=p.projects.find(e=>e.id===id);
    if(item)return <EntryForm item={item} fields={[{key:'name',label:'项目名称'},{key:'role',label:'承担角色'},{key:'startDate',label:'开始时间'},{key:'endDate',label:'结束时间'},{key:'url',label:'项目链接'},{key:'technologies',label:'工具与技术（多个用顿号分隔）',kind:'list'},{key:'description',label:'项目背景与职责',kind:'paragraph'},{key:'highlights',label:'项目成果（多个用顿号分隔）',kind:'list'}]} update={next=>setProfile({...p,projects:p.projects.map(v=>v.id===id?next:v)})} remove={()=>setProfile({...p,projects:p.projects.filter(v=>v.id!==id)})}/>;
  }
  if (section === 'skills') {
    // The overview's advantages card owns all skill groups; a list row owns only its ID.
    const groups=p.skills.filter(e=>!id||e.id===id);
    if(groups.length || !id)return <div className="space-y-8">{groups.map(item=><EntryForm key={item.id} item={item} fields={[{key:'name',label:'技能分类'},{key:'skills',label:'技能（多个用顿号分隔）',kind:'list'}]} update={next=>setProfile({...p,skills:p.skills.map(v=>v.id===item.id?next:v)})} remove={()=>setProfile({...p,skills:p.skills.filter(v=>v.id!==item.id)})}/>) }{!id&&<Button variant="outline" onClick={()=>setProfile({...p,skills:[...p.skills,{id:crypto.randomUUID(),name:'',skills:[]}]})}>添加优势分类</Button>}</div>;
  }
  if (section === 'certificates') {
    const cert=p.certifications.find(e=>e.id===id);
    if(cert)return <EntryForm item={cert} fields={[{key:'name',label:'证书名称'},{key:'issuer',label:'颁发机构'},{key:'date',label:'获得时间'}]} update={next=>setProfile({...p,certifications:p.certifications.map(v=>v.id===id?next:v)})} remove={()=>setProfile({...p,certifications:p.certifications.filter(v=>v.id!==id)})}/>;
    const lang=p.languages.find(e=>e.id===id);
    if(lang)return <EntryForm item={lang} fields={[{key:'language',label:'语言'},{key:'proficiency',label:'熟练度'},{key:'description',label:'使用经验与说明',kind:'paragraph'}]} update={next=>setProfile({...p,languages:p.languages.map(v=>v.id===id?next:v)})} remove={()=>setProfile({...p,languages:p.languages.filter(v=>v.id!==id)})}/>;
  }
  return <p className="text-sm text-zinc-500">已从本次草稿中移除此条内容，点击保存生效，或取消撤销。</p>;
}
