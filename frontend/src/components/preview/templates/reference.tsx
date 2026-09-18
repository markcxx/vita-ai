import type { CSSProperties, ReactNode } from 'react';
import type { EducationContent, PersonalInfoContent, Resume, ResumeSection, SummaryContent } from '@/types/resume';
import { isReferenceTemplate, referenceTheme } from '@/lib/reference-templates';
import { SCENE_TEMPLATES, SceneHeader, SceneSidebar, SceneHeading, SceneWave } from './reference-scenes';
import { AvatarImage } from '../avatar-image';
import { isSectionEmpty, md } from '../utils';
import { QrCodesPreview } from '../qr-codes-preview';

const paragraph: CSSProperties = { margin: '8px 0 0', overflowWrap: 'anywhere' };
function RichText({ text }: { text: unknown }) {
  return <div style={paragraph} dangerouslySetInnerHTML={{ __html: md(text) }} />;
}
function SectionBody({ section, resume, color, notebook }: { section: ResumeSection; resume: Resume; color: string; notebook: boolean }) {
  const c = section.content;
  if (section.type === 'summary') return <RichText text={(c as SummaryContent).text} />;
  if (section.type === 'skills') return <div>{(c.categories || []).map(cat => <div key={cat.id} style={{ marginBottom: 12 }}>
    <strong>{cat.name}</strong>
    <div style={{ marginTop: 5 }}>{cat.skills.join(' · ')}</div>
    {notebook && <div aria-hidden="true" style={{ height: 7, background: color, opacity: .65, marginTop: 8 }} />}
  </div>)}</div>;
  if (section.type === 'qr_codes' && c._qrSvgs) return <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>{Object.entries(c._qrSvgs as Record<string, string>).map(([id, svg]) => <div key={id}><div dangerouslySetInnerHTML={{ __html: svg }} /><div>{c.items?.find(item => item.id === id)?.label}</div></div>)}</div>;
  if (section.type === 'qr_codes') return <QrCodesPreview items={(c.items || []).filter(i => i.url).map(i => ({ id: i.id, label: i.label || '', url: i.url! }))} />;
  return <div>{(c.items || []).map(item => {
    const date = item.startDate ? `${item.startDate} ～ ${item.endDate || (item.current ? (resume.language === 'zh' ? '至今' : 'Present') : '')}` : item.date;
    return <div key={item.id} data-resume-entry style={{ marginBottom: 16, breakInside: 'avoid' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14 }}>
        <strong style={{ overflowWrap: 'anywhere' }}>{item.institution || item.company || item.name || item.title || item.language || item.label}</strong>
        {date && <span style={{ flexShrink: 0, fontSize: '.92em' }}>{date}</span>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span>{item.position || item.degree || item.subtitle || item.issuer || item.proficiency}</span>
        <span>{item.field || item.location}</span>
      </div>
      {item.gpa && <div>GPA: {item.gpa}</div>}
      {item.description && <RichText text={item.description} />}
      {!!item.technologies?.length && <div style={{ marginTop: 6 }}>{item.technologies.join(' · ')}</div>}
      {!!item.highlights?.length && <ul style={{ margin: '8px 0 0', paddingLeft: 18, listStyleType: 'disc' }}>
        {item.highlights.map((h, i) => <li key={i} style={{ marginBottom: 5 }}><RichText text={h} /></li>)}
      </ul>}
      {item.url && <div style={{ overflowWrap: 'anywhere', marginTop: 4 }}>{item.url}</div>}
      {item.repoUrl && <div style={{ overflowWrap: 'anywhere' }}>{item.repoUrl}</div>}
      {item.stars !== undefined && <div>★ {item.stars}</div>}
    </div>;
  })}</div>;
}

/** The same inline-styled document is used by preview and downloadable exports. */
export function ReferenceTemplate({ resume }: { resume: Resume }) {
  const variant = isReferenceTemplate(resume.template) ? resume.template : 'folio-banner';
  const theme = { ...referenceTheme(variant), ...resume.themeConfig };
  const color = /^#[0-9a-f]{6}$/i.test(theme.accentColor) ? theme.accentColor : referenceTheme(variant).accentColor;
  const light = `${color}66`;
  const piSection = resume.sections.find(s => s.type === 'personal_info' && s.visible);
  const pi = (piSection?.content || {}) as PersonalInfoContent;
  const education = resume.sections.find(s => s.type === 'education' && s.visible);
  const school = (education?.content as EducationContent | undefined)?.items?.[0];
  const notebook = variant === 'folio-notebook' || variant === 'folio-growth';
  const scene = SCENE_TEMPLATES.has(variant);
  const rightSidebar = variant === 'folio-bookmark' || variant === 'folio-breeze';
  const prism = variant === 'folio-prism';
  const botanical = variant === 'folio-botanical';
  const line = variant === 'folio-line';
  const aqua = variant === 'folio-aqua';
  const diamond = variant === 'folio-diamond';
  const floral = variant === 'folio-floral';
  const gear = variant === 'folio-gear';
  const sections = resume.sections.filter(s => s.visible && s.type !== 'personal_info' && !isSectionEmpty(s)).sort((a, b) => a.sortOrder - b.sortOrder);
  const heading = (title: string) => <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, color, fontSize: '1.05em', margin: '0 0 12px', fontWeight: 700, lineHeight: 1.5 }}>
    {scene ? <SceneHeading variant={variant} color={color} /> : floral ? <svg aria-hidden="true" width="16" height="20" viewBox="0 0 16 20" fill={color}><path d="M8 1C2 6 5 11 8 12C11 10 14 6 8 1ZM3 7C-1 11 1 15 5 14ZM13 7C17 11 15 15 11 14Z" /><path d="M8 9V19M4 12V17M12 12V17" stroke={color} fill="none" /></svg> : <span aria-hidden="true" style={{ display: 'inline-block', flexShrink: 0, width: botanical ? 8 : gear ? 16 : 12, height: botanical ? 24 : gear ? 16 : 12, background: gear ? 'transparent' : color, border: gear ? `1px solid ${color}` : undefined, borderRadius: diamond || gear ? '50%' : undefined, boxShadow: diamond ? `0 0 0 2px ${light}` : undefined, opacity: .9, clipPath: prism || notebook ? 'polygon(0 0,100% 0,0 100%)' : undefined }} />}{title}{['folio-cloud', 'folio-dots'].includes(variant) && <SceneWave color={color} />}
  </h2>;
  const block = (title: string, children: ReactNode, key: string) => <section key={key} data-section style={{ marginBottom: theme.sectionSpacing, position: 'relative' }}>{heading(title)}{children}</section>;
  const contacts = [ ['电话', pi.phone], ['邮箱', pi.email], ['现居地', pi.location], ['微信', pi.wechat], ['年龄', pi.age], ['政治面貌', pi.politicalStatus], ['民族', pi.ethnicity], ['籍贯', pi.hometown], ['婚姻状况', pi.maritalStatus], ['工作年限', pi.yearsOfExperience], ['网站', pi.website], ['LinkedIn', pi.linkedin], ['GitHub', pi.github], ...(pi.customLinks || []).map(link => [link.label, link.url]) ].filter(([, value]) => value);
  const info = piSection && contacts.length > 0 ? block(resume.language === 'zh' ? '基本信息' : 'Contact', <div style={{ display: 'flex', flexWrap: 'wrap', gap: notebook ? '3px 20px' : '10px 26px' }}>{contacts.map(([label, value]) => <div key={label} style={{ width: notebook ? '100%' : undefined, overflowWrap: 'anywhere' }}>{label}：{value}</div>)}</div>, 'contact') : null;
  const intent = pi.jobTitle ? block(resume.language === 'zh' ? '求职意向' : 'Target role', <div>{resume.language === 'zh' ? '求职岗位：' : ''}{pi.jobTitle}</div>, 'target') : null;
  const renderSection = (s: ResumeSection) => block(s.title, <SectionBody section={s} resume={resume} color={color} notebook={notebook} />, s.id);
  const sideTypes = new Set(['skills', 'summary', 'languages', 'certifications', 'qr_codes']);
  const bio = [['学历', pi.educationLevel || school?.degree], ['学校', school?.institution], ['专业', school?.field], ['性别', pi.gender]].filter(([, value]) => value);
  const schoolBadge = school?.institution ? <span style={{ color: '#345b68', fontSize: 11, letterSpacing: 1, background: '#ffffffee', padding: '6px 12px', borderRadius: '0 18px 18px 0', display: 'inline-block' }}>{school.institution}</span> : null;
  if (rightSidebar) return <div data-reference-template={variant} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 70%) minmax(0, 30%)', width: '100%', minHeight: 1123, background: '#fff', color: theme.primaryColor || '#171717', fontFamily: `${theme.fontFamily || 'Arial'}, "Microsoft YaHei", sans-serif`, fontSize: theme.fontSize === 'small' ? 11 : theme.fontSize === 'large' ? 15 : 12, lineHeight: theme.lineSpacing, border: variant === 'folio-breeze' ? `1px solid ${color}` : undefined, boxSizing: 'border-box' }}>
    <main style={{ minWidth: 0, padding: `${Math.max(20, theme.margin?.top ?? 20)}px 30px ${theme.margin?.bottom ?? 20}px 40px` }}>{intent}{sections.map(renderSection)}</main>
    <SceneSidebar variant={variant} color={color} pi={pi} bio={[...bio, ...contacts]} schoolBadge={schoolBadge} theme={theme} />
  </div>;
  if (gear) return <div data-reference-template={variant} style={{ display: 'grid', gridTemplateColumns: '30% minmax(0, 1fr)', width: '100%', minHeight: 1123, background: '#fff', color: theme.primaryColor || '#171717', fontFamily: `${theme.fontFamily || 'Arial'}, "Microsoft YaHei", sans-serif`, fontSize: theme.fontSize === 'small' ? 11 : theme.fontSize === 'large' ? 15 : 12, lineHeight: theme.lineSpacing }}>
    <aside style={{ position: 'relative', background: `color-mix(in srgb, ${color} 82%, white)`, overflow: 'hidden', padding: '44px 30px', boxSizing: 'border-box' }}>
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, color, pointerEvents: 'none' }}>
        {[{ left: 55, top: -42, size: 110 }, { left: 12, top: 182, size: 78 }].map(({ left, top, size }) => <svg key={top} viewBox="0 0 100 100" style={{ position: 'absolute', left, top, width: size, height: size, opacity: .55 }} fill="none" stroke="currentColor">
          <circle cx="50" cy="50" r="30" strokeWidth="12" />
          {Array.from({ length: 12 }, (_, i) => <path key={i} d="M50 10V20" strokeWidth="12" transform={`rotate(${i * 30} 50 50)`} />)}
        </svg>)}
        <span style={{ position: 'absolute', left: 80, top: 82, width: 38, height: 38, border: '4px solid currentColor', borderRadius: '50%', opacity: .5 }} />
        <svg viewBox="0 0 24 24" style={{ position: 'absolute', right: 38, top: 140, width: 22, opacity: .7 }}><path d="M4 3L20 8L8 21Z" fill="none" stroke="currentColor" strokeWidth="3" /></svg>
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{ marginLeft: -30, marginBottom: 30 }}>{schoolBadge}</div>
        {pi.avatar && <AvatarImage src={pi.avatar} size={116} avatarStyle={theme.avatarStyle} style={{ display: 'block', background: '#fff', margin: '0 auto 30px', border: '2px solid white' }} />}
        <h1 style={{ fontSize: 28, lineHeight: 1.4, margin: '0 0 22px', textAlign: 'center', fontWeight: 700 }}>{pi.fullName || '你的姓名'}</h1>
        {[...bio, ...contacts].map(([label, value]) => <div key={label} style={{ marginBottom: 7, overflowWrap: 'anywhere' }}><b>{label}：</b>{value}</div>)}
      </div>
    </aside>
    <main style={{ padding: `${Math.max(22, theme.margin?.top ?? 22)}px ${Math.max(28, theme.margin?.right ?? 28)}px ${theme.margin?.bottom ?? 20}px 40px`, minWidth: 0 }}>{intent}{sections.map(renderSection)}</main>
  </div>;
  return <div data-reference-template={variant} style={{ boxSizing: 'border-box', width: '100%', minHeight: 1123, background: '#fff', color: theme.primaryColor || '#171717', fontFamily: `${theme.fontFamily || 'Arial'}, "Microsoft YaHei", sans-serif`, fontSize: theme.fontSize === 'small' ? 11 : theme.fontSize === 'large' ? 15 : 12, lineHeight: theme.lineSpacing, position: 'relative', overflow: 'hidden' }}>
    {scene ? <SceneHeader variant={variant} color={color} pi={pi} bio={bio} schoolBadge={schoolBadge} theme={theme} /> : diamond || floral ? <header style={{ position: 'relative', minHeight: diamond ? 182 : 140, boxSizing: 'border-box', padding: diamond ? '48px 146px 32px' : '26px 28px 20px', borderBottom: `${diamond ? 4 : 1}px solid ${color}`, overflow: 'hidden' }}>
      {diamond && <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {[{ left: '78%', top: -10, size: 88 }, { left: '6%', top: 135, size: 80 }, { left: '93%', top: 128, size: 74 }].map(({ left, top, size }) => <div key={left} style={{ position: 'absolute', left, top, width: size, height: size, background: color, opacity: .95, transform: 'rotate(45deg)' }} />)}
      </div>}
      <div style={{ position: 'absolute', top: 20, ...(diamond ? { left: 0 } : { right: 0 }), maxWidth: diamond ? 185 : 170 }}>{schoolBadge}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, position: 'relative' }}>
        {pi.avatar && <div style={diamond ? { position: 'absolute', right: -105, top: -20, padding: 5, border: `1px solid ${color}`, background: '#ffffff66' } : { flexShrink: 0 }}>
          <AvatarImage src={pi.avatar} size={diamond ? 86 : 100} avatarStyle={theme.avatarStyle} style={{ display: 'block', border: `1px solid ${color}`, background: '#fff' }} />
        </div>}
        <div style={{ flex: 1, minWidth: 0, textAlign: diamond ? 'center' : undefined }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 20px', lineHeight: 1.4 }}>{pi.fullName || '你的姓名'}</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: diamond ? '4px 0' : '8px 22px', justifyContent: diamond ? 'center' : undefined }}>
            {bio.map(([label, value], i) => <span key={label}>{diamond ? <>{i > 0 && ' | '}{value}</> : <><b>{label}：</b>{value}</>}</span>)}
          </div>
        </div>
      </div>
    </header> : <header style={{ position: 'relative', minHeight: botanical ? 200 : 170, margin: notebook || prism ? 18 : 0, padding: notebook ? '26px 30px 26px 188px' : botanical ? '38px 40px 35px 274px' : '30px 40px 24px', background: notebook ? color : variant === 'folio-banner' ? light : '#fff', borderRadius: notebook ? '12px' : undefined, borderTop: line ? `10px solid ${color}` : variant === 'folio-banner' ? `5px solid ${color}` : undefined, borderBottom: prism || line ? `2px solid ${color}` : undefined }}>
      {prism && <><div aria-hidden="true" style={{ position: 'absolute', inset: '0 auto 0 0', width: 205, background: light, clipPath: 'polygon(0 0,70% 0,100% 20%,90% 90%,65% 100%,0 70%)' }} /><div aria-hidden="true" style={{ position: 'absolute', top: 0, right: 0, width: 136, height: 120, background: color, opacity: .7, clipPath: 'polygon(0 0,100% 0,100% 100%)' }} /></>}
      {botanical && <><div aria-hidden="true" style={{ position: 'absolute', top: -35, left: 60, width: 350, height: 180, background: light, borderRadius: '25% 0 40% 30%', transform: 'rotate(-35deg)' }} /><div aria-hidden="true" style={{ position: 'absolute', left: 34, top: 35, width: 115, height: 135, background: color, borderRadius: '30% 25% 35% 15%', transform: 'rotate(-30deg)' }} /><div aria-hidden="true" style={{ position: 'absolute', left: 162, top: 175, width: 60, height: 26, background: color, borderRadius: '50% 90% 40% 70%', transform: 'rotate(12deg)' }} /></>}
      {aqua && <div aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 142 }}>
        <div style={{ position: 'absolute', inset: 0, background: `color-mix(in srgb, ${color} 72%, #aebbbb)`, clipPath: 'polygon(0 0,32% 0,52% 30%,0 21%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: `color-mix(in srgb, ${color} 65%, white)`, clipPath: 'polygon(32% 0,100% 0,100% 100%,52% 30%)' }} />
      </div>}
      <div style={{ position: 'relative', display: 'flex', gap: 28, alignItems: 'center', paddingTop: aqua ? 28 : 0 }}>
        {pi.avatar && <div style={notebook ? { position: 'absolute', left: -188, top: -26, width: 150, height: 170, padding: 15, background: color, borderRadius: 12, borderRight: '10px solid white', boxSizing: 'border-box' } : botanical ? { position: 'absolute', left: -182, top: 5 } : { flexShrink: 0 }}>
          <AvatarImage src={pi.avatar} size={botanical || line ? 120 : notebook ? 110 : 94} avatarStyle={theme.avatarStyle} style={{ background: '#fff', border: line || botanical || aqua ? `2px solid ${color}` : '1px solid #ddd', display: 'block' }} />
          {notebook && [42, 77, 112].map(top => <i key={top} style={{ position: 'absolute', right: -16, top, width: 24, height: 9, background: '#fff', borderRadius: 8 }} />)}
        </div>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.4, margin: '0 0 20px', color: '#111' }}>{pi.fullName || (resume.language === 'zh' ? '你的姓名' : 'Your name')}</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 28px' }}>
            {(pi.educationLevel || school?.degree) && <span><b>学历：</b>{pi.educationLevel || school?.degree}</span>}
            {school?.institution && <span><b>学校：</b>{school.institution}</span>}
            {school?.field && <span><b>专业：</b>{school.field}</span>}
            {pi.gender && <span><b>性别：</b>{pi.gender}</span>}
          </div>
        </div>
      </div>
    </header>}
    <main style={{ padding: `${theme.margin?.top ?? 20}px ${Math.max(diamond || floral || scene ? 40 : 24, theme.margin?.right ?? 40)}px ${theme.margin?.bottom ?? 20}px ${Math.max(diamond || floral || scene ? 40 : 24, theme.margin?.left ?? 40)}px`, position: 'relative' }}>
      {notebook ? <div style={{ display: 'grid', gridTemplateColumns: '1.12fr 1fr', gap: 36 }}><div>{sections.filter(s => !sideTypes.has(s.type)).map(renderSection)}</div><div>{info}{intent}{sections.filter(s => sideTypes.has(s.type)).map(renderSection)}</div></div> : <>{info}{intent}{sections.map(renderSection)}</>}
    </main>
  </div>;
}
