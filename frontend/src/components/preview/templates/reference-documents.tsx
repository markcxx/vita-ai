import type { CSSProperties, ReactNode } from 'react';
import { BookOpen, BriefcaseBusiness, CalendarDays, Code2, GraduationCap, Mail, MapPin, Phone, UserRound, Award, Languages, Link, ScanLine } from 'lucide-react';
import type { GenericSectionItem, PersonalInfoContent, Resume, ResumeSection } from '@/types/resume';
import { referenceTheme } from '@/lib/reference-templates';
import { AvatarImage } from '../avatar-image';
import { QrCodesPreview } from '../qr-codes-preview';
import { isSectionEmpty, md } from '../utils';

export const DOCUMENT_TEMPLATE_IDS = ['folio-ribbon-blue', 'folio-blueprint', 'folio-skyline', 'folio-ember', 'folio-mesh', 'folio-compass'] as const;
export const isDocumentTemplate = (template: string) => (DOCUMENT_TEMPLATE_IDS as readonly string[]).includes(template);

type Field = { label: string; value?: string; icon?: typeof Mail };
function Text({ value }: { value: unknown }) {
  return <div style={{ overflowWrap: 'anywhere' }} dangerouslySetInnerHTML={{ __html: md(value) }}/>;
}
function Mesh({ color }: { color: string }) {
  return <svg aria-hidden="true" viewBox="0 0 794 166" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} fill="none" stroke={color} strokeWidth=".65" opacity=".7">
    <path d="M0 44L108 8L174 35L145 86L200 109L258 163M0 92L39 111L11 156L95 150L108 8L145 86L39 111L0 44M39 111L95 150L145 86L200 109L174 35M0 166L11 156L0 129M200 109L221 67L235 136L258 163M326 26L386 3L410 13L410 46L437 41L451 78L414 93L369 84L346 60Z M326 26L377 47L386 3L385 68L410 46L414 93L377 47L369 84L346 60L385 68L437 41L451 78L385 68L414 93M491 0L511 22L651 18L700 128L574 113L511 22L564 0M651 18L655 0M574 113L625 158M700 128L749 157M700 128L753 28L794 107L700 128L685 0M753 28L765 0L782 23M794 107L794 124M700 128L688 161"/>
  </svg>;
}
function Compass({ color }: { color: string }) {
  return <svg aria-hidden="true" viewBox="0 0 150 145" style={{ position: 'absolute', width: 146, height: 140, right: -8, top: 5, color, opacity: .9 }}>
    <g transform="rotate(19 103 47)" fill="currentColor">
      <path d="M98 11L103 0L108 11V26H98Z M98 63H108L109 123L103 143L97 123Z M86 41V51L22 57L0 51L21 46Z M121 41H141L150 46L141 51H121Z"/>
      <circle cx="103" cy="46" r="17" fill="white" stroke="currentColor" strokeWidth="8"/>
      <path d="M67 42A37 37 0 0 0 108 82" fill="none" stroke="currentColor" strokeWidth="4"/>
    </g>
  </svg>;
}
function Cube({ color }: { color: string }) {
  return <svg aria-hidden="true" viewBox="0 0 40 44" style={{ position: 'absolute', width: 38, height: 42, left: -24, bottom: -7 }} fill={color}><path d="M20 0L40 11V33L20 44L0 33V11Z"/><path d="M0 11L20 22L40 11L20 0Z" fill="white" opacity=".22"/><path d="M20 22V44L0 33V11Z" fill="black" opacity=".13"/></svg>;
}
function SectionIcon({ type, size = 20 }: { type: string; size?: number }) {
  const Icon = ({ education: BookOpen, work_experience: BriefcaseBusiness, internship: BriefcaseBusiness, campus: GraduationCap, skills: Code2, certifications: Award, languages: Languages, projects: Code2, personal_info: UserRound, qr_codes: ScanLine } as Record<string, typeof BookOpen>)[type] || GraduationCap;
  return <Icon size={size} strokeWidth={1.5} aria-hidden="true" style={{ flexShrink: 0 }}/>;
}

/** Six document layouts, sharing editable section data with the normal resume editor. */
export function DocumentReferenceTemplate({ resume }: { resume: Resume }) {
  const variant = resume.template;
  const ribbon = variant === 'folio-ribbon-blue';
  const blue = variant === 'folio-blueprint';
  const sky = variant === 'folio-skyline';
  const ember = variant === 'folio-ember';
  const mesh = variant === 'folio-mesh';
  const compass = variant === 'folio-compass';
  const decorative = mesh || compass;
  const defaults = referenceTheme(variant);
  const theme = { ...defaults, ...resume.themeConfig, margin: { ...defaults.margin, ...resume.themeConfig?.margin } };
  const color = /^#[0-9a-f]{6}$/i.test(theme.accentColor) ? theme.accentColor : defaults.accentColor;
  const tint = `color-mix(in srgb, ${color} ${blue ? 12 : 10}%, white)`;
  const zh = resume.language !== 'en';
  const piSection = resume.sections.find(s => s.visible && s.type === 'personal_info');
  const pi = (piSection?.content || {}) as PersonalInfoContent;
  const sections = resume.sections.filter(s => s.visible && s.type !== 'personal_info' && !isSectionEmpty(s)).sort((a, b) => a.sortOrder - b.sortOrder);
  const school = sections.find(s => s.type === 'education')?.content.items?.[0];
  const label = (cn: string, en: string) => zh ? cn : en;
  const fields: Field[] = [
    ...(ribbon || blue ? [{ label: label('姓名', 'Name'), value: pi.fullName, icon: UserRound }] : []),
    { label: label('年龄', 'Age'), value: pi.age, icon: CalendarDays },
    { label: label('性别', 'Gender'), value: pi.gender, icon: UserRound },
    { label: label('籍贯', 'Hometown'), value: pi.hometown, icon: MapPin },
    { label: label('工作年限', 'Experience'), value: pi.yearsOfExperience, icon: BriefcaseBusiness },
    ...(ribbon ? [{ label: label('求职岗位', 'Target role'), value: pi.jobTitle, icon: BriefcaseBusiness }] : []),
    { label: label('电话', 'Phone'), value: pi.phone, icon: Phone },
    { label: label('邮箱', 'Email'), value: pi.email, icon: Mail },
    { label: label('所在地', 'Location'), value: pi.location, icon: MapPin },
    { label: label('微信', 'WeChat'), value: pi.wechat, icon: UserRound },
    { label: label('政治面貌', 'Political affiliation'), value: pi.politicalStatus },
    { label: label('民族', 'Ethnicity'), value: pi.ethnicity },
    { label: label('婚姻状况', 'Marital status'), value: pi.maritalStatus },
    ...(!decorative ? [{ label: label('学历', 'Degree'), value: pi.educationLevel }] : []),
    { label: label('个人主页', 'Website'), value: pi.website, icon: Link },
    { label: 'GitHub', value: pi.github, icon: Link },
    { label: 'LinkedIn', value: pi.linkedin, icon: Link },
    ...(pi.customLinks || []).map(link => ({ label: link.label, value: link.url, icon: Link })),
  ].filter(field => field.value?.trim());
  const bio: Field[] = [
    { label: label('学历', 'Degree'), value: pi.educationLevel || school?.degree },
    { label: label('学校', 'School'), value: school?.institution },
    { label: label('专业', 'Major'), value: school?.field },
    { label: label('性别', 'Gender'), value: pi.gender },
  ].filter(field => field.value);
  const renderFields = (values: Field[], icons = false, inline = false) => <div style={{ display: inline ? 'flex' : 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', flexWrap: 'wrap', gap: decorative ? '10px 28px' : '5px 24px', minWidth: 0 }}>
    {values.map((field, i) => { const Icon = field.icon || UserRound; return <div key={`${field.label}-${i}`} style={{ display: 'flex', alignItems: 'baseline', gap: 7, minWidth: 0, overflowWrap: 'anywhere' }}>
      {icons && <Icon size={14} aria-hidden="true" style={{ color, alignSelf: 'center', flexShrink: 0 }}/>}<span style={{ flexShrink: 0, fontWeight: inline ? 600 : 400 }}>{field.label}：</span><span>{field.value}</span>
    </div>; })}
  </div>;
  const avatar = (size: number, framed = false) => pi.avatar ? <div style={{ flexShrink: 0, position: 'relative', width: size, marginRight: decorative ? 8 : 0 }}>
    <AvatarImage src={pi.avatar} size={size} avatarStyle={theme.avatarStyle} style={{ display: 'block', border: framed ? `1px solid ${color}` : undefined, background: 'white', boxShadow: mesh ? `-9px 6px 0 ${color}99` : undefined }}/>
    {compass && <Cube color={color}/>}
  </div> : null;
  const heading = (title: string, type: string) => <h2 style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, fontSize: decorative ? '1.03em' : '1.16em', fontWeight: 700, lineHeight: 1.65, margin: `0 0 ${decorative ? 10 : 12}px`, color: ribbon || blue ? 'white' : color, background: blue || sky ? tint : undefined, borderBottom: ribbon || ember ? `1px solid ${color}` : undefined, borderLeft: sky ? `3px solid ${color}` : undefined, padding: ember ? '0 0 5px' : sky ? '3px 14px' : 0, breakAfter: 'avoid' }}>
    {ribbon ? <><span style={{ position: 'relative', padding: '0 22px', background: color }}><span aria-hidden="true" style={{ position: 'absolute', bottom: -8, left: 0, width: 15, height: 8, background: color, clipPath: 'polygon(0 0,100% 0,100% 100%)', filter: 'brightness(.65)' }}/>{title}</span><svg aria-hidden="true" width="40" height="26" viewBox="0 0 40 26" preserveAspectRatio="none" style={{ marginLeft: -10, height: '1.65em' }}><path d="M0 0H7L33 26H0Z M10 0H14L40 26H36Z" fill={color}/></svg></> : blue ? <span style={{ padding: '2px 19px', background: color }}>{title}</span> : decorative ? <><svg aria-hidden="true" width="22" height="22" viewBox="0 0 22 22" style={{ marginRight: -7, color, alignSelf: 'flex-start' }} fill="currentColor">{mesh ? <><path d="M1 13H4V21H1ZM5 8H8V21H5ZM9 11H12V21H9ZM13 16H17V21H13Z" opacity=".7"/><path d="M0 21H22" stroke="currentColor"/></> : <><path d="M0 0H10L0 10ZM11 0H22L0 22V15ZM13 8H22L6 22V16Z"/><path d="M4 3L11 0L0 13Z" fill="white" opacity=".45"/></>}</svg><span style={{ borderBottom: mesh ? `1px solid ${color}66` : undefined }}>{title}</span></> : <>{ember && <SectionIcon type={type}/>}<span>{title}</span></>}
  </h2>;
  const block = (title: string, type: string, content: ReactNode, id: string) => <section key={id} data-section data-section-id={id} style={{ position: 'relative', marginBottom: theme.sectionSpacing }}>{heading(title, type)}<div style={{ paddingLeft: ribbon ? 20 : decorative ? 10 : blue ? 9 : 0, paddingRight: ribbon ? 10 : blue ? 9 : 0 }}>{content}</div></section>;
  const dateOf = (item: GenericSectionItem) => item.startDate ? `${item.startDate} ${decorative ? '～' : '-'} ${item.current ? label('至今', 'Present') : item.endDate || ''}` : item.date || '';
  const body = (section: ResumeSection) => {
    const content = section.content;
    if (section.type === 'summary') return <Text value={content.text}/>;
    if (section.type === 'skills') return <div>{(content.categories || []).map(cat => <div key={cat.id} style={{ marginBottom: 7 }}><strong>{cat.name}{cat.name ? '：' : ''}</strong>{cat.skills.join(' · ')}</div>)}</div>;
    if (section.type === 'qr_codes') return content._qrSvgs ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>{Object.entries(content._qrSvgs as Record<string,string>).map(([id, svg]) => <div key={id}><div dangerouslySetInnerHTML={{ __html: svg }}/><div>{content.items?.find(item => item.id === id)?.label}</div></div>)}</div> : <QrCodesPreview items={(content.items || []).filter(item => item.url).map(item => ({ id: item.id, label: item.label || '', url: item.url! }))}/>;
    return (content.items || []).map(item => {
      const name = item.institution || item.company || item.name || item.title || item.language || item.label;
      const role = item.position || [item.field, item.degree].filter(Boolean).join(' · ') || item.subtitle || item.issuer || item.proficiency;
      const date = dateOf(item);
      return <div key={item.id} data-resume-entry style={{ marginBottom: decorative ? 16 : 17, breakInside: 'avoid', overflowWrap: 'anywhere' }}>
        {decorative ? <><div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><strong>{name}</strong><span style={{ flexShrink: 0 }}>{date}</span></div>{role && <div style={{ marginTop: 3 }}>{role}</div>}</> : <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.7fr) minmax(0,1fr)', gap: 12, alignItems: 'baseline', marginBottom: 6 }}><span style={{ fontWeight: ribbon || ember ? 400 : 700 }}>{date}</span><strong style={{ textAlign: 'center' }}>{name}</strong><strong style={{ textAlign: 'right' }}>{role}</strong></div>}
        {item.location && <div>{item.location}</div>}
        {item.gpa && <div style={{ marginTop: 5 }}><strong>{label('专业成绩', 'GPA')}：</strong>{item.gpa}</div>}
        {item.description && <div style={{ marginTop: decorative ? 12 : 5 }}><Text value={item.description}/></div>}
        {!!item.highlights?.length && <ul style={{ paddingLeft: 18, margin: '5px 0 0', listStyleType: 'disc' }}>{item.highlights.map((highlight, i) => <li key={i} style={{ marginBottom: decorative ? 7 : 2 }}><Text value={highlight}/></li>)}</ul>}
        {!!item.technologies?.length && <div style={{ marginTop: 5 }}>{item.technologies.join(' · ')}</div>}
        {item.url && <div style={{ marginTop: 3 }}>{item.url}</div>}{item.repoUrl && <div>{item.repoUrl}</div>}{item.stars !== undefined && <div>★ {item.stars}</div>}
      </div>;
    });
  };
  const textSize = theme.fontSize === 'small' ? 11 : theme.fontSize === 'large' ? 15 : decorative ? 12 : 13;
  const root: CSSProperties = { width: '100%', minHeight: 1123, position: 'relative', boxSizing: 'border-box', background: '#fff', color: theme.primaryColor, fontFamily: `${theme.fontFamily}, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif`, fontSize: textSize, lineHeight: theme.lineSpacing };
  const margins = { paddingLeft: theme.margin.left, paddingRight: theme.margin.right };
  const intent = piSection && pi.jobTitle ? block(label('求职意向', 'Target role'), 'work_experience', <div>{label('求职岗位：', '')}{pi.jobTitle}</div>, 'target-role') : null;
  return <div data-reference-template={variant} data-document-template={variant} style={root}>
    {ribbon ? <header style={{ paddingTop: theme.margin.top, breakInside: 'avoid' }}><div style={{ ...margins, display: 'flex', alignItems: 'center', gap: 16, minHeight: 59, paddingBottom: 14, color }}><div style={{ fontSize: 36, fontWeight: 400, lineHeight: 1.2 }}>{label('个人简历', 'RESUME')}</div><div style={{ borderLeft: `2px solid ${color}`, paddingLeft: 14, minWidth: 0 }}><div style={{ fontSize: 13 }}>{pi.jobTitle || resume.title}</div><div style={{ fontSize: 23, lineHeight: 1.4 }}>Personal resume</div></div><div aria-hidden="true" style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>{[GraduationCap, BriefcaseBusiness].map((Icon, i) => <span key={i} style={{ width: 38, height: 38, display: 'grid', placeItems: 'center', background: '#c19b60', color: '#fff', borderRadius: '50%' }}><Icon size={23} strokeWidth={1.4}/></span>)}</div></div><div aria-hidden="true" style={{ height: 17, position: 'relative', background: 'linear-gradient(to bottom, transparent 5px,#bd9b65 5px)' }}><div style={{ width: '64%', height: 17, background: color, clipPath: 'polygon(0 0,96% 0,100% 100%,0 100%)' }}/></div></header> : blue ? <header style={{ textAlign: 'center', padding: `${theme.margin.top}px ${theme.margin.right}px 15px`, breakInside: 'avoid' }}><div style={{ fontSize: 25, fontWeight: 400, color }}>{label('个人简历', 'RESUME')}</div>{pi.jobTitle && <div style={{ marginTop: 1, color: '#7b7b7b' }}>{pi.jobTitle}</div>}</header> : decorative ? <header style={{ position: 'relative', padding: `${theme.margin.top}px ${theme.margin.right}px 25px ${theme.margin.left}px`, minHeight: 155, boxSizing: 'border-box', borderBottom: `${mesh ? 5 : 2}px solid ${color}`, breakInside: 'avoid', margin: compass ? '0 20px' : 0 }}>
      {mesh ? <Mesh color={color}/> : <Compass color={color}/>}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 30, paddingRight: compass ? 90 : 0 }}>{avatar(78, true)}<div style={{ flex: 1, minWidth: 0 }}><h1 style={{ fontSize: 27, fontWeight: 700, margin: '8px 0 14px', lineHeight: 1.25, paddingBottom: compass ? 8 : 0, borderBottom: compass ? '1px solid #5d6170' : undefined, maxWidth: compass ? 245 : undefined, overflowWrap: 'anywhere' }}>{pi.fullName}</h1>{renderFields(bio, false, true)}</div></div>
    </header> : piSection ? <header style={{ ...margins, paddingTop: theme.margin.top + 10, paddingBottom: 28, display: 'flex', flexDirection: sky ? 'row' : 'row-reverse', gap: sky ? 65 : 34, alignItems: 'center', breakInside: 'avoid' }}>{avatar(sky ? 95 : 84)}<div style={{ flex: 1, minWidth: 0 }}><div style={{ display: 'flex', gap: 26, alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 16 }}><h1 style={{ margin: 0, fontSize: 27, letterSpacing: 3, fontWeight: ember ? 700 : 400, color: sky ? color : theme.primaryColor }}>{pi.fullName}</h1>{ember && pi.jobTitle && <span>{label('求职岗位：', '')}{pi.jobTitle}</span>}</div>{sky && pi.jobTitle && <div style={{ marginBottom: 16 }}>{label('求职意向：', '')}{pi.jobTitle}</div>}{renderFields(fields, true)}</div></header> : null}
    <main style={{ ...margins, paddingTop: decorative ? 18 : ribbon ? 8 : 0, paddingBottom: theme.margin.bottom }}>
      {piSection && (ribbon || blue) && block(piSection.title || label('基本信息', 'Personal details'), 'personal_info', <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}><div style={{ flex: 1, minWidth: 0 }}>{renderFields(fields)}</div>{avatar(ribbon ? 78 : 72)}</div>, piSection.id)}
      {decorative && piSection && fields.length > 0 && block(piSection.title || label('基本信息', 'Personal details'), 'personal_info', renderFields(fields.filter(field => field.label !== label('性别', 'Gender')), false, true), piSection.id)}
      {(blue || decorative) && intent}
      {sections.map(section => block(section.title, section.type, body(section), section.id))}
    </main>
    {compass && <svg aria-hidden="true" viewBox="0 0 100 70" style={{ position: 'absolute', left: 0, bottom: 140, width: 115, height: 80, opacity: .09, pointerEvents: 'none' }} stroke={color} strokeWidth="7" fill="none"><path d="M-20 25Q15-5 50 25T120 25M-20 65Q15 35 50 65T120 65"/></svg>}
  </div>;
}
