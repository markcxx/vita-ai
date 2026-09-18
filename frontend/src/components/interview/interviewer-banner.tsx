'use client';

import { Badge } from '@/components/ui/badge';
import { useInterviewStore } from '@/stores/interview-store';
import type { InterviewerConfig } from '@/types/interview';
import { getInterviewerAvatar } from '@/lib/interview/avatar';

interface InterviewerBannerProps {
  config: InterviewerConfig;
  questionCount: number;
}

export function InterviewerBanner({ config, questionCount }: InterviewerBannerProps) {
  const { rounds, currentRoundIndex } = useInterviewStore();
  const currentRound = rounds[currentRoundIndex];

  return (
    <div className="flex items-center gap-3 rounded-xl border border-brand-muted bg-gradient-to-r from-brand-muted/80 to-white p-3 dark:border-brand-muted dark:from-brand-muted/30 dark:to-zinc-900">
      <div className="flex h-11 w-11 items-end justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-muted to-white text-lg font-bold text-white dark:to-zinc-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={getInterviewerAvatar(config.avatar, config.type)} alt="" className="h-full w-full object-contain object-bottom" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{config.name}</span>
          <Badge variant="secondary" className="text-[10px]">
            {config.roundLabel || config.title}
          </Badge>
        </div>
        <p className="truncate text-xs text-zinc-500">{config.style}</p>
      </div>
      <div className="text-center">
        <div className="text-xl font-bold text-brand">{questionCount}</div>
        <div className="text-[10px] text-zinc-400">{currentRound?.maxQuestions ?? 10} 题</div>
      </div>
    </div>
  );
}
