'use client';

import { getCopy } from '@/lib/copy';
import { cn } from '@/lib/utils';
import type { InterviewReport, InterviewSession } from '@/types/interview';

function getGrade(score: number): { key: string; color: string; bg: string; border: string } {
  if (score >= 90) return { key: 'excellent', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800' };
  if (score >= 75) return { key: 'good', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800' };
  if (score >= 60) return { key: 'pass', color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950/30', border: 'border-yellow-200 dark:border-yellow-800' };
  return { key: 'needsImprovement', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800' };
}

interface ReportOverviewProps {
  report: InterviewReport;
  session: InterviewSession;
}

export function ReportOverview({ report, session }: ReportOverviewProps) {
  const t = getCopy('interview.report');
  const grade = getGrade(report.overallScore);
  const interviewers = session.selectedInterviewers;

  return (
    <div className="rounded-lg border bg-white p-6 dark:bg-zinc-900">
      <div className="mb-5 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5">
        <div className="relative w-52 shrink-0 text-center" role="img" aria-label={`综合得分 ${report.overallScore} 分`}>
          <svg viewBox="0 0 220 130" className="w-full" aria-hidden="true">
            <path d="M 20 110 A 90 90 0 0 1 200 110" fill="none" stroke="#eef2f5" strokeWidth="16" strokeLinecap="round"/>
            <path d="M 20 110 A 90 90 0 0 1 200 110" fill="none" stroke="#68bda9" strokeWidth="16" strokeLinecap="round" pathLength="100" strokeDasharray={`${Math.max(0, Math.min(100, report.overallScore))} 100`}/>
            <text x="110" y="88" textAnchor="middle" fill="currentColor" fontSize="38" fontWeight="700">{report.overallScore}</text>
            <text x="110" y="114" textAnchor="middle" fill="#71717a" fontSize="12">综合表现 / 100</text>
          </svg>
          <span className={cn('text-xs font-semibold', grade.color)}>{t(`grade.${grade.key}`)}</span>
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h2 className="mb-1 text-xl font-bold">{session.jobTitle}</h2>
          <p className="text-sm text-zinc-500">
            {new Date(session.createdAt).toLocaleDateString()}
            {' · '}
            {interviewers.length} 位面试官
            {' · '}
            {t('overallScore')} {report.overallScore}/100
          </p>
        </div>
      </div>
      <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
        <h3 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">{t('overview')}</h3>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {report.overallFeedback}
        </p>
      </div>
    </div>
  );
}
