'use client';

import { AppShell } from '@/components/layout/app-shell';
import { usePathname } from 'next/navigation';

export default function InterviewLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isInterviewLobby = pathname.endsWith('/interview');
  const isNewInterview = pathname.endsWith('/interview/new');
  const isReport = pathname.endsWith('/report');
  const isActiveInterview = /\/interview\/[^/]+$/.test(pathname) && !isNewInterview;

  return (
    <AppShell
      contentClassName={isNewInterview || isInterviewLobby || isActiveInterview || isReport ? '!p-0' : undefined}
      contentScrollable={!isActiveInterview && !isInterviewLobby && !isReport}
      immersive={false}
      showHeader={false}
    >
      {children}
    </AppShell>
  );
}
