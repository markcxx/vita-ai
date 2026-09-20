import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReferenceTemplate } from '@/components/preview/templates/reference';
import { REFERENCE_TEMPLATES, referenceTheme } from './reference-templates';
import { TEMPLATES } from './template-catalog';
import type { Resume } from '@/types/resume';

function fixture(template: string): Resume {
  return { id: 'test', template, language: 'zh', themeConfig: referenceTheme(template, '#418ac4'), sections: [
    { id: 'personal', type: 'personal_info', visible: true, sortOrder: 0, content: { fullName: '测试姓名', phone: '123', email: 'test@example.com', jobTitle: '工程师', avatar: '/sample.png' } },
    { id: 'education', title: '教育经历', type: 'education', visible: true, sortOrder: 1, content: { items: [{ id: 'e', institution: '测试大学', field: '计算机', degree: '本科', startDate: '2020', endDate: '2024' }] } },
    { id: 'work', title: '工作经历', type: 'work_experience', visible: true, sortOrder: 2, content: { items: [{ id: 'w', company: '测试公司', position: '工程师', description: '<script>alert(1)</script>', highlights: ['**成果**'], startDate: '2024', current: true }] } },
    { id: 'hidden', title: '保密经历', type: 'custom', visible: false, sortOrder: 3, content: { items: [{ id: 'h', title: '不应显示' }] } },
    { id: 'skills', title: '技能', type: 'skills', visible: true, sortOrder: 4, content: { categories: [{ id: 's', name: '开发', skills: ['TypeScript'] }] } },
  ] } as Resume;
}
describe('reference templates', () => {
  for (const template of Object.keys(REFERENCE_TEMPLATES)) {
    it(`${template} renders editable fields and selected color without hidden content`, () => {
      const html = renderToStaticMarkup(<ReferenceTemplate resume={fixture(template)} />);
      expect(TEMPLATES).toContain(template);
      for (const text of ['测试姓名', '测试大学', '测试公司', '工程师', 'TypeScript', '#418ac4', '/sample.png']) expect(html).toContain(text);
      expect(html).not.toContain('不应显示');
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  }
});

// Cover the restored legacy export registry as well as the six new layouts.
describe('template HTML export coverage', () => {
  it('keeps all catalog templates renderable with their content', async () => {
    const { generateHtml } = await import('./resume-export/builders');
    for (const template of TEMPLATES) {
      const html = await generateHtml(fixture(template), true);
      expect(html).toContain('测试姓名');
      expect(html).toContain('测试公司');
      expect(html).not.toContain('不应显示');
      expect(html).toContain('resume-export');
    }
  });
});

describe('document reference layouts', () => {
  const templates = ['folio-ribbon-blue', 'folio-blueprint', 'folio-skyline', 'folio-ember', 'folio-mesh', 'folio-compass'];
  for (const template of templates) {
    it(`${template} reflects edits, reordered sections and removed personal details`, () => {
      const resume = fixture(template);
      resume.sections[0].content.fullName = '修改后的姓名';
      resume.sections[0].content.avatar = '';
      resume.sections[2].sortOrder = -1;
      resume.sections[2].title = '修改后的工作标题';
      const html = renderToStaticMarkup(<ReferenceTemplate resume={resume} />);
      expect(html).toContain('修改后的姓名');
      expect(html).not.toContain('/sample.png');
      expect(html.indexOf('修改后的工作标题')).toBeLessThan(html.indexOf('教育经历'));
      expect(html).toContain(`data-document-template="${template}"`);
      resume.sections[0].visible = false;
      const hidden = renderToStaticMarkup(<ReferenceTemplate resume={resume} />);
      expect(hidden).not.toContain('修改后的姓名');
      expect(hidden).not.toContain('test@example.com');
      expect(hidden).toContain('测试公司');
    });
  }
});
