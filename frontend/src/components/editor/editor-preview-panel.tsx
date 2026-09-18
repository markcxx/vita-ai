'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, MessageSquareText, Palette, LayoutTemplate, ZoomIn, ZoomOut } from 'lucide-react';
import { getCopy } from '@/lib/copy';
import { Button } from '@/components/ui/button';
import { ResumePreview } from '@/components/preview/resume-preview';
import { PreviewErrorBoundary } from '@/components/preview/preview-error-boundary';
import { useResumeStore } from '@/stores/resume-store';
import { useEditorStore } from '@/stores/editor-store';
import { referenceTheme, TEMPLATE_COLORS } from '@/lib/reference-templates';
import { DEFAULT_THEME } from '@/lib/resume/theme-presets';
import { TemplatePickerDialog } from '@/components/chat/TemplatePickerDialog';
import { ThemeEditor } from './theme-editor';
import ChatApp from '@/components/chat/ChatApp';
import type { Resume } from '@/types/resume';
import styles from './editor-workspace.module.css';

const A4_WIDTH = 794;
const views = [
  { id: 'preview', label: '简历预览', icon: FileText },
  { id: 'ai', label: 'AI 助手', icon: MessageSquareText },
  { id: 'theme', label: '主题', icon: Palette },
] as const;

export function EditorPreviewPanel() {
  const t = getCopy('editor.toolbar');
  const { currentResume, sections, setTemplate } = useResumeStore();
  const { showAiChat, showThemeEditor, setPanelView } = useEditorStore();
  const activeView = showAiChat ? 'ai' : showThemeEditor ? 'theme' : 'preview';
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [zoom, setZoom] = useState<number | null>(null);
  const [availableWidth, setAvailableWidth] = useState(600);
  const previewScroll = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = previewScroll.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setAvailableWidth(element.clientWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const liveResume = useMemo<Resume | null>(() => currentResume ? { ...currentResume, sections } : null, [currentResume, sections]);
  if (!liveResume) return null;

  const fitZoom = Math.min(100, Math.max(10, Math.floor((availableWidth - 88) / A4_WIDTH * 100)));
  const effectiveZoom = zoom ?? fitZoom;
  const accent = liveResume.themeConfig?.accentColor || referenceTheme(liveResume.template).accentColor;
  const colors = Array.from(new Set([referenceTheme(liveResume.template).accentColor, ...TEMPLATE_COLORS]));

  const changeColor = (color: string) => {
    useResumeStore.setState(state => ({
      currentResume: state.currentResume ? {
        ...state.currentResume,
        themeConfig: { ...DEFAULT_THEME, avatarStyle: referenceTheme(state.currentResume.template).avatarStyle, ...state.currentResume.themeConfig, accentColor: color },
      } : null,
      isDirty: true,
    }));
    useResumeStore.getState()._scheduleSave();
  };

  return <>
    <div data-tour="preview" className={styles.flipStage}>
      {views.map(view => <section key={view.id} className={styles.face} data-active={activeView === view.id} aria-label={view.label} aria-hidden={activeView !== view.id} inert={activeView !== view.id}>
        <header className={styles.faceHeader}>
          <h2 className={styles.faceTitle}><view.icon size={14} />{view.label}</h2>
          <div className={styles.faceActions}>
            {views.filter(target => target.id !== view.id).map(target => <Button key={target.id} variant="ghost" size="sm" className="h-7 gap-1.5 rounded-md px-2 text-xs" onClick={() => setPanelView(target.id)}><target.icon size={14} />{target.label}</Button>)}
            {view.id === 'preview' && <Button variant="ghost" size="sm" className="h-7 gap-1.5 rounded-md px-2 text-xs" onClick={() => setTemplatePickerOpen(true)}><LayoutTemplate size={14} />模板</Button>}
          </div>
        </header>
        {view.id === 'preview' ? <>
          <div className={styles.previewBody}>
            <div ref={previewScroll} className={styles.previewScroll}>
              <div className={styles.paperSpace}>
                <div className={styles.paper} style={{ width: A4_WIDTH, zoom: effectiveZoom / 100 }}>
                  <PreviewErrorBoundary resetKey={liveResume.sections} fallback={<div className="p-8 text-center text-sm text-zinc-500">{t('previewError')}</div>}>
                    <ResumePreview resume={liveResume} />
                  </PreviewErrorBoundary>
                </div>
              </div>
            </div>
            <div className={styles.colors} role="group" aria-label="简历快捷配色">
              {colors.map(color => <button key={color} type="button" aria-label={`配色 ${color}`} aria-pressed={accent === color} title={`配色 ${color}`} style={{ backgroundColor: color }} onClick={() => changeColor(color)} />)}
            </div>
          </div>
          <div className={styles.zoomControls}>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="缩小简历" disabled={effectiveZoom <= 10} onClick={() => setZoom(Math.max(10, effectiveZoom - 10))}><ZoomOut size={14} /></Button>
            <span>{effectiveZoom}%</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="放大简历" disabled={effectiveZoom >= 150} onClick={() => setZoom(Math.min(150, effectiveZoom + 10))}><ZoomIn size={14} /></Button>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setZoom(null)}>适应宽度</Button>
          </div>
        </> : view.id === 'ai' ? <div className="min-h-0 flex-1"><ChatApp resumeId={liveResume.id} /></div> : <div className="min-h-0 flex-1"><ThemeEditor onChooseTemplate={() => setTemplatePickerOpen(true)} /></div>}
      </section>)}
    </div>
    {templatePickerOpen && <TemplatePickerDialog purpose="switch" value={liveResume.template} onConfirm={setTemplate} onClose={() => setTemplatePickerOpen(false)} />}
  </>;
}
