'use client';

import { withDefaultAvatars } from '@/lib/resume/avatar-defaults';
import { templatePaletteCSS, legacyAccentCSS } from '@/lib/template-palette';
import { isReferenceTemplate } from '@/lib/reference-templates';
import { useId } from 'react';
import type { Resume, ThemeConfig } from '@/types/resume';
import { BACKGROUND_TEMPLATES } from '@/lib/constants';
import { renderPreviewTemplate } from './template-registry';

interface ResumePreviewProps {
  resume: Resume;
}

const FONT_SIZE_SCALE: Record<string, { body: string; h1: string; h2: string; h3: string }> = {
  small:  { body: '12px', h1: '22px', h2: '15px', h3: '13px' },
  medium: { body: '14px', h1: '26px', h2: '17px', h3: '15px' },
  large:  { body: '16px', h1: '30px', h2: '19px', h3: '17px' },
};

const DEFAULT_THEME: ThemeConfig = {
  primaryColor: '#1a1a1a',
  accentColor: '#18181b',
  fontFamily: 'Inter',
  fontSize: 'medium',
  lineSpacing: 1.5,
  margin: { top: 20, right: 20, bottom: 20, left: 20 },
  sectionSpacing: 16,
  avatarStyle: 'circle',
};

/** Returns true if a hex colour is dark (luminance < 0.4) */
function isDark(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance < 0.4;
}

function buildThemeCSS(scopeId: string, theme: ThemeConfig, template: string): string {
  const s = `[data-theme-scope="${scopeId}"]`;
  const fs = FONT_SIZE_SCALE[theme.fontSize] || FONT_SIZE_SCALE.medium;
  const m = theme.margin;
  const needsPadding = !BACKGROUND_TEMPLATES.has(template);
  const primaryIsDark = isDark(theme.primaryColor);

  return `
    ${templatePaletteCSS(s, theme.accentColor)}
    ${s} > div {
      font-family: ${theme.fontFamily}, 'Noto Sans SC', sans-serif !important;
      line-height: ${theme.lineSpacing} !important;
      ${needsPadding ? `padding-top: ${m.top}px !important; padding-right: ${m.right}px !important; padding-bottom: ${m.bottom}px !important; padding-left: ${m.left}px !important;` : ''}
      --base-body-size: ${fs.body};
      --base-h1-size: ${fs.h1};
      --base-h2-size: ${fs.h2};
      --base-h3-size: ${fs.h3};
      --base-line-spacing: ${theme.lineSpacing};
      --base-section-spacing: ${theme.sectionSpacing}px;
      --base-margin-top: ${m.top}px;
      --base-margin-right: ${m.right}px;
      --base-margin-bottom: ${m.bottom}px;
      --base-margin-left: ${m.left}px;
    }
    ${s} p, ${s} li, ${s} span, ${s} td, ${s} a, ${s} div {
      font-size: ${fs.body} !important;
      line-height: ${theme.lineSpacing} !important;
    }
    ${s} h1:not([style*="color"]) {
      color: ${theme.primaryColor} !important;
      font-size: ${fs.h1} !important;
      line-height: ${theme.lineSpacing} !important;
    }
    ${s} h1[style*="color"] {
      font-size: ${fs.h1} !important;
      line-height: ${theme.lineSpacing} !important;
    }
    ${s} h2:not([style*="color"]) {
      color: ${theme.primaryColor} !important;
      font-size: ${fs.h2} !important;
      line-height: ${theme.lineSpacing} !important;
      border-color: ${theme.accentColor} !important;
    }
    ${s} h2[style*="color"] {
      font-size: ${fs.h2} !important;
      line-height: ${theme.lineSpacing} !important;
      border-color: ${theme.accentColor} !important;
    }
    ${s} h3:not([style*="color"]) {
      color: ${theme.primaryColor} !important;
      font-size: ${fs.h3} !important;
      line-height: ${theme.lineSpacing} !important;
    }
    ${s} h3[style*="color"] {
      font-size: ${fs.h3} !important;
      line-height: ${theme.lineSpacing} !important;
    }
    ${s} [class*="border-b-2"],
    ${s} [class*="border-b-"] {
      border-color: ${theme.accentColor} !important;
    }
    ${s} [class*="bg-blue-"], ${s} [class*="bg-indigo-"],
    ${s} [class*="bg-slate-800"], ${s} [class*="bg-zinc-800"],
    ${s} [class*="bg-teal-"], ${s} [class*="bg-emerald-"] {
      background-color: ${theme.accentColor} !important;
    }
    ${s} [data-section] {
      ${needsPadding ? `margin-bottom: ${theme.sectionSpacing}px !important;` : `padding-bottom: ${theme.sectionSpacing}px !important;`}
    }
    ${primaryIsDark ? `
    ${s} [style*="background"][style*="#"] h1:not([style*="color"]),
    ${s} [style*="background"][style*="#"] h2:not([style*="color"]),
    ${s} [style*="background"][style*="#"] h3:not([style*="color"]),
    ${s} [style*="background"][style*="rgb"] h1:not([style*="color"]),
    ${s} [style*="background"][style*="rgb"] h2:not([style*="color"]),
    ${s} [style*="background"][style*="rgb"] h3:not([style*="color"]),
    ${s} [style*="background"][style*="linear-gradient"] h1:not([style*="color"]),
    ${s} [style*="background"][style*="linear-gradient"] h2:not([style*="color"]),
    ${s} [style*="background"][style*="linear-gradient"] h3:not([style*="color"]),
    ${s} .bg-black h1:not([style*="color"]),
    ${s} .bg-black h2:not([style*="color"]),
    ${s} .bg-black h3:not([style*="color"]) {
      color: #ffffff !important;
    }` : ''}
    ${legacyAccentCSS(s, theme.accentColor)}
  `;
}

export function ResumePreview({ resume }: ResumePreviewProps) {
  const scopeId = useId();
  const theme: ThemeConfig = { ...DEFAULT_THEME, ...(resume.themeConfig || {}) };

  // Defensive: ensure resume.sections is always an array (AI may return invalid/empty data)
  const safeResume = { ...resume, sections: withDefaultAvatars(resume.sections) };

  if (isReferenceTemplate(safeResume.template)) return renderPreviewTemplate(safeResume.template, safeResume);

  return (
    <>
      {/* Load the same Google Fonts used in PDF/HTML export so preview renders
          with identical font metrics (Inter for Latin, Noto Sans SC for CJK). */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Noto+Sans+SC:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <div data-theme-scope={scopeId}>
        <style dangerouslySetInnerHTML={{ __html: buildThemeCSS(scopeId, theme, safeResume.template) }} />
        {renderPreviewTemplate(safeResume.template, safeResume)}
      </div>
    </>
  );
}
