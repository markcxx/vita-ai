'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { InterviewReportView } from '@/components/interview/interview-report';
import { Button } from '@/components/ui/button';
import { useSettingsStore, getAIHeaders } from '@/stores/settings-store';
import type { InterviewReport, InterviewSession } from '@/types/interview';

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const requestStarted = useRef('');
  const hydrated = useSettingsStore(s => s._hydrated);

  useEffect(() => {
    if (!hydrated) return;
    const key = `${id}:${attempt}`;
    if (requestStarted.current === key) return;
    requestStarted.current = key;

    const headers = { 'Content-Type': 'application/json',  ...getAIHeaders() };
    async function load() {
      try {
        const detail = await fetch(`/api/interview/${id}`, { headers });
        if (!detail.ok) throw new Error('面试记录加载失败');
        const data = await detail.json();
        if (requestStarted.current !== key) return;
        setSession(data.session);
        // Existing reports are reused; a finished interview starts generation automatically.
        if (data.report) { setReport(data.report); return; }
        const response = await fetch(`/api/interview/${id}/report`, { method: 'POST', headers, body: '{}' });
        if (!response.ok) throw new Error('生成面试报告失败');
        const result = await response.json();
        if (requestStarted.current === key) setReport(result);
      } catch {
        if (requestStarted.current === key) setReport(null);
      } finally {
        if (requestStarted.current === key) setLoading(false);
      }
    }
    void load();
  }, [id, hydrated, attempt]);

  if (loading) return <div className="flex min-h-[65vh] flex-col items-center justify-center gap-4"><Loader2 className="size-8 animate-spin text-sky-500"/><h1 className="text-xl font-semibold">正在整理你的面试报告</h1><p className="text-sm text-muted-foreground">分析回答、汇总各项能力与改进建议，完成后自动展示。</p></div>;
  if (!report || !session) return <div className="flex min-h-[65vh] flex-col items-center justify-center gap-4"><h1 className="text-lg font-medium">暂时未能加载面试报告</h1><p className="text-sm text-muted-foreground">面试记录已保留，可以重新获取报告。</p><div className="flex gap-3"><Button onClick={() => { setLoading(true); setAttempt(value => value + 1); }}>重试</Button><Link href="/interview"><Button variant="outline">返回模拟面试</Button></Link></div></div>;
  return <InterviewReportView report={report} session={session} />;
}
