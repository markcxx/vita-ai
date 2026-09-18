import { describe, expect, it } from 'vitest';
import { getCopy } from './copy';

describe('Chinese UI copy', () => {
  it('reads nested copy without a provider and interpolates values literally', () => {
    expect(getCopy('dashboard')('resumeCount', { count: 3 })).toBe('共 3 份简历');
    expect(getCopy()('dashboard.deleteConfirm', { title: '<我的简历>' })).toContain('「<我的简历>」');
    expect(getCopy('dashboard')).toBe(getCopy('dashboard'));
  });
});
