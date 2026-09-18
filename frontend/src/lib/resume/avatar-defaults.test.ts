import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AvatarImage } from '@/components/preview/avatar-image';
import { buildMockResume } from '@/lib/template-preview';
import { DEFAULT_RESUME_AVATAR, withDefaultAvatars } from './avatar-defaults';

describe('resume avatar defaults', () => {
  it('fills a missing avatar without overwriting an upload or an explicit removal', () => {
    const section = buildMockResume('classic').sections[0];
    for (const avatar of [undefined, 'data:image/png;base64,uploaded', '']) {
      const original = { ...section, content: { ...section.content, avatar } };
      const result = withDefaultAvatars([original])[0];
      expect(result.content.avatar).toBe(avatar ?? DEFAULT_RESUME_AVATAR);
      expect(original.content.avatar).toBe(avatar);
    }
  });

  it('uses a circular default and honors the user shape even when a template supplies a radius', () => {
    const circle = renderToStaticMarkup(createElement(AvatarImage, { src: DEFAULT_RESUME_AVATAR, size: 80, style: { borderRadius: 0 } }));
    expect(circle).toContain('height:80px');
    expect(circle).toContain('border-radius:9999px');
    const portrait = renderToStaticMarkup(createElement(AvatarImage, { src: DEFAULT_RESUME_AVATAR, size: 80, avatarStyle: 'oneInch', style: { borderRadius: '50%' } }));
    expect(portrait).toContain('height:112px');
    expect(portrait).toContain('border-radius:4px');
  });
});
