import type { ResumeSection } from '@/types/resume';

/** The same bundled avatar used in the template gallery. Empty string means removed. */
export const DEFAULT_RESUME_AVATAR = '/images/templates/sample-cartoon-avatar-reference.png';

export function resumeAvatar(src: unknown): string {
  return typeof src === 'string' ? src : DEFAULT_RESUME_AVATAR;
}

export function withDefaultAvatars(sections: ResumeSection[] = []): ResumeSection[] {
  return sections.map(section => section.type === 'personal_info'
    ? { ...section, content: { ...section.content, avatar: resumeAvatar(section.content?.avatar) } }
    : section);
}
