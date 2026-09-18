'use client';
import Image from 'next/image';
import { profileLinks } from './optional-info-editor';
import { useState, type ReactNode } from 'react';
import { UserRound, Phone, FileText, BriefcaseBusiness, ChartNoAxesColumnIncreasing, Link, Pencil, Plus, MapPin, type LucideIcon } from 'lucide-react';
import type { CandidateProfileData } from '@/types/candidate-profile';
import styles from './profile.module.css';
export const PROFILE_TABS = [['basic','基础信息'],['education','教育经历'],['experience','工作与实习'],['projects','项目与校园经历'],['skills','技能与偏好'],['certificates','证书与语言']] as const;
function Card({title,icon:Icon,children,onEdit,tinted=false}:{title:string;icon:LucideIcon;children:ReactNode;onEdit:()=>void;tinted?:boolean}) {
 return <section className={`${styles.card} ${tinted?styles.tinted:''}`}><header><h3><Icon size={20}/>{title}</h3><button onClick={onEdit} aria-label={'编辑'+title}><Pencil size={14}/>编辑</button></header>{children}</section>;
}
function Rows({values,optional=false}:{values:[string,string][];optional?:boolean}) {if(optional)values=values.filter(([,v])=>v.trim());if(!values.length)return <p className={styles.empty}>暂无内容，可按需添加。</p>;return <dl className={styles.rows}>{values.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||'未填写'}</dd></div>)}</dl>;}
function Tags({items}:{items:string[]}) {return <div className={styles.tags}>{items.map((text,i)=><span key={i}>{text}</span>)}</div>;}
function SafeLink({value,label}:{value:string;label:string}) {let href='';try {const u=new URL(value);if(['http:','https:'].includes(u.protocol))href=u.href;} catch {}return <div className={styles.link}><span>{label}</span>{href?<a href={href} target="_blank" rel="noopener noreferrer">{value} ↗</a>:<span>{value||'未填写'}</span>}</div>;}
export type ProfileAddKind = 'experience' | 'education' | 'projects' | 'skills' | 'certifications' | 'languages';
function Edit({onClick,label}:{onClick:()=>void;label:string}) {return <button className={styles.editAction} onClick={onClick} aria-label={'编辑'+label}><Pencil size={14}/>编辑</button>;}
function Add({onClick,label}:{onClick:()=>void;label:string}) {return <button className={styles.addAction} onClick={onClick}><Plus size={15}/>{label}</button>;}
function Period({start,end,current=false}:{start:string;end:string;current?:boolean}) {return <span className={styles.period}>{start||'开始时间待填'} — {current?'至今':end||'结束时间待填'}</span>;}
function Highlights({items}:{items:string[]}) {return items.length ? <ul className={styles.bullets}>{items.map((h,i)=><li key={i}>{h}</li>)}</ul> : null;}
function Empty({children}:{children:ReactNode}) {return <p className={styles.listEmpty}>{children}</p>;}
export function ProfileOverview({profile:p,section,onEdit,onAdd}:{profile:CandidateProfileData;section:string;onEdit:(section:string,id?:string)=>void;onAdd:(kind:ProfileAddKind)=>void}) {
 const [experienceFilter,setExperienceFilter]=useState<'all'|'work'|'internship'>('all');
 const edit=(key=section,id?:string)=>()=>onEdit(key,id);const personal=p.personalInfo;const education=p.education[0];
 if(section==='basic')return <div className={styles.basicGrid}>
 <Card title="个人名片" icon={UserRound} onEdit={edit('basic', 'identity')}><div className={styles.identity}><Image src="/images/profile/default-avatar.png" width={96} height={96} alt="默认卡通头像"/><div><h4>{personal.fullName||'填写你的姓名'}</h4><p className={styles.caption}>求职方向</p><strong>{personal.jobTitle||'未填写'}</strong></div></div><div className={styles.education}>{education?[education.degree,education.field,education.institution].filter(Boolean).join(' · '):'完善教育经历，展示你的学习背景'}</div></Card>
 <Card title="联系方式" icon={Phone} onEdit={edit('basic', 'contact')}><Rows values={[["手机",personal.phone],["邮箱",personal.email],["微信",personal.wechat],["所在地",personal.location]]} optional/></Card>
 <Card title="关于我" icon={FileText} onEdit={edit('basic', 'summary')} tinted><p className={styles.description}>{p.summary||'记录你的经历、兴趣与特点，让别人更了解你。'}</p></Card>
 <Card title="求职意向" icon={BriefcaseBusiness} onEdit={edit('skills', 'preferences')}><Rows values={[["目标岗位",p.preferences.targetRoles.filter(v=>v.trim()).join('、')],["目标行业",p.preferences.targetIndustries.join('、')],["意向城市",p.preferences.preferredLocations.filter(v=>v.trim()).join('、')]]} optional/></Card>
 <Card title="个人优势" icon={ChartNoAxesColumnIncreasing} onEdit={edit('skills')}><div className={styles.strengthScroll} role="region" aria-label="个人优势内容" tabIndex={0}>{p.skills.length?p.skills.map(g=><div className={styles.strength} key={g.id}><strong>{g.name||'技能'}</strong>{g.skills.some(skill=>skill.trim())?<Tags items={g.skills.filter(skill=>skill.trim())}/>:<p>待补充</p>}</div>):<p className={styles.empty}>添加擅长的技能，展示你的个人优势。</p>}</div></Card>
 <Card title="个人链接" icon={Link} onEdit={edit('basic', 'links')}>{profileLinks(personal).filter(v=>v.label.trim()||v.url.trim()).length?profileLinks(personal).filter(v=>v.label.trim()||v.url.trim()).map(v=><SafeLink key={v.id} value={v.url} label={v.label||'个人链接'}/>):<p className={styles.empty}>暂无链接，可按需添加个人主页、作品展示等内容。</p>}</Card>
 </div>;
 if(section==='experience') {
  const entries=[...p.experiences].filter(e=>experienceFilter==='all'||e.type===experienceFilter).sort((a,b)=>Number(b.current)-Number(a.current)||b.startDate.localeCompare(a.startDate));
  return <div className={styles.listSurface}>
   <div className={styles.listToolbar}><div className={styles.filters} aria-label="经历类型">{([['all','全部'],['work','工作'],['internship','实习']] as const).map(([key,label])=><button key={key} aria-pressed={experienceFilter===key} onClick={()=>setExperienceFilter(key)}>{label}</button>)}</div><Add label="添加经历" onClick={()=>onAdd('experience')}/></div>
   {entries.length ? <ol className={styles.timeline}>{entries.map(e=><li className={styles.timelineItem} key={e.id}>
    <div className={styles.timelineDate}><Period start={e.startDate} end={e.endDate} current={e.current}/></div>
    <article className={styles.timelineBody}><header className={styles.entryHeading}><div className={styles.entryTitle}><h3>{e.company||'未填写单位'}</h3><span>{e.position||'岗位待填写'}</span><span className={styles.kind}>{e.type==='work'?'工作':'实习'}</span></div><Edit label={e.company||'经历'} onClick={edit('experience',e.id)}/></header>
    {e.location&&<p className={styles.location}><MapPin size={13}/>{e.location}</p>}
    <div className={styles.experienceDetails}><div><h4>主要职责</h4><p className={styles.description}>{e.description||'补充你承担的工作与职责。'}</p></div>{e.highlights.length>0&&<div><h4>工作成果</h4><Highlights items={e.highlights}/></div>}</div></article>
   </li>)}</ol>:<Empty>{experienceFilter==='all'?'还没有工作或实习经历，添加你的第一段经历。':'该分类下暂无经历。'}</Empty>}
  </div>;
 }
 if(section==='education') return <div className={styles.listSurface}>
  <div className={styles.listToolbar}><span/><Add label="添加教育经历" onClick={()=>onAdd('education')}/></div>
  {p.education.length?p.education.map(e=><article className={styles.educationEntry} key={e.id}><div><Period start={e.startDate} end={e.endDate}/></div><div><header className={styles.entryHeading}><h3>{e.institution||'未填写学校'}</h3><Edit label={e.institution||'教育经历'} onClick={edit('education',e.id)}/></header><p className={styles.metadata}>{[e.degree,e.field,e.gpa&&'GPA：'+e.gpa].filter(Boolean).join(' · ')||'补充学历与专业'}</p><p className={styles.description}>{e.description||'补充学习经历、课程与实践。'}</p></div></article>):<Empty>还没有教育经历，添加学校和学习经历。</Empty>}
 </div>;
 if(section==='projects') return <div className={styles.listSurface}><div className={styles.listToolbar}><span/><Add label="添加项目" onClick={()=>onAdd('projects')}/></div>
  {p.projects.length?p.projects.map((e,index)=><article data-tone={index%4} className={styles.projectEntry} key={e.id}><header className={styles.entryHeading}><h3>{e.name||'未命名项目'}</h3><div className={styles.entryActions}><Period start={e.startDate} end={e.endDate}/><Edit label={e.name||'项目'} onClick={edit('projects',e.id)}/></div></header><p className={styles.metadata}>{e.role||'承担角色待填写'}</p><p className={styles.description}>{e.description||'补充项目背景和你的工作。'}</p><Highlights items={e.highlights}/>{e.technologies.length>0&&<Tags items={e.technologies}/ >}{e.url&&<SafeLink value={e.url} label="项目链接"/>}</article>):<Empty>课程、校园活动、志愿服务或工作项目，都可以记录在这里。</Empty>}
 </div>;
 if(section==='skills') return <div className={styles.listSurface}><div className={styles.listToolbar}><span/><Add label="添加技能分类" onClick={()=>onAdd('skills')}/></div>
  {p.skills.length?p.skills.map((e,index)=><div data-tone={index%4} className={styles.skillRow} key={e.id}><h3>{e.name||'未命名分类'}</h3><div>{e.skills.length?<Tags items={e.skills}/>:<span className={styles.metadata}>待补充技能</span>}</div><Edit label={e.name||'技能'} onClick={edit('skills',e.id)}/></div>):<Empty>添加你擅长的技能，按类别整理。</Empty>}
  <section className={styles.subsection}><h3>求职偏好</h3>{([['目标岗位',p.preferences.targetRoles,'targetRoles'],['目标行业',p.preferences.targetIndustries,'targetIndustries'],['意向城市',p.preferences.preferredLocations,'preferredLocations']] as const).map(([label,values,key],index)=><div data-tone={(index+1)%4} className={styles.preferenceRow} key={label}><span>{label}</span><p>{values.join('、')||'未填写'}</p><Edit label={label} onClick={edit('skills','preferences:'+key)}/></div>)}</section>
 </div>;
 if(section==='certificates') return <div className={styles.listSurface}>
  <section className={styles.subsection}><header className={styles.subheading}><h3>证书</h3><Add label="添加证书" onClick={()=>onAdd('certifications')}/></header>{p.certifications.length?p.certifications.map(e=><div className={styles.certificateRow} key={e.id}><div><h4>{e.name||'未命名证书'}</h4><p className={styles.metadata}>{e.issuer||'颁发机构待填写'}</p></div><span className={styles.period}>{e.date||'时间待填写'}</span><Edit label={e.name||'证书'} onClick={edit('certificates',e.id)}/></div>):<Empty>补充已获得的证书与资格。</Empty>}</section>
  <section className={styles.subsection}><header className={styles.subheading}><h3>语言</h3><Add label="添加语言" onClick={()=>onAdd('languages')}/></header>{p.languages.length?p.languages.map(e=><div className={styles.languageRow} key={e.id}><div><div className={styles.entryTitle}><h4>{e.language||'未填写语言'}</h4><span>{e.proficiency||'熟练度待填写'}</span></div>{e.description&&<p className={styles.metadata}>{e.description}</p>}</div><Edit label={e.language||'语言'} onClick={edit('certificates',e.id)}/></div>):<Empty>补充语言能力及使用经验。</Empty>}</section>
 </div>;
 return null;
}
