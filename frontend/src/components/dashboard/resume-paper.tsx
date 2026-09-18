'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ResumePreview } from '@/components/preview/resume-preview';
import { PreviewErrorBoundary } from '@/components/preview/preview-error-boundary';
import { normalizeSections } from '@/lib/resume/normalize-content';
import type { Resume } from '@/types/resume';
import styles from './resume-gallery.module.css';

export function ResumePaper({ resume, fit = false }: { resume: Resume; fit?: boolean }) {
  const frame = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(fit);
  const [scale, setScale] = useState(.3);
  const safeResume = useMemo(() => ({ ...resume, sections: normalizeSections(resume.sections || []) }), [resume]);
  useEffect(() => {
    if (fit || !frame.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '200px' });
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, [fit]);
  useEffect(() => {
    if (!visible || !frame.current || !paper.current) return;
    const measure = () => {
      const box = frame.current!, document = paper.current!;
      setScale(fit ? Math.min(box.clientWidth / 794, box.clientHeight / Math.max(1123, document.scrollHeight)) : box.clientWidth / 794);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(frame.current); observer.observe(paper.current); measure();
    return () => observer.disconnect();
  }, [visible, fit, safeResume]);
  return <div ref={frame} className={`${styles.paperFrame} ${fit ? styles.fitted : ''}`} aria-hidden={!fit}>
    {visible && <div ref={paper} className={styles.paper} style={{ transform: fit ? `translate(-50%, -50%) scale(${scale})` : `scale(${scale})` }}>
      <PreviewErrorBoundary fallback={<div className="p-8 text-sm text-zinc-500">暂时无法显示预览，请进入编辑器查看。</div>}><ResumePreview resume={safeResume} /></PreviewErrorBoundary>
    </div>}
  </div>;
}
