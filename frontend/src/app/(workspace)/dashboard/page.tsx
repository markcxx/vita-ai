'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { GalleryScroll } from '@/components/dashboard/gallery-scroll';
import { getCopy } from '@/lib/copy';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchField } from '@/components/ui/search-field';
import { useResume } from '@/hooks/use-resume';
import { toast } from 'sonner';
import { ResumeGrid } from '@/components/dashboard/resume-grid';
import { ShareDialog } from '@/components/editor/share-dialog';
import { useRouter } from 'next/navigation';
import styles from '@/components/dashboard/resume-gallery.module.css';

export default function DashboardPage() {
  const t = getCopy('dashboard');
  const { resumes, isLoading, fetchResumes, createResume, deleteResume, renameResume, duplicateResume } = useResume();

  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);
  const handleCreateBlank = async () => {
    if (creatingRef.current) return;
    creatingRef.current = true;
    setCreating(true);
    try {
      const resume = await createResume({ title: '未命名简历', template: 'classic', language: 'zh' });
      if (resume) router.push(`/editor/${resume.id}`);
      else toast.error('创建失败，请稍后重试');
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(12);
  const [shareResumeId, setShareResumeId] = useState<string | null>(null);

  useEffect(() => {
    void fetchResumes().finally(() => setLoaded(true));
  }, [fetchResumes]);

  // Filter and sort resumes
  const filteredResumes = useMemo(() => {
    let result = resumes;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter((r) => r.title.toLowerCase().includes(query));
    }

    // Sort
    result = [...result].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return result;
  }, [resumes, searchQuery]);

  const hasResumes = resumes.length > 0;
  const hasResults = filteredResumes.length > 0;

  return (
    <GalleryScroll background="/images/dashboard/resume-workspace-youthful.png" variant="dashboard">
    <div className={styles.page} data-gallery-page>
      <section className={styles.hero} data-gallery-hero>

        <div className={styles.heroContent}>
          <div data-gallery-intro><p className={styles.eyebrow}>{t('title')}{hasResumes ? ` · ${t('resumeCount', { count: resumes.length })}` : ''}</p>
          <h1>让每一段经历，<br />成为你的下一份底气</h1>
          <p className={styles.subtitle}>整理成长，打磨表达，为不同机会准备合适的简历。</p></div>
          <div data-gallery-controls>
          {(hasResumes || !loaded) && (
            <SearchField
              containerClassName="mt-6"
              value={searchQuery}
              onValueChange={value => { setSearchQuery(value); setVisibleCount(12); }}
              placeholder={t('searchPlaceholder')}
            />
          )}


        </div>
        </div>
      </section>
      <div className={styles.collection} data-gallery-collection>
        <ResumeGrid loading={!loaded || isLoading} resumes={filteredResumes.slice(0, visibleCount)} onCreate={handleCreateBlank} creating={creating} onDelete={deleteResume} onDuplicate={duplicateResume} onRename={renameResume} onShare={setShareResumeId} />
        {loaded && !isLoading && hasResumes && !hasResults && <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground"><Search size={18} /><span>没有找到相关简历</span><Button variant="ghost" onClick={() => { setSearchQuery(''); setVisibleCount(12); }}>清除搜索</Button></div>}
        {hasResults && visibleCount < filteredResumes.length && <div className={styles.loadMore}><Button variant="outline" onClick={() => setVisibleCount(count => count + 12)}>加载更多简历</Button></div>}
      </div>
      {shareResumeId && (
        <ShareDialog
          open={!!shareResumeId}
          onOpenChange={(open) => { if (!open) setShareResumeId(null); }}
          resumeId={shareResumeId}
        />
      )}
    </div>
    </GalleryScroll>
  );
}
