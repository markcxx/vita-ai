'use client';

import { toast } from 'sonner';
import { EditorTitle } from './editor-title';
import { getCopy } from '@/lib/copy';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Undo2, Redo2, Download, Upload, Save, FileSearch, Languages, FileText, SpellCheck, Share2, MoreHorizontal, Sparkles, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEditorStore } from '@/stores/editor-store';
import { useResumeStore } from '@/stores/resume-store';
import { useUIStore } from '@/stores/ui-store';
import { useSettingsStore } from '@/stores/settings-store';

export function EditorToolbar() {
  const t = getCopy('editor.toolbar');
  const router = useRouter();
  const {
    undo,
    redo,
    undoStack,
    redoStack,
    optimizationRequest,
    requestAiOptimization,
  } = useEditorStore();
  const { isSaving, isDirty, reorderSections, save } = useResumeStore();
  const { openModal } = useUIStore();
  const autoSave = useSettingsStore((s) => s.autoSave);

  const handleUndo = () => {
    const snapshot = undo();
    if (snapshot) {
      reorderSections(snapshot.sections);
    }
  };

  const handleRedo = () => {
    const snapshot = redo();
    if (snapshot) {
      reorderSections(snapshot.sections);
    }
  };

  const handleOptimizeResume = () => {
    requestAiOptimization();
  };

  return (
    <div className="relative z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-card px-3 sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={async () => {
            await save();
            if (useResumeStore.getState().isDirty) { toast.error('保存未完成，请稍后重试'); return; }
            router.push('/dashboard');
          }}
          aria-label="返回我的简历"
          className="h-8 w-8 shrink-0 cursor-pointer rounded-full border border-border text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="hidden h-6 sm:block" />
        <EditorTitle />
        <span className="hidden text-xs text-zinc-400 sm:inline">
          {isSaving ? t('saving') : isDirty ? (autoSave ? '' : t('unsaved')) : t('autoSaved')}
        </span>
        {!autoSave && isDirty && !isSaving && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => save()}
            className="cursor-pointer gap-1 text-brand hover:text-brand hover:bg-brand-muted"
          >
            <Save className="h-3.5 w-3.5" />
            <span className="text-xs">{t('save')}</span>
          </Button>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOptimizeResume}
          disabled={Boolean(optimizationRequest)}
          className="h-8 cursor-pointer gap-1.5 rounded-md bg-brand-muted px-2.5 text-foreground hover:bg-muted"
          title="AI 优化简历"
        >
          {optimizationRequest && !optimizationRequest.sectionId
            ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            : <Sparkles className="h-3.5 w-3.5" />}
          <span className="hidden text-xs font-medium lg:inline">
            {optimizationRequest && !optimizationRequest.sectionId ? '分析中' : 'AI 优化'}
          </span>
        </Button>

        {/* Primary: undo/redo — always visible */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleUndo}
          disabled={undoStack.length === 0}
          className="h-8 w-8 cursor-pointer"
          title={t('undo')}
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRedo}
          disabled={redoStack.length === 0}
          className="h-8 w-8 cursor-pointer"
          title={t('redo')}
        >
          <Redo2 className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="hidden h-6 sm:block" />

        {/* Desktop: show all secondary buttons */}
        <div className="hidden items-center gap-1 xl:flex">
          <Button
            variant="default"
            size="sm"
            onClick={() => openModal('export')}
            className="cursor-pointer"
            title={t('exportPdf')}
          >
            <Download className="h-4 w-4" />
            <span className="ml-1 text-xs hidden sm:inline">{t('exportPdf')}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openModal('import')}
            className="cursor-pointer"
            title={t('import')}
          >
            <Upload className="h-4 w-4" />
            <span className="ml-1 text-xs hidden sm:inline">{t('import')}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openModal('share')}
            className="cursor-pointer"
            title={t('share')}
          >
            <Share2 className="h-4 w-4" />
            <span className="ml-1 text-xs hidden sm:inline">{t('share')}</span>
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openModal('jd-analysis')}
            className="cursor-pointer"
            title={t('jdAnalysis')}
          >
            <FileSearch className="h-4 w-4" />
            <span className="ml-1 text-xs hidden sm:inline">{t('jdAnalysis')}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openModal('translate')}
            className="cursor-pointer"
            title={t('translate')}
          >
            <Languages className="h-4 w-4" />
            <span className="ml-1 text-xs hidden sm:inline">{t('translate')}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openModal('cover-letter')}
            className="cursor-pointer"
            title={t('coverLetter')}
          >
            <FileText className="h-4 w-4" />
            <span className="ml-1 text-xs hidden sm:inline">{t('coverLetter')}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openModal('grammar-check')}
            className="cursor-pointer"
            title={t('grammarCheck')}
          >
            <SpellCheck className="h-4 w-4" />
            <span className="ml-1 text-xs hidden sm:inline">{t('grammarCheck')}</span>
          </Button>
          <Separator orientation="vertical" className="h-6" />

        </div>

        {/* Mobile: "more" dropdown */}
        <div className="xl:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openModal('export')}>
                <Download className="mr-2 h-4 w-4" />
                {t('exportPdf')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal('import')}>
                <Upload className="mr-2 h-4 w-4" />
                {t('import')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal('share')}>
                <Share2 className="mr-2 h-4 w-4" />
                {t('share')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal('jd-analysis')}>
                <FileSearch className="mr-2 h-4 w-4" />
                {t('jdAnalysis')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal('translate')}>
                <Languages className="mr-2 h-4 w-4" />
                {t('translate')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal('cover-letter')}>
                <FileText className="mr-2 h-4 w-4" />
                {t('coverLetter')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal('grammar-check')}>
                <SpellCheck className="mr-2 h-4 w-4" />
                {t('grammarCheck')}
              </DropdownMenuItem>

            </DropdownMenuContent>
          </DropdownMenu>
        </div>


      </div>
    </div>
  );
}
