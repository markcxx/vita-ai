import type { ThemeConfig } from '@/types/resume';

export const REFERENCE_TEMPLATES = {
  'folio-cloud': { label: '晴空林语', color: '#71cdd0' },
  'folio-growth': { label: '向上阶梯', color: '#e69a9d' },
  'folio-dots': { label: '点阵书页', color: '#cdd46d' },
  'folio-bookmark': { label: '侧页书签', color: '#cdd46d' },
  'folio-spark': { label: '折线微光', color: '#d3d956' },
  'folio-breeze': { label: '清风侧页', color: '#87d5dc' },

  'folio-diamond': { label: '菱格映衬', color: '#df8589' },
  'folio-floral': { label: '花语细线', color: '#8982da' },
  'folio-gear': { label: '齿轮侧栏', color: '#a19de6' },
  'folio-banner': { label: '柔色横幅', color: '#c9cb70' },
  'folio-prism': { label: '几何棱角', color: '#9c96d8' },
  'folio-notebook': { label: '装订双栏', color: '#eb4c4f' },
  'folio-botanical': { label: '自然剪影', color: '#c8cc61' },
  'folio-line': { label: '清雅线条', color: '#cbd32e' },
  'folio-aqua': { label: '斜切波纹', color: '#55cdd0' },
} as const;
export type ReferenceTemplate = keyof typeof REFERENCE_TEMPLATES;
export function isReferenceTemplate(id: string): id is ReferenceTemplate {
  return Object.hasOwn(REFERENCE_TEMPLATES, id);
}
export const TEMPLATE_COLORS = ['#c9cb70', '#9c96d8', '#eb4c4f', '#55cdd0', '#418ac4', '#469b78', '#c38b55', '#454c58'];
export function referenceTheme(template: string, color?: string): ThemeConfig {
  return {
    primaryColor: '#171717', accentColor: color || (isReferenceTemplate(template) ? REFERENCE_TEMPLATES[template].color : '#171717'),
    fontFamily: 'Arial', fontSize: 'medium', lineSpacing: 1.65,
    margin: { top: 20, right: 20, bottom: 20, left: 20 }, sectionSpacing: 22,
    avatarStyle: ['folio-growth', 'folio-dots', 'folio-bookmark'].includes(template) || template === 'folio-diamond' || template === 'folio-banner' || template === 'folio-prism' || template === 'folio-notebook' ? 'oneInch' : 'circle',
  };
}
