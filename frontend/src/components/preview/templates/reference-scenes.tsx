import type { ReactNode } from 'react';
import type { PersonalInfoContent, ThemeConfig } from '@/types/resume';
import { AvatarImage } from '../avatar-image';

export const SCENE_TEMPLATES = new Set(['folio-cloud', 'folio-growth', 'folio-dots', 'folio-bookmark', 'folio-spark', 'folio-breeze']);
export function SceneHeading({ variant, color }: { variant: string; color: string }) {
  return <span aria-hidden="true" style={{ position: 'relative', display: 'inline-block', flexShrink: 0, width: variant === 'folio-dots' ? 26 : 12, height: variant === 'folio-dots' ? 26 : 12, borderRadius: variant === 'folio-dots' ? '50%' : undefined, background: variant === 'folio-growth' || variant === 'folio-bookmark' ? color : variant === 'folio-dots' ? `repeating-linear-gradient(135deg, ${color}77 0 1px, transparent 1px 3px)` : `radial-gradient(${color} 0.7px, transparent 1px) 0 0 / 4px 4px` }} />;
}
export function SceneWave({ color }: { color: string }) {
  return <svg aria-hidden="true" width="30" height="10" viewBox="0 0 30 10" fill="none" stroke={color} strokeWidth="1"><path d="M0 6L4 2L8 6L12 2L16 6L20 2L24 6L28 2" /></svg>;
}
type Props = { variant: string; color: string; pi: PersonalInfoContent; bio: (string | undefined)[][]; schoolBadge: ReactNode; theme: ThemeConfig };
export function SceneHeader({ variant, color, pi, bio, schoolBadge, theme }: Props) {
  const cloud = variant === 'folio-cloud', growth = variant === 'folio-growth', dots = variant === 'folio-dots';
  const square = growth || dots;
  return <header style={{ position: 'relative', minHeight: cloud ? 198 : dots ? 194 : 172, padding: cloud ? '42px 30px 30px' : '28px 38px 24px', boxSizing: 'border-box', borderBottom: dots ? `10px double ${color}` : `${growth ? 7 : cloud ? 2 : 1}px solid ${color}`, margin: cloud || dots ? 0 : '0 22px', overflow: 'hidden' }}>
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, color, pointerEvents: 'none' }}>
      {cloud && <>
        <svg viewBox="0 0 100 40" style={{ position: 'absolute', top: 8, left: 12, width: 64, opacity: .45 }} fill="currentColor"><path d="M0 30Q5 20 18 21Q22 9 38 16Q50 2 65 17Q82 13 86 24Q96 22 100 30Z" /></svg>
        <svg viewBox="0 0 90 60" style={{ position: 'absolute', top: 36, left: 106, width: 78, opacity: .6 }} fill="currentColor"><path d="M0 48Q2 24 22 32Q20 6 40 10Q55 11 55 30Q69 17 80 29Q87 36 90 48Z" /></svg>
        <svg viewBox="0 0 60 60" style={{ position: 'absolute', bottom: 0, left: 0, width: 55 }} fill="currentColor"><path d="M0 18Q15 5 24 25Q42 20 43 42Q58 40 60 60H0Z" /></svg>
        <svg viewBox="0 0 70 78" style={{ position: 'absolute', bottom: 0, right: 5, width: 62 }} fill="currentColor" stroke="currentColor"><path d="M16 44Q3 58 16 68Q29 58 16 44ZM42 7Q20 32 42 52Q64 32 42 7ZM59 23Q40 44 59 58Q78 44 59 23Z" /><path d="M16 62V78M42 48V78M59 54V78" fill="none" /></svg>
      </>}
      {growth && <>
        <svg viewBox="0 0 100 180" style={{ position: 'absolute', left: 0, top: 3, width: 112, height: 165 }} fill="currentColor" opacity=".8"><path d="M0 15L23 2L46 15V42L23 55L0 42ZM78 131L95 141V163L78 174L61 163V141Z" /></svg>
        <svg viewBox="0 0 150 110" style={{ position: 'absolute', right: 0, bottom: 0, width: 155 }} fill="currentColor"><path d="M8 110V98H25V110M32 110V87H49V110M56 110V76H73V110M80 110V60H97V110M104 110V44H121V110M128 110V22H145V110" /><path d="M0 87Q70 60 140 6" fill="none" stroke="currentColor" strokeWidth="4" /><path d="M124 6L146 0L137 21L137 9Z" /></svg>
      </>}
      {dots && <>
        <div style={{ position: 'absolute', left: 5, top: 8, width: 88, height: 84, background: `radial-gradient(${color} 1.8px, transparent 2px) 0 0 / 13px 13px` }} />
        <div style={{ position: 'absolute', right: 10, bottom: 10, width: 102, height: 50, background: `radial-gradient(${color}88 2px, transparent 3px) 0 0 / 18px 18px` }} />
        <div style={{ position: 'absolute', right: 20, top: 82, width: 36, height: 35, background: `radial-gradient(${color} 1px, transparent 1.5px) 0 0 / 6px 6px` }} />
        <div style={{ position: 'absolute', left: 32, top: 38, width: 104, height: 124, background: color }} />
      </>}
      {!cloud && !growth && !dots && <>
        <svg viewBox="0 0 36 65" style={{ position: 'absolute', left: 96, top: 18, width: 33 }} fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 0L10 10L20 20L10 30L20 40L10 50M31 0L21 10L31 20L21 30L31 40L21 50" /></svg>
        <div style={{ position: 'absolute', left: 10, bottom: 12, width: 34, height: 34, background: `${color}66`, clipPath: 'polygon(0 0,100% 50%,0 100%)' }} />
      </>}
    </div>
    <div style={{ position: 'absolute', right: 0, top: 20, maxWidth: 165 }}>{schoolBadge}</div>
    <div style={{ position: 'relative', display: 'flex', gap: cloud ? 48 : 28, alignItems: 'center' }}>
      {pi.avatar && <AvatarImage src={pi.avatar} size={square ? 98 : cloud ? 122 : 108} avatarStyle={theme.avatarStyle} style={{ display: 'block', flexShrink: 0, background: '#fff', border: `${square ? 1 : 2}px solid ${color}`, borderRadius: square ? 0 : '50%' }} />}
      <div style={{ flex: 1, minWidth: 0, paddingRight: growth ? 110 : 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.4, margin: '0 0 20px', ...(growth ? { borderBottom: '1px solid #777', maxWidth: 245, paddingBottom: 3 } : {}) }}>{pi.fullName || '你的姓名'}</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}>{bio.map(([label, value]) => <span key={label}><b>{label}：</b>{value}</span>)}</div>
      </div>
    </div>
  </header>;
}
export function SceneSidebar({ variant, color, pi, bio, schoolBadge, theme }: Props) {
  const bookmark = variant === 'folio-bookmark';
  return <aside style={{ minWidth: 0, padding: '26px 24px', borderLeft: bookmark ? undefined : `1px solid ${color}`, position: 'relative' }}>
    <div style={{ textAlign: 'right', marginRight: -24 }}>{schoolBadge}</div>
    {bookmark && <div style={{ background: color, margin: '12px -24px 0 10px', textAlign: 'center', fontSize: 17 }}>个人简历</div>}
    <div style={{ position: 'relative', margin: bookmark ? '140px 0 42px' : '60px 0 38px' }}>
      <div aria-hidden="true" style={bookmark ? { position: 'absolute', top: -30, bottom: -30, right: -24, width: 54, background: color } : { position: 'absolute', width: 44, height: 40, borderRadius: '40% 60% 30% 60%', bottom: -6, right: 2, background: color, transform: 'rotate(-35deg)' }} />
      {!bookmark && <div aria-hidden="true" style={{ position: 'absolute', left: 0, bottom: -10, width: 46, height: 35, borderRadius: '50%', background: `repeating-linear-gradient(45deg, ${color} 0 1px, transparent 1px 3px)` }} />}
      {pi.avatar && <AvatarImage src={pi.avatar} size={bookmark ? 136 : 138} avatarStyle={theme.avatarStyle} style={{ position: 'relative', display: 'block', margin: 'auto', background: '#fff', border: `2px solid ${color}`, borderRadius: bookmark ? 0 : '50%' }} />}
    </div>
    <h1 style={{ fontWeight: 700, fontSize: 30, lineHeight: 1.4, textAlign: 'center', margin: '0 0 22px', borderBottom: bookmark ? undefined : '1px solid #5e7779' }}>{pi.fullName || '你的姓名'}</h1>
    {bio.map(([label, value]) => <div key={label} style={{ marginBottom: 8, overflowWrap: 'anywhere' }}><b>{label}：</b>{value}</div>)}
  </aside>;
}
