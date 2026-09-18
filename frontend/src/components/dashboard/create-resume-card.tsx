'use client';

import { Loader2, Plus } from 'lucide-react';
import styles from './resume-gallery.module.css';

export function CreateResumeCard({ onCreate, pending, disabled = false }: { onCreate: () => void; pending: boolean; disabled?: boolean }) {
  return (
    <button type="button" className={`${styles.card} ${styles.createCard}`} onClick={onCreate} disabled={pending || disabled} aria-busy={pending}>
      <span className={styles.createIcon}>{pending ? <Loader2 size={28} className="animate-spin" /> : <Plus size={32} strokeWidth={1.5} />}</span>
      <span className={styles.createTitle}>{pending ? '正在创建…' : '新建空白简历'}</span>
      <span className={styles.createHint}>从空白开始，写下你的经历</span>
    </button>
  );
}
