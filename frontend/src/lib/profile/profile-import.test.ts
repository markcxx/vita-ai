import { describe, expect, it } from 'vitest';
import { EMPTY_CANDIDATE_PROFILE, SAMPLE_CANDIDATE_PROFILE } from './profile-schema';
import { combineProfile, hasProfileContent } from './profile-import';

const empty = () => structuredClone(EMPTY_CANDIDATE_PROFILE);
describe('profile attachment import', () => {
  it('keeps existing contact and summary while filling missing fields', () => {
    const current = empty(), incoming = empty();
    current.personalInfo.fullName = '张三'; current.summary = '已核对的简介';
    incoming.personalInfo.fullName = '李四'; incoming.personalInfo.email = 'demo@example.com'; incoming.summary = '新的简介';
    const result = combineProfile(current, incoming, 'append');
    expect(result.personalInfo.fullName).toBe('张三'); expect(result.personalInfo.email).toBe('demo@example.com');
    expect(result.summary).toBe(current.summary); expect(current.personalInfo.email).toBe('');
  });
  it('merges repeated experiences without replacing edited details or IDs', () => {
    const current = structuredClone(SAMPLE_CANDIDATE_PROFILE), incoming = empty();
    incoming.experiences = [{ ...current.experiences[0], id: 'new-id', description: '不要覆盖', highlights: ['做过几次拉新活动', '新增成果'] }];
    const result = combineProfile(current, incoming, 'append');
    expect(result.experiences).toHaveLength(2);
    expect(result.experiences[0].id).toBe(current.experiences[0].id);
    expect(result.experiences[0].description).toBe(current.experiences[0].description);
    expect(result.experiences[0].highlights).toEqual([...current.experiences[0].highlights, '新增成果']);
  });
  it('preserves separate tenures and assigns fresh IDs to new entries', () => {
    const current = structuredClone(SAMPLE_CANDIDATE_PROFILE), incoming = empty();
    incoming.experiences = [{ ...current.experiences[0], startDate: '2026-01' }];
    const result = combineProfile(current, incoming, 'append');
    expect(result.experiences).toHaveLength(3);
    expect(new Set(result.experiences.map(e => e.id)).size).toBe(3);
  });
  it('retains legacy links and merges new links without hiding them', () => {
    const current = empty(), incoming = empty();
    current.personalInfo.website = 'https://existing.example.com';
    incoming.personalInfo.github = 'https://github.com/example';
    expect(combineProfile(current, incoming, 'append').personalInfo.links?.map(l => l.url)).toEqual(['https://existing.example.com', 'https://github.com/example']);
  });
  it('does not resurrect explicitly removed legacy links', () => {
    const current = empty(); current.personalInfo.website = 'https://old.example.com'; current.personalInfo.links = [];
    expect(combineProfile(current, empty(), 'append').personalInfo.links).toEqual([]);
  });
  it('unions skills and preferences case-insensitively', () => {
    const current = empty(), incoming = empty();
    current.skills = [{ id: 's', name: '工具', skills: ['Excel'] }];
    incoming.skills = [{ id: 'n', name: '工具', skills: ['excel', 'SQL'] }];
    current.preferences.targetRoles = ['产品经理']; incoming.preferences.targetRoles = ['产品经理', '运营'];
    const result = combineProfile(current, incoming, 'append');
    expect(result.skills[0].skills).toEqual(['Excel', 'SQL']); expect(result.preferences.targetRoles).toEqual(['产品经理', '运营']);
  });
  it('replace clears absent old content and marks profile as real', () => {
    const incoming = empty(); incoming.personalInfo.fullName = '新用户';
    const result = combineProfile(SAMPLE_CANDIDATE_PROFILE, incoming, 'replace');
    expect(result.experiences).toEqual([]); expect(result.personalInfo.phone).toBe(''); expect(result.isSample).toBe(false);
  });
  it('refuses overflow instead of dropping entries silently', () => {
    const current = empty(), incoming = empty();
    current.skills = Array.from({ length: 30 }, (_, i) => ({ id: `${i}`, name: `技能${i}`, skills: ['x'] }));
    incoming.skills = [{ id: 'new', name: '新技能', skills: ['y'] }];
    expect(() => combineProfile(current, incoming, 'append')).toThrow();
  });
  it('recognizes profiles containing only preferences or links', () => {
    expect(hasProfileContent(empty())).toBe(false);
    const profile = empty(); profile.preferences.targetRoles = ['教师']; expect(hasProfileContent(profile)).toBe(true);
  });
});
