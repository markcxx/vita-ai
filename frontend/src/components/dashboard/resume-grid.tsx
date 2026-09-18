'use client';

import type { Resume } from '@/types/resume';
import { CreateResumeCard } from './create-resume-card';
import { Skeleton } from '@/components/ui/skeleton';
import { ResumeCard } from './resume-card';
import styles from './resume-gallery.module.css';

interface ResumeGridProps {
  resumes: Resume[];
  loading?: boolean;
  onCreate: () => void;
  creating: boolean;
  onDelete: (id: string) => Promise<boolean>;
  onDuplicate: (id: string) => Promise<Resume | null>;
  onRename: (id: string, title: string) => Promise<boolean>;
  onShare?: (id: string) => void;
}

export function ResumeGrid({ resumes, onDelete, onDuplicate, onRename, onShare, onCreate, creating, loading = false }: ResumeGridProps) {
  return (
    <div className={styles.grid} aria-busy={loading} aria-label="简历列表">
      <CreateResumeCard onCreate={onCreate} pending={creating} disabled={loading} />
      {loading && Array.from({ length: 3 }, (_, index) => (
        <div key={`loading-${index}`} className={styles.card} aria-hidden="true">
          <div className={`${styles.thumbnail} p-6`}>
            <Skeleton className="mb-5 h-5 w-1/3" />
            <Skeleton className="mb-3 h-2 w-2/3" />
            <Skeleton className="mb-7 h-2 w-1/2" />
            {[0, 1, 2, 3, 4].map(line => <Skeleton key={line} className="mb-3 h-2 w-full" />)}
          </div>
          <div className={styles.info}>
            <Skeleton className="h-[21px] w-2/3" />
            <div className={styles.meta}><Skeleton className="h-[22px] w-20" /></div>
            <div className={styles.updated}><Skeleton className="h-4 w-28" /></div>
          </div>
        </div>
      ))}
      {!loading && resumes.map((resume) => (
        <ResumeCard
          key={resume.id}
          resume={resume}
          onDelete={() => onDelete(resume.id)}
          onDuplicate={() => onDuplicate(resume.id)}
          onRename={(title) => onRename(resume.id, title)}
          onShare={onShare ? () => onShare(resume.id) : undefined}
        />
      ))}
    </div>
  );
}
