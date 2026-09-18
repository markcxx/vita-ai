'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getInterviewerAvatar } from '@/lib/interview/avatar';
import type { InterviewerConfig } from '@/types/interview';

const AVATAR_GRADIENTS: Record<string, string> = {
  hr: 'from-brand to-brand-hover',
  technical: 'from-blue-500 to-blue-400',
  scenario: 'from-amber-500 to-amber-400',
  behavioral: 'from-purple-500 to-purple-400',
  project_deep_dive: 'from-green-500 to-green-400',
  leader: 'from-slate-600 to-slate-500',
  creative: 'from-fuchsia-500 to-pink-400',
  product: 'from-violet-500 to-indigo-400',
};

const SELECTED_BORDERS: Record<string, string> = {
  hr: 'border-violet-500',
  technical: 'border-blue-500',
  scenario: 'border-amber-500',
  behavioral: 'border-purple-500',
  project_deep_dive: 'border-green-500',
  leader: 'border-slate-500',
  creative: 'border-fuchsia-500',
  product: 'border-violet-500',
};

const SELECTED_BGS: Record<string, string> = {
  hr: 'bg-gradient-to-br from-violet-50 to-fuchsia-50/70 dark:from-violet-950/40 dark:to-fuchsia-950/20',
  technical: 'bg-blue-50 dark:bg-blue-950/30',
  scenario: 'bg-amber-50 dark:bg-amber-950/30',
  behavioral: 'bg-purple-50 dark:bg-purple-950/30',
  project_deep_dive: 'bg-green-50 dark:bg-green-950/30',
  leader: 'bg-slate-50 dark:bg-slate-950/30',
  creative: 'bg-fuchsia-50 dark:bg-fuchsia-950/30',
  product: 'bg-violet-50 dark:bg-violet-950/30',
};

const SELECTED_RINGS: Record<string, string> = {
  hr: 'ring-pink-200 dark:ring-pink-900/60',
  technical: 'ring-blue-200 dark:ring-blue-900/60',
  scenario: 'ring-amber-200 dark:ring-amber-900/60',
  behavioral: 'ring-purple-200 dark:ring-purple-900/60',
  project_deep_dive: 'ring-emerald-200 dark:ring-emerald-900/60',
  leader: 'ring-slate-200 dark:ring-slate-800',
  creative: 'ring-fuchsia-200 dark:ring-fuchsia-900/60',
  product: 'ring-violet-200 dark:ring-violet-900/60',
};

const BADGE_COLORS: Record<string, string> = {
  hr: 'bg-violet-600',
  technical: 'bg-blue-500',
  scenario: 'bg-amber-500',
  behavioral: 'bg-purple-500',
  project_deep_dive: 'bg-green-500',
  leader: 'bg-slate-500',
  creative: 'bg-fuchsia-500',
  product: 'bg-violet-500',
};

interface InterviewerCardProps {
  interviewer: InterviewerConfig;
  selected: boolean;
  onToggle: () => void;
  index?: number;
}

export function InterviewerCard({ interviewer, selected, onToggle, index }: InterviewerCardProps) {
  const type = interviewer.type.startsWith('custom_') ? 'custom' : interviewer.type;
  const gradient = AVATAR_GRADIENTS[type] || 'from-zinc-500 to-zinc-400';
  const borderColor = SELECTED_BORDERS[type] || 'border-zinc-500';
  const bgColor = SELECTED_BGS[type] || 'bg-zinc-50 dark:bg-zinc-950/30';
  const badgeColor = BADGE_COLORS[type] || 'bg-zinc-500';
  const ringColor = SELECTED_RINGS[type] || 'ring-zinc-200 dark:ring-zinc-800';

  return (
    <button
      type="button"
      className={cn(
        'group relative flex min-h-[154px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border p-4 text-center outline-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(50,42,80,0.09)] focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2',
        selected
          ? `${borderColor} ${bgColor} ${ringColor} border-2 shadow-[0_14px_32px_rgba(80,61,130,0.1)] ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900`
          : 'border-zinc-200 bg-white/80 hover:border-violet-200 dark:border-zinc-700 dark:bg-zinc-900/60 dark:hover:border-violet-800'
      )}
      onClick={onToggle}
      aria-pressed={selected}
    >
      {selected && index !== undefined && (
        <div className={cn('absolute right-3 top-3 flex h-6 min-w-6 items-center justify-center gap-0.5 rounded-full px-1.5 text-[9px] font-bold text-white shadow-md', badgeColor)}>
          <Check className="h-3 w-3" />
          {index + 1}
        </div>
      )}
      <div className={cn('mb-3 flex h-[68px] w-[68px] items-end justify-center overflow-hidden rounded-[22px] bg-gradient-to-br text-xs font-bold text-white shadow-[0_10px_24px_rgba(47,39,73,0.15)] ring-4 ring-white transition-transform duration-200 group-hover:scale-[1.03] dark:ring-zinc-800', gradient)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={getInterviewerAvatar(interviewer.avatar, interviewer.type)} alt="" className="h-full w-full object-contain object-bottom" />
      </div>
      <div className="text-sm font-semibold leading-tight text-zinc-900 dark:text-zinc-100">{interviewer.name}</div>
      <div className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">{interviewer.title}</div>
    </button>
  );
}
