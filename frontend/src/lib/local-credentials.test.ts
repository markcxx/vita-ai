import { describe, expect, it } from 'vitest';
import { emptyCredentials, hasModelCredentials, requiresModelCredentials } from './local-credentials';
describe('user supplied model credentials', () => {
  it('requires key, URL and model together', () => {
    expect(hasModelCredentials(emptyCredentials)).toBe(false);
    expect(hasModelCredentials({ ...emptyCredentials, apiKey: 'key', baseUrl: 'https://example.com' })).toBe(false);
    expect(hasModelCredentials({ ...emptyCredentials, apiKey: 'key', baseUrl: 'https://example.com', model: 'model' })).toBe(true);
  });
  it('gates generation while allowing persisted data access and ordinary edits', () => {
    for (const path of ['/api/ai/chat', '/api/ai/tailored-resume/stream', '/api/interview/id/chat', '/api/interview/id/report', '/api/resume-analysis', '/api/resume/parse']) expect(requiresModelCredentials(path, 'POST')).toBe(true);
    for (const [path, method] of [['/api/ai/chat/sessions', 'GET'], ['/api/resume-analysis', 'GET'], ['/api/resume', 'POST'], ['/api/interview/id/control', 'POST'], ['/api/resume-analysis/id/pdf', 'POST']]) expect(requiresModelCredentials(path, method)).toBe(false);
  });
});
