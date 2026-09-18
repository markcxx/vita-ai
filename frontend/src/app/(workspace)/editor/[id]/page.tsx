'use client';

import { use, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useEditor } from '@/hooks/use-editor';
import { useIsMobile } from '@/hooks/use-media-query';
import { EditorSplitLayout } from '@/components/editor/editor-split-layout';
import { EditorToolbar } from '@/components/editor/editor-toolbar';
import { EditorSidebar } from '@/components/editor/editor-sidebar';
import { EditorCanvas } from '@/components/editor/editor-canvas';
import { EditorPreviewPanel } from '@/components/editor/editor-preview-panel';
import { EditorMobileTabBar } from '@/components/editor/editor-mobile-tab-bar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { List, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { SettingsDialog } from '@/components/settings/settings-dialog';
import { JdAnalysisDialog } from '@/components/editor/jd-analysis-dialog';
import { TranslateDialog } from '@/components/editor/translate-dialog';
import { ExportDialog } from '@/components/editor/export-dialog';
import { ImportDialog } from '@/components/editor/import-dialog';
import { ShareDialog } from '@/components/editor/share-dialog';
import { CoverLetterDialog } from '@/components/editor/cover-letter-dialog';
import { GrammarCheckDialog } from '@/components/editor/grammar-check-dialog';
import { ResumeOptimizationController } from '@/components/editor/resume-optimization-controller';
import { useEditorStore } from '@/stores/editor-store';
import { useUIStore } from '@/stores/ui-store';
import { useSettingsStore } from '@/stores/settings-store';
import { takePendingOptimizeMessage } from '@/lib/pending-optimize';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import styles from '@/components/editor/editor-workspace.module.css';

export default function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { resume, sections, updateSection, addSection, removeSection, reorderSections } = useEditor(id);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modulesCollapsed, setModulesCollapsed] = useState(false);
  const { mobileActiveTab, setPendingAiMessage, setShowAiChat } = useEditorStore();
  const { activeModal, openModal, closeModal } = useUIStore();
  const { hydrate, _hydrated } = useSettingsStore();

  useEffect(() => {
    if (!_hydrated) hydrate();
  }, [_hydrated, hydrate]);

  // Catch unhandled promise rejections (e.g. "Failed to find Server Action")
  // to prevent page crash — show toast instead
  useEffect(() => {
    const handler = (e: PromiseRejectionEvent) => {
      const msg = e.reason?.message || String(e.reason || '');
      if (msg.includes('Server Action') || msg.includes('AI_RetryError') || msg.includes('AI_APICallError')) {
        e.preventDefault();
        toast.error('操作失败', {
          description: msg.includes('Server Action')
            ? '页面版本已更新，请刷新页面重试'
            : 'AI 服务暂时不可用，请稍后重试',
        });
      }
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);

  // Consume a copy-optimize message handed off via pending-optimize.ts (gated
  // on resume.id === id so it runs after useEditor's cleanup for the old id).
  useEffect(() => {
    if (!resume || resume.id !== id) return;
    const message = takePendingOptimizeMessage(id);
    if (message) {
      setPendingAiMessage(message);
      setShowAiChat(true);
    }
  }, [resume, id, setPendingAiMessage, setShowAiChat]);

  if (!resume) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-muted/35">
      <EditorToolbar />
      <EditorMobileTabBar />

      <EditorSplitLayout collapsed={modulesCollapsed}>
        <section id="resume-editing-area" aria-label="简历编辑" className={cn(styles.editing, isMobile && mobileActiveTab !== 'edit' && styles.mobileHidden)}>
          <div id="resume-module-navigation" className={styles.moduleNavigation} inert={!isMobile && modulesCollapsed ? true : undefined}>
            <EditorSidebar sections={sections} onAddSection={addSection} onReorderSections={reorderSections} />
          </div>
          <div className={styles.divider}>
            <button type="button" className={styles.collapseButton} onClick={() => setModulesCollapsed(value => !value)} aria-expanded={!modulesCollapsed} aria-controls="resume-module-navigation" aria-label={modulesCollapsed ? '展开简历模块栏' : '收起简历模块栏'} title={modulesCollapsed ? '展开简历模块栏' : '收起简历模块栏'}>
              {modulesCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
            </button>
          </div>
          <div className="h-full min-w-0 flex-1">
            <EditorCanvas sections={sections} onUpdateSection={updateSection} onRemoveSection={removeSection} onReorderSections={reorderSections} />
          </div>
        </section>
        <section aria-label="简历预览与助手" className={cn(styles.rightPanel, isMobile && mobileActiveTab !== 'preview' && styles.mobileHidden)}>
          <EditorPreviewPanel />
        </section>
      </EditorSplitLayout>

      {/* Mobile sidebar FAB */}
      <button
        onClick={() => setSidebarOpen(true)}
        className={cn("fixed bottom-20 left-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow-lg transition-transform hover:scale-105 active:scale-95 md:hidden", mobileActiveTab !== 'edit' && 'hidden')}
        aria-label="打开简历模块"
      >
        <List className="h-5 w-5" />
      </button>

      {/* Mobile sidebar Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="text-sm font-semibold">简历模块</SheetTitle>
          </SheetHeader>
          <EditorSidebar
            sections={sections}
            onAddSection={(s) => { addSection(s); setSidebarOpen(false); }}
            onReorderSections={reorderSections}
          />
        </SheetContent>
      </Sheet>

      <SettingsDialog />
      <JdAnalysisDialog
        open={activeModal === 'jd-analysis'}
        onOpenChange={(open) => open ? openModal('jd-analysis') : closeModal()}
        resumeId={id}
      />
      <TranslateDialog
        open={activeModal === 'translate'}
        onOpenChange={(open) => open ? openModal('translate') : closeModal()}
        resumeId={id}
      />
      <ExportDialog
        open={activeModal === 'export'}
        onOpenChange={(open) => open ? openModal('export') : closeModal()}
        resumeId={id}
      />
      <ImportDialog
        open={activeModal === 'import'}
        onOpenChange={(open) => open ? openModal('import') : closeModal()}
      />
      <ShareDialog
        open={activeModal === 'share'}
        onOpenChange={(open) => open ? openModal('share') : closeModal()}
        resumeId={id}
      />
      <CoverLetterDialog
        open={activeModal === 'cover-letter'}
        onOpenChange={(open) => open ? openModal('cover-letter') : closeModal()}
        resumeId={id}
      />
      <GrammarCheckDialog
        open={activeModal === 'grammar-check'}
        onOpenChange={(open) => open ? openModal('grammar-check') : closeModal()}
        resumeId={id}
      />
      <ResumeOptimizationController resumeId={id} />
    </div>
  );
}
