import { describe, expect, it } from 'vitest';
import { isChineseInterviewReport } from './report-language';

describe('interview report language', () => {
  it('recognizes a Chinese report that contains English technical terms', () => {
    expect(isChineseInterviewReport({
      overallFeedback: '候选人的 React 和 TypeScript 基础扎实，能够清楚解释组件设计。',
      improvementPlan: [{ area: '系统设计', description: '建议加强 API 边界和缓存策略。' }],
    })).toBe(true);
  });

  it('rejects an English report with a small amount of Chinese metadata', () => {
    expect(isChineseInterviewReport({
      interviewerName: '技术面试官',
      overallFeedback: 'The candidate communicated clearly but needs stronger system design experience.',
      improvementPlan: [{ area: 'Architecture', description: 'Study distributed systems fundamentals.' }],
    })).toBe(false);
  });
});
