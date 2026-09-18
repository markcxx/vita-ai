"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChartNoAxesCombined, LoaderCircle } from "lucide-react";
import { AppDialog } from "@/components/ui/AppDialog";
import { StudentStrengthsReport, type StudentReport } from "@/components/student-strengths/report";
import { readAnalysisResponse } from "@/components/resume-analysis/api-response";

export function StudentStrengthsToolCard({ requestId, autoStart }: { requestId: string; autoStart: boolean }) {
  const [report, setReport] = useState<StudentReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const initialAuto = useRef(autoStart);
  const pending = useRef<Promise<StudentReport | null> | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setBusy(true); setError("");
    if (!pending.current) pending.current = (async () => {
      const existing = await fetch(`/api/student-strengths/${encodeURIComponent(requestId)}`, { cache: "no-store" });
      if (existing.ok) return await readAnalysisResponse(existing) as unknown as StudentReport;
      if (existing.status !== 404) { await readAnalysisResponse(existing); return null; }
      if (!initialAuto.current && attempt === 0) return null;
      return await readAnalysisResponse(await fetch("/api/student-strengths", {method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({requestId})})) as unknown as StudentReport;
    })();
    pending.current.then(data => { if(active) { setReport(data); if(data && (initialAuto.current || attempt > 0)) setOpen(true); } }).catch(e => { if(active) setError(e instanceof Error ? e.message : "生成失败，请重试"); }).finally(() => { if(active) setBusy(false); });
    return () => { active = false; };
  }, [requestId, attempt]);
  return <>
    <div className="my-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-semibold"><ChartNoAxesCombined size={18} />学生个人优势特点分析</div>
      <p className="my-3 text-xs leading-6 text-muted-foreground">{busy ? "正在整理资料与分析五项优势维度…" : report ? `已根据个人资料库 v${report.profileVersion} 生成报告` : "基于个人资料库，梳理优势、实践依据与成长建议。"}</p>
      {error && <p role="alert" className="mb-3 text-sm text-red-500">{error} <Link href="/profile" className="underline">完善个人资料</Link></p>}
      <button disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground transition-opacity hover:opacity-85 disabled:opacity-50" onClick={() => { if(report) setOpen(true); else {pending.current=null; setAttempt(x=>x+1);} }}>{busy ? <><LoaderCircle size={14} className="animate-spin" />分析中</> : report ? "查看优势报告" : error ? "重新生成" : "生成报告"}</button>
    </div>
    <AppDialog open={open} onClose={() => setOpen(false)} title="学生个人优势特点分析" width={1120} height="88dvh" bodyClassName="!p-0">
      {report && <StudentStrengthsReport report={report} />}
    </AppDialog>
  </>;
}
