import { describe, expect, it } from 'vitest';
import {
  getResumeFieldConstraintsPrompt,
  getResumeFieldOptions,
  isValidResumeFieldValue,
} from './field-constraints';

describe('resume field constraints', () => {
  it('uses the editor options as the source of truth', () => {
    const educationOptions = getResumeFieldOptions('personal_info', 'educationLevel');

    expect(educationOptions).toContain('硕士');
    expect(educationOptions).toContain('博士');
    expect(educationOptions).not.toContain('研究生');
  });

  it('rejects unsupported constrained values but allows free-text fields', () => {
    expect(isValidResumeFieldValue('personal_info', 'educationLevel', '硕士')).toBe(true);
    expect(isValidResumeFieldValue('personal_info', 'educationLevel', '研究生')).toBe(false);
    expect(isValidResumeFieldValue('personal_info', 'jobTitle', '产品经理')).toBe(true);
  });

  it('provides every constrained field and option to the model', () => {
    const prompt = getResumeFieldConstraintsPrompt();

    expect(prompt).toContain('personal_info.gender（性别）：男、女');
    expect(prompt).toContain('personal_info.educationLevel（最高学历）：初中、高中、中专、大专、本科、硕士、博士、博士后');
  });
});
