import { describe, expect, it } from 'vitest';
import { SAMPLE_CANDIDATE_PROFILE } from './profile-schema';
import { mergeProfileWording } from './profile-optimization';

describe('mergeProfileWording', () => {
  it('accepts wording improvements but preserves factual fields', () => {
    const candidate = structuredClone(SAMPLE_CANDIDATE_PROFILE);
    candidate.personalInfo.fullName = '被模型篡改的姓名';
    candidate.experiences[0].company = '被模型篡改的公司';
    candidate.experiences[0].description = '协同产品与设计团队推进活动执行及用户反馈闭环。';

    const result = mergeProfileWording(SAMPLE_CANDIDATE_PROFILE, candidate);

    expect(result.data.personalInfo.fullName).toBe('林晓雨');
    expect(result.data.experiences[0].company).toBe('杭州星桥网络科技有限公司');
    expect(result.data.experiences[0].description).toContain('协同产品与设计团队');
    expect(result.changes).toContainEqual(expect.objectContaining({
      path: 'experiences.sample-exp-1.description',
    }));
  });
});

