'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './editor-sections.module.css';
import { getCopy } from '@/lib/copy';
import { GripVertical, X, Eye, EyeOff, Sparkles, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editor-store';
import { useResumeStore } from '@/stores/resume-store';
import { useDragHandle } from './dnd/sortable-section';
import type { ResumeSection, SectionContent } from '@/types/resume';
import { PersonalInfoSection } from './sections/personal-info';
import { SummarySection } from './sections/summary';
import { WorkExperienceSection } from './sections/work-experience';
import { EducationSection } from './sections/education';
import { SkillsSection } from './sections/skills';
import { ProjectsSection } from './sections/projects';
import { CertificationsSection } from './sections/certifications';
import { LanguagesSection } from './sections/languages';
import { CustomSection } from './sections/custom-section';
import { GitHubSection } from './sections/github';
import { QrCodesSection } from './sections/qr-codes';

interface SectionWrapperProps {
  section: ResumeSection;
  onUpdate: (content: Partial<SectionContent>) => void;
  onRemove: () => void;
}

type SectionComponentProps = {
  section: ResumeSection;
  onUpdate: (content: Partial<SectionContent>) => void;
};

const sectionComponents: Record<string, React.ComponentType<SectionComponentProps>> = {
  personal_info: (props) => <PersonalInfoSection {...props} />,
  summary: (props) => <SummarySection {...props} />,
  work_experience: (props) => <WorkExperienceSection {...props} />,
  education: (props) => <EducationSection {...props} />,
  skills: (props) => <SkillsSection {...props} />,
  projects: (props) => <ProjectsSection {...props} />,
  certifications: (props) => <CertificationsSection {...props} />,
  languages: (props) => <LanguagesSection {...props} />,
  github: (props) => <GitHubSection {...props} />,
  qr_codes: (props) => <QrCodesSection {...props} />,
  custom: (props) => <CustomSection {...props} />,
};

export function SectionWrapper({ section, onUpdate, onRemove }: SectionWrapperProps) {
  const t = getCopy('editor');
  const { selectedSectionId, selectSection, optimizationRequest, requestAiOptimization } = useEditorStore();
  const { toggleSectionVisibility, updateSectionTitle } = useResumeStore();
  const { attributes, listeners } = useDragHandle();
  const isSelected = selectedSectionId === section.id;
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(section.title);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [isRenaming]);

  const commitRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== section.title) {
      updateSectionTitle(section.id, trimmed);
    } else {
      setRenameValue(section.title);
    }
    setIsRenaming(false);
  };

  const SectionComponent = sectionComponents[section.type];
  const isRenamable = section.type !== 'personal_info';

  return (
    <div
      data-section-type={section.type}
      className={`${styles.section} rounded-md border transition-[border-color,opacity] duration-200 ${
        isSelected ? 'border-brand/30' : 'border-border/60'
      } ${!section.visible ? 'opacity-50' : ''}`}
      onClick={() => selectSection(section.id)}
    >
      <div className="flex flex-row items-center justify-between px-3 pb-1 pt-3 md:px-4 md:pt-3.5">
        <div className="flex items-center gap-2">
          <GripVertical
            className="h-4 w-4 cursor-grab text-zinc-300 active:cursor-grabbing"
            {...attributes}
            {...listeners}
          />
          {isRenaming ? (
            <input
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') { setRenameValue(section.title); setIsRenaming(false); }
              }}
              className="h-6 w-32 rounded border border-brand bg-transparent px-1 text-sm font-semibold text-zinc-700 outline-none dark:text-zinc-200"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <h3
              className={`text-sm font-semibold text-zinc-700 dark:text-zinc-200 ${isRenamable ? 'cursor-text rounded px-1 -mx-1 hover:bg-zinc-100 dark:hover:bg-zinc-700' : ''}`}
              onDoubleClick={isRenamable ? (e) => { e.stopPropagation(); setRenameValue(section.title); setIsRenaming(true); } : undefined}
            >
              {section.title}
            </h3>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={Boolean(optimizationRequest)}
            className="h-7 cursor-pointer gap-1 rounded-md bg-brand-muted px-2.5 text-foreground hover:bg-muted"
            title={t('aiPolish')}
            onClick={(e) => {
              e.stopPropagation();
              requestAiOptimization({ sectionId: section.id, sectionTitle: section.title });
            }}
          >
            {optimizationRequest?.sectionId === section.id
              ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              : <Sparkles className="h-3.5 w-3.5" />}
            <span className="text-[11px] font-medium">
              {optimizationRequest?.sectionId === section.id ? '分析中' : 'AI 优化'}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 cursor-pointer p-0"
            onClick={(e) => {
              e.stopPropagation();
              toggleSectionVisibility(section.id);
            }}
          >
            {section.visible ? (
              <Eye className="h-3.5 w-3.5 text-zinc-400" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-zinc-400" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 cursor-pointer p-0 text-zinc-400 hover:text-red-500"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="px-4 pb-4 pt-2.5">
        {!section.content || typeof section.content !== 'object' ? (
          <p className="text-sm text-red-400">{t('invalidSectionContent')}</p>
        ) : SectionComponent ? (
          <SectionComponent section={section} onUpdate={onUpdate} />
        ) : (
          <p className="text-sm text-zinc-400">Unknown section type: {section.type}</p>
        )}
      </div>
    </div>
  );
}
