import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import proxy from './proxy';

describe('workspace routing', () => {
  it('preserves queries on old language-prefixed links', async () => {
    for (const prefix of ['zh', 'en']) {
      const response = await proxy(new NextRequest(`http://localhost/${prefix}/templates?tab=all`));
      expect(response.headers.get('location')).toBe('http://localhost/templates?tab=all');
    }
  });
  it('allows business pages without credentials', async () => {
    for (const path of ['/', '/templates', '/dashboard', '/editor/123', '/interview']) {
      const response = await proxy(new NextRequest(`http://localhost${path}`));
      expect(response.headers.get('location')).toBeNull();
      expect(response.headers.get('x-middleware-next')).toBe('1');
    }
  });
});
