import type { CandidateProfileData } from '@/types/candidate-profile';

export type ProfileOptimizationChange = {
  path: string;
  label: string;
  before: string | string[];
  after: string | string[];
  reason: string;
};

function changed(before: unknown, after: unknown) {
  return JSON.stringify(before) !== JSON.stringify(after);
}

/** Only copy professional wording fields. Identity, employers, dates, skills and metrics remain factual. */
export function mergeProfileWording(
  original: CandidateProfileData,
  candidate: CandidateProfileData,
): { data: CandidateProfileData; changes: ProfileOptimizationChange[] } {
  const data = structuredClone(original);
  const changes: ProfileOptimizationChange[] = [];

  const add = (
    path: string,
    label: string,
    before: string | string[],
    after: string | string[],
    reason: string,
  ) => {
    if (!changed(before, after) || (typeof after === 'string' && !after.trim())) return;
    changes.push({ path, label, before, after, reason });
  };

  add('summary', '个人简介', original.summary, candidate.summary, '让职业定位和核心优势更清晰');
  if (candidate.summary.trim()) data.summary = candidate.summary;

  for (const item of data.experiences) {
    const improved = candidate.experiences.find((entry) => entry.id === item.id);
    if (!improved) continue;
    add(`experiences.${item.id}.description`, `${item.company} · 经历描述`, item.description, improved.description, '减少口语化表达并明确职责');
    add(`experiences.${item.id}.highlights`, `${item.company} · 工作亮点`, item.highlights, improved.highlights, '使用更专业、结果导向的表述');
    if (improved.description.trim()) item.description = improved.description;
    if (improved.highlights.length > 0) item.highlights = improved.highlights;
  }

  for (const item of data.education) {
    const improved = candidate.education.find((entry) => entry.id === item.id);
    if (!improved) continue;
    add(`education.${item.id}.description`, `${item.institution} · 教育描述`, item.description, improved.description, '突出与求职相关的课程和实践');
    if (improved.description.trim()) item.description = improved.description;
  }

  for (const item of data.projects) {
    const improved = candidate.projects.find((entry) => entry.id === item.id);
    if (!improved) continue;
    add(`projects.${item.id}.description`, `${item.name} · 项目描述`, item.description, improved.description, '明确项目目标、角色和工作内容');
    add(`projects.${item.id}.highlights`, `${item.name} · 项目亮点`, item.highlights, improved.highlights, '强化行动与产出表达');
    if (improved.description.trim()) item.description = improved.description;
    if (improved.highlights.length > 0) item.highlights = improved.highlights;
  }

  return { data, changes };
}

