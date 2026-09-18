import { describe, expect, it } from 'vitest';
import { candidateProfileSchema, SAMPLE_CANDIDATE_PROFILES } from './profile-schema';

describe('sample candidate profiles', () => {
  it.each(SAMPLE_CANDIDATE_PROFILES)('validates $personalInfo.fullName', (profile) => {
    expect(candidateProfileSchema.safeParse(profile).success).toBe(true);
  });
});

describe('optional personal links', () => {
  it('retains arbitrary labels and URLs through validation', () => {
    const profile = structuredClone(SAMPLE_CANDIDATE_PROFILES[0]);
    profile.personalInfo.links = [{ id: 'portfolio', label: '教学成果', url: 'https://example.com/teaching' }];
    expect(candidateProfileSchema.parse(profile).personalInfo.links).toEqual(profile.personalInfo.links);
  });
  it('preserves an explicit empty list after all links are removed', () => {
    const profile = structuredClone(SAMPLE_CANDIDATE_PROFILES[0]);
    profile.personalInfo.links = [];
    expect(candidateProfileSchema.parse(profile).personalInfo.links).toEqual([]);
  });
});
