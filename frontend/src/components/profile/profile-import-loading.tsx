'use client';

import { BriefcaseBusiness, GraduationCap, Sparkles, UserRound } from 'lucide-react';
import { AppDialog } from '@/components/ui/AppDialog';
import s from './profile-import.module.css';

/** Compact waiting state for profile attachment analysis. */
export function ProfileImportLoading({ onCancel }: { onCancel: () => void }) {
  return <AppDialog open onClose={onCancel} title={false} closable={false} maskClosable={false} width={400}>
    <div className={s.loading}>
      <div className={s.visual} aria-hidden="true">
        <div className={s.grid}/><div className={s.orbit}/><div className={s.orbit}/>
        <div className={s.document}>
          <div className={s.avatar}><UserRound size={18}/></div>
          <div className={s.line}/><div className={s.line}/><div className={s.line}/>
          <div className={s.scan}/>
        </div>
        <div className={s.chip}><GraduationCap size={17}/></div>
        <div className={s.chip}><BriefcaseBusiness size={17}/></div>
        <div className={s.chip}><Sparkles size={17}/></div>
      </div>
      <p className={s.loadingStatus} role="status">正在整理资料…</p>
      <button type="button" className={s.cancelLoading} onClick={onCancel}>取消</button>
    </div>
  </AppDialog>;
}
