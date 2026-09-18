'use client';

import { getCopy } from '@/lib/copy';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Copy, Eye, Trash2, MoreVertical, Share2, Pencil } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ResumePaper } from './resume-paper';
import styles from './resume-gallery.module.css';
import { getTemplateName } from '@/lib/template-labels';
import type { Resume } from '@/types/resume';

interface ResumeCardProps {
  resume: Resume;
  onDelete: () => void;
  onDuplicate: () => void;
  onRename: (title: string) => void;
  onShare?: () => void;
}

export function ResumeCard({ resume, onDelete, onDuplicate, onRename, onShare }: ResumeCardProps) {
  const t = getCopy();
  const router = useRouter();
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(resume.title);
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewKeyboard = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const renamingRef = useRef(false);

  const startRenaming = () => {
    renamingRef.current = true;
    setIsRenaming(true);
  };

  useEffect(() => {
    if (isRenaming) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isRenaming]);

  const commitRename = useCallback(() => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== resume.title) {
      onRename(trimmed);
    } else {
      setRenameValue(resume.title);
    }
    setIsRenaming(false);
    renamingRef.current = false;
  }, [renameValue, resume.title, onRename]);

  // Commit rename on any click outside the input (fires before blur)
  useEffect(() => {
    if (!isRenaming) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        commitRename();
      }
    };
    document.addEventListener('mousedown', handleMouseDown, true);
    return () => document.removeEventListener('mousedown', handleMouseDown, true);
  }, [isRenaming, commitRename]);

  // On blur, refocus if still renaming (handles Radix focus stealing)
  const handleBlur = useCallback(() => {
    requestAnimationFrame(() => {
      if (renamingRef.current && inputRef.current) {
        inputRef.current.focus();
      }
    });
  }, []);

  const templateLabel = getTemplateName(resume.template);

  return <>
    <article className={styles.card}>
      <div className={styles.thumbnail}>
        <ResumePaper resume={resume} />
        <div className={styles.actions}>
          <button type="button" className={styles.edit} onClick={() => router.push(`/editor/${resume.id}`)}><Pencil size={15} />继续编辑</button>
          <button type="button" className={styles.preview} onClick={event => { previewKeyboard.current = event.detail === 0; setPreviewOpen(true); }}><Eye size={15} />预览简历</button>
        </div>
      </div>
      <div className={styles.info}>
        <div className={styles.infoTop}>
          {isRenaming ? <input ref={inputRef} value={renameValue} aria-label="简历名称"
            onChange={event => setRenameValue(event.target.value)} onBlur={handleBlur}
            onKeyDown={event => {
              if (event.key === 'Enter') { event.preventDefault(); commitRename(); }
              if (event.key === 'Escape') { setRenameValue(resume.title); setIsRenaming(false); renamingRef.current = false; }
            }} className="min-w-0 flex-1 rounded border border-brand bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-brand" />
            : <button type="button" className={styles.title} title={resume.title} onClick={() => router.push(`/editor/${resume.id}`)}>{resume.title}</button>}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t('common.more')}
            className={styles.more}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onCloseAutoFocus={(e) => { if (renamingRef.current) e.preventDefault(); }}>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                startRenaming();
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              {t('common.rename')}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              {t('common.duplicate')}
            </DropdownMenuItem>
            {onShare && (
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onShare();
                }}
              >
                <Share2 className="mr-2 h-4 w-4" />
                {t('share.title')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="cursor-pointer text-red-600"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
        <div className={styles.meta}><span className={styles.template}>{templateLabel}</span></div>
        <p className={styles.updated}>{resume.updatedAt ? t('dashboard.lastEdited', { date: new Date(resume.updatedAt).toLocaleDateString('zh-CN') }) : '尚未编辑'}</p>
      </div>
    </article>
    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
      <DialogContent className="flex h-[92dvh] max-h-[960px] w-[calc(100vw-32px)] max-w-[660px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[660px]"
        onCloseAutoFocus={event => { if (!previewKeyboard.current) event.preventDefault(); }}>
        <DialogHeader className="shrink-0 px-6 py-4"><DialogTitle className="truncate pr-8">{resume.title}</DialogTitle></DialogHeader>
        <div className={styles.dialogStage}><ResumePaper resume={resume} fit /></div>
        <div className={styles.dialogFooter}><span>{templateLabel}</span><Button onClick={() => router.push(`/editor/${resume.id}`)}><Pencil size={14} />继续编辑</Button></div>
      </DialogContent>
    </Dialog>
  </>;
}
