'use client';
export type LocalCredentials = { provider: string; baseUrl: string; model: string; apiKey: string; voiceApiKey: string };
export const emptyCredentials: LocalCredentials = { provider: 'openai', baseUrl: '', model: '', apiKey: '', voiceApiKey: '' };
let owner: string | null = null;
export function setCredentialOwner(userId: string | null) { owner = userId; }
export function loadCredentials(): LocalCredentials {
  if (typeof window === 'undefined' || !owner) return { ...emptyCredentials };
  try { return { ...emptyCredentials, ...JSON.parse(localStorage.getItem(`vitaai:credentials:${owner}`) || '{}') }; } catch { return { ...emptyCredentials }; }
}
export function saveCredentials(value: LocalCredentials) {
  if (!owner) throw new Error('请先登录');
  localStorage.setItem(`vitaai:credentials:${owner}`, JSON.stringify(value));
}
export function credentialHeaders(): Record<string, string> {
  const value = loadCredentials();
  const headers: Record<string, string> = {};
  if (value.apiKey.trim()) {
    headers['x-ai-api-key'] = value.apiKey.trim();
    headers['x-ai-provider'] = value.provider;
    if (value.baseUrl.trim()) headers['x-ai-base-url'] = value.baseUrl.trim();
    if (value.model.trim()) headers['x-ai-model'] = value.model.trim();
  }
  if (value.voiceApiKey.trim()) headers['x-voice-api-key'] = value.voiceApiKey.trim();
  return headers;
}

export function hasModelCredentials(value = loadCredentials()): boolean {
  return Boolean(value.apiKey.trim() && value.baseUrl.trim() && value.model.trim());
}
export function requiresModelCredentials(path: string, method: string): boolean {
  if (method.toUpperCase() !== 'POST') return false;
  return /^\/api\/ai\/(chat|jd-analysis|grammar-check|cover-letter|generate-resume|profile\/optimize|tailored-resume(?:\/stream)?|translate|resume-edit\/optimize)$/.test(path)
    || /^\/api\/interview\/[^/]+\/(chat|report)$/.test(path)
    || ['/api/resume/parse', '/api/resume-analysis', '/api/student-strengths'].includes(path);
}
