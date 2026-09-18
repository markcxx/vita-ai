import type { InterviewerConfig } from '@/types/interview';

/** Clean old stored labels too; new streamed replies are sanitized by the server. */
export function cleanInterviewerText(text: string, speaker?: InterviewerConfig): string {
  const labels = ['面试官', speaker?.name, speaker?.title,
    speaker ? `${speaker.name} · ${speaker.title}` : undefined,
    speaker ? `${speaker.name}（${speaker.title}）` : undefined,
  ].filter((value): value is string => Boolean(value));
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const names = labels.map(escape).join('|');
  const prefix = new RegExp(`^\\s*(?:\\*\\*)?(?:\\[(?:${names})\\]|【(?:${names})】|(?:${names})(?:\\*\\*)?[:：])(?:\\*\\*)?\\s*[:：]?\\s*`, 'gm');
  return text.replace(prefix, '').replace(/\[ROUND_COMPLETE\]/g, '').trim();
}
