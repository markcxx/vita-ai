'use client';

import { SearchField } from '@/components/ui/search-field';

import { useEffect, useMemo, useRef, useState } from 'react';
import { GalleryScroll } from '@/components/dashboard/gallery-scroll';
import { getCopy } from '@/lib/copy';
import {
  ArrowUpRight,
  Eye,
  X,
  Loader2,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TEMPLATES } from '@/lib/constants';
import { useResume } from '@/hooks/use-resume';
import { useRouter } from 'next/navigation';
import { ResumePreview } from '@/components/preview/resume-preview';
import { getTemplateName } from '@/lib/template-labels';
import styles from './templates.module.css';
import { referenceTheme, TEMPLATE_COLORS } from '@/lib/reference-templates';

import { buildMockResume } from '@/lib/template-preview';

const TEMPLATE_FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'classic', label: '经典' },
  { id: 'modern', label: '现代' },
  { id: 'creative', label: '创意' },
  { id: 'ats', label: '筛选友好' },
] as const;

type TemplateFilter = (typeof TEMPLATE_FILTERS)[number]['id'];

const TEMPLATE_GROUPS: Record<Exclude<TemplateFilter, 'all'>, ReadonlySet<string>> = {
  classic: new Set(['folio-ribbon-blue', 'folio-blueprint', 'folio-floral', 'folio-banner', 'folio-line', 'classic', 'professional', 'formal', 'academic', 'executive', 'consultant', 'legal', 'teacher', 'scientist', 'medical']),
  modern: new Set(['folio-skyline', 'folio-ember', 'modern', 'minimal', 'elegant', 'clean', 'compact', 'nordic', 'swiss', 'japanese', 'berlin', 'euro', 'corporate', 'finance', 'metro', 'material']),
  creative: new Set(['folio-mesh', 'folio-compass', 'folio-cloud', 'folio-growth', 'folio-dots', 'folio-bookmark', 'folio-spark', 'folio-breeze', 'folio-diamond', 'folio-gear', 'folio-prism', 'folio-notebook', 'folio-botanical', 'folio-aqua', 'creative', 'designer', 'infographic', 'gradient', 'bold', 'timeline', 'blocks', 'magazine', 'artistic', 'retro', 'neon', 'watercolor', 'luxe', 'rose', 'card', 'zigzag', 'ribbon', 'mosaic', 'sidebar', 'two-column']),
  ats: new Set(['ats', 'developer', 'engineer', 'coder', 'startup']),
};

function getTemplateTag(template: string, index: number) {
  if (index < 3) return '推荐';
  if (TEMPLATE_GROUPS.ats.has(template)) return '筛选友好';
  if (TEMPLATE_GROUPS.creative.has(template)) return '创意';
  if (TEMPLATE_GROUPS.modern.has(template)) return '现代';
  return '专业';
}

// Measure the full document so taller templates also fit without clipping.
function TemplatePaper({ template, fit = false, color }: { template: string; fit?: boolean; color?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const document = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  useEffect(() => {
    const frame = container.current;
    const paper = document.current;
    if (!frame || !paper) return;
    const resize = () => {
      const widthScale = frame.clientWidth / 794;
      setScale(fit ? Math.min(widthScale, frame.clientHeight / paper.offsetHeight, 1) : widthScale);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(frame);
    observer.observe(paper);
    resize();
    return () => observer.disconnect();
  }, [fit]);
  const resume = useMemo(() => buildMockResume(template, color), [template, color]);
  return <div ref={container} className={fit ? styles.fittedPaper : styles.paper}>
    <div ref={document} className={fit ? styles.fittedDocument : undefined}
      style={fit ? { width: 794, transform: `translate(-50%, -50%) scale(${scale})` } : { width: 794, zoom: scale }}>
      <ResumePreview resume={resume} />
    </div>
  </div>;
}

export default function TemplatesPage() {
  const t = getCopy();
  const router = useRouter();
  const { createResume } = useResume();
  const previewTrigger = useRef<{ element: HTMLButtonElement; keyboard: boolean } | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const [creatingTemplate, setCreatingTemplate] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(12);
  const [previewColor, setPreviewColor] = useState<string | undefined>();
  const [activeFilter, setActiveFilter] = useState<TemplateFilter>('all');

  const visibleTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN');
    return TEMPLATES.filter((template) => {
      const label = getTemplateName(template);
      const matchesFilter = activeFilter === 'all' || TEMPLATE_GROUPS[activeFilter].has(template);
      const matchesQuery = !normalizedQuery
        || label.toLocaleLowerCase('zh-CN').includes(normalizedQuery)
        || template.toLocaleLowerCase().includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, query]);

  const handleUseTemplate = async (template: string) => {
    if (creatingTemplate) return;
    setCreatingTemplate(template);
    try {
      const resume = await createResume({ template, themeConfig: buildMockResume(template, previewTemplate === template ? previewColor : undefined).themeConfig });
      if (resume) {
        router.push(`/editor/${resume.id}`);
      }
    } finally {
      setCreatingTemplate(null);
    }
  };

  return (
    <GalleryScroll background="/images/templates/resume-template-youthful.png" variant="templates">
    <div className={styles.page} data-gallery-page>
      <section className={styles.hero} data-gallery-hero>

        <div className={styles.heroContent}>
          <div data-gallery-intro><p className={styles.eyebrow}>简历模板 · RESUME TEMPLATES</p>
          <h1>让你的下一步，<br />斩获心动 <span>offer</span></h1>
          <p className={styles.subtitle}>用一份出彩的简历，让每一份努力被看见。</p></div>
          <div data-gallery-controls>
          <SearchField
            containerClassName="mt-6"
            value={query}
            onValueChange={value => { setQuery(value); setVisibleCount(12); }}
            placeholder="搜索模板"
          />
          <div className={styles.filters} role="group" aria-label="模板分类">
            {TEMPLATE_FILTERS.map((filter) => (
              <button key={filter.id} type="button" onClick={() => { setActiveFilter(filter.id); setVisibleCount(12); }}
                aria-pressed={activeFilter === filter.id}>{filter.label}</button>
            ))}
          </div>
        </div>
        </div>
      </section>

      <section className={styles.collection} data-gallery-collection aria-label="精选模板">
        {visibleTemplates.length > 0 ? (
          <div className={styles.grid}>
            {visibleTemplates.slice(0, visibleCount).map((template) => {
              const label = getTemplateName(template);
              const tag = getTemplateTag(template, TEMPLATES.indexOf(template));
              const isCreating = creatingTemplate === template;
              return (
                <article key={template} className={styles.card}>
                  <div className={styles.thumbnail}>
                    <div className={styles.thumbnailPaper} aria-hidden="true" inert>
                      <TemplatePaper template={template} />
                    </div>
                    <div className={styles.actions}>
                      <Button className={styles.useButton} disabled={!!creatingTemplate}
                        onClick={() => handleUseTemplate(template)} aria-label={`使用${label}模板`}>
                        {isCreating ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpRight size={16} />}
                        {isCreating ? t('templates.creating') : t('templates.useTemplate')}
                      </Button>
                      <Button variant="outline" className={styles.previewButton}
                        onClick={(event) => { previewTrigger.current = { element: event.currentTarget, keyboard: event.detail === 0 }; setPreviewColor(undefined); setPreviewTemplate(template); }} aria-label={`预览${label}模板`}>
                        <Eye size={16} />{t('templates.preview')}
                      </Button>
                    </div>
                  </div>
                  <div className={styles.cardInfo}>
                    <h2>{label}<span>{String(TEMPLATES.indexOf(template) + 1).padStart(2, '0')}</span></h2>
                    <p>{TEMPLATE_GROUPS.creative.has(template) ? '鲜明设计，让个人风格自然呈现' : TEMPLATE_GROUPS.ats.has(template) ? '清晰结构，让重点经历一目了然' : '精致排版，让职业经历有序表达'}</p>
                    <div className={styles.tags}><span>{tag}</span><span>在线编辑</span><span>支持导出</span></div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={styles.empty}>
            <Search size={28} /><h2>没有找到匹配的模板</h2><p>试试其他关键词或模板分类</p>
            <Button variant="outline" onClick={() => { setQuery(''); setActiveFilter('all'); }}>查看全部模板</Button>
          </div>
        )}
        {visibleCount < visibleTemplates.length && <div className={styles.loadMore}><Button variant="outline" onClick={() => setVisibleCount(count => count + 12)}>加载更多模板</Button></div>}
        <p className={styles.resultCount} aria-live="polite">选一个喜欢的样式，开始书写你的下一程</p>
      </section>

      <Dialog open={!!previewTemplate} onOpenChange={(open) => { if (!open) setPreviewTemplate(null); }}>
        <DialogContent onCloseAutoFocus={(event) => { event.preventDefault(); if (previewTrigger.current?.keyboard) previewTrigger.current.element.focus({ preventScroll: true }); }} showCloseButton={false} className={`flex w-[calc(100%-2rem)] h-[92dvh] max-h-[92dvh] flex-col gap-0 overflow-visible rounded-2xl border-0 p-0 sm:max-w-[660px] ${styles.dialog}`}>
          <DialogClose className={styles.close} aria-label="关闭预览"><X size={22} /></DialogClose>
          <DialogHeader className="shrink-0 px-6 pb-4 pt-6 text-left">
            <p className={styles.dialogEyebrow}>TEMPLATE PREVIEW</p>
            <DialogTitle className="pr-8 text-lg">{previewTemplate && getTemplateName(previewTemplate)}</DialogTitle>
            <DialogDescription className="text-xs">模板效果预览 · 示例内容可在使用后替换为你的经历</DialogDescription>
          </DialogHeader>
          <div className={styles.previewStage}>
            {previewTemplate && <TemplatePaper template={previewTemplate} fit color={previewColor} />}
          </div>
          {previewTemplate && <div className={styles.colorPalette} role="group" aria-label="模板配色">
            {Array.from(new Set([referenceTheme(previewTemplate).accentColor, ...TEMPLATE_COLORS])).map(color => <button key={color} type="button" aria-label={`配色 ${color}`} title={color}
              aria-pressed={(previewColor || referenceTheme(previewTemplate).accentColor) === color}
              onClick={() => setPreviewColor(color)} style={{ backgroundColor: color }} />)}
          </div>}
          <div className={styles.dialogFooter}>
            <div><strong>你的经历，值得被看见</strong><p>从这份模板开始，打造专属简历</p></div>
            <Button className={styles.useButton} disabled={!!creatingTemplate}
              onClick={() => previewTemplate && handleUseTemplate(previewTemplate)}>
              {creatingTemplate === previewTemplate ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpRight size={16} />}
              {creatingTemplate === previewTemplate ? t('templates.creating') : t('templates.useTemplate')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </GalleryScroll>
  );
}
