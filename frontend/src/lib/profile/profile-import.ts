import type { CandidateProfileData } from '@/types/candidate-profile';
import { candidateProfileSchema } from './profile-schema';

export type ImportMode = 'append' | 'replace';
const identityKeys: Record<string, string[]> = {
  experiences: ['company', 'position', 'startDate'], education: ['institution', 'degree', 'field', 'startDate'],
  projects: ['name', 'role', 'startDate'], skills: ['name'], certifications: ['name', 'issuer'],
  languages: ['language'], links: ['url'],
};
const normalized = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase().replace(/\s+/g, ' ');
function union(a: string[], b: string[]) {
  const seen = new Set(a.map(normalized));
  return [...a, ...b.filter(value => { const key = normalized(value); if (!key || seen.has(key)) return false; seen.add(key); return true; })];
}
function mergeEntries<T extends { id: string }>(a: T[], b: T[], section: string): T[] {
  const result = structuredClone(a);
  const identity = (item: T) => identityKeys[section].map(key => normalized((item as Record<string, unknown>)[key])).join('|');
  for (const item of b) {
    const key = identity(item);
    const existing = key.replaceAll('|', '') ? result.find(row => identity(row) === key) : undefined;
    if (!existing) { result.push({ ...structuredClone(item), id: crypto.randomUUID() }); continue; }
    const target = existing as Record<string, unknown>;
    for (const [field, value] of Object.entries(item)) {
      if (field === 'id') continue;
      if (Array.isArray(value) && Array.isArray(target[field])) target[field] = union(target[field] as string[], value);
      else if (typeof target[field] === 'string' && !target[field].trim()) target[field] = value;
    }
  }
  return result;
}

export function hasProfileContent(profile: CandidateProfileData): boolean {
  return Boolean(profile.summary.trim() || Object.values(profile.personalInfo).some(v => typeof v === 'string' ? v.trim() : v?.length) ||
    Object.values(profile.preferences).some(v => v.length) ||
    ['experiences', 'education', 'projects', 'skills', 'certifications', 'languages'].some(k => (profile[k as keyof CandidateProfileData] as unknown[]).length));
}

export function combineProfile(current: CandidateProfileData, incoming: CandidateProfileData, mode: ImportMode): CandidateProfileData {
  if (mode === 'replace') return candidateProfileSchema.parse({ ...structuredClone(incoming), isSample: false });
  const result = structuredClone(current);
  for (const key of ['fullName', 'jobTitle', 'email', 'phone', 'wechat', 'location', 'website', 'github', 'linkedin'] as const) {
    if (!result.personalInfo[key].trim()) result.personalInfo[key] = incoming.personalInfo[key];
  }
  const links = (personal: CandidateProfileData['personalInfo']) => personal.links ??
    (['website', 'github', 'linkedin'] as const).filter(key => personal[key].trim())
      .map(key => ({ id: `legacy-${key}`, label: { website: '个人主页', github: 'GitHub', linkedin: 'LinkedIn' }[key], url: personal[key] }));
  result.personalInfo.links = mergeEntries(links(current.personalInfo), links(incoming.personalInfo), 'links');
  if (!result.summary.trim()) result.summary = incoming.summary;
  result.experiences = mergeEntries(result.experiences, incoming.experiences, 'experiences');
  result.education = mergeEntries(result.education, incoming.education, 'education');
  result.projects = mergeEntries(result.projects, incoming.projects, 'projects');
  result.skills = mergeEntries(result.skills, incoming.skills, 'skills');
  result.certifications = mergeEntries(result.certifications, incoming.certifications, 'certifications');
  result.languages = mergeEntries(result.languages, incoming.languages, 'languages');
  for (const key of ['targetRoles', 'targetIndustries', 'preferredLocations'] as const) result.preferences[key] = union(result.preferences[key], incoming.preferences[key]);
  // An append must not relabel retained fictional examples as real history.
  result.isSample = current.isSample;
  return candidateProfileSchema.parse(result);
}
