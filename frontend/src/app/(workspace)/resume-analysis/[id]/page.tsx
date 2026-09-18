"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { readAnalysisResponse } from "@/components/resume-analysis/api-response";
import { ReportView } from "@/components/resume-analysis/report-view";
import {
  demoReport,
  type AnalysisReport,
} from "@/components/resume-analysis/report-types";
export default function AnalysisReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (id === "example") return;
    let active = true;
    fetch(`/api/resume-analysis/${encodeURIComponent(id)}`)
      .then(readAnalysisResponse)
      .then((d) => {
        if (active) setReport(d as unknown as AnalysisReport);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id]);
  return (
    <AppShell contentClassName="!p-0" contentScrollable={false}>
      {id === "example" ? (
        <ReportView report={demoReport} example />
      ) : report?.id === id ? (
        <ReportView report={report} />
      ) : (
        <div
          className="p-12 text-center text-sm text-muted-foreground"
          role="status"
        >
          {error || "正在加载分析报告…"}
          {error && (
            <Link href="/resume-analysis" className="mt-4 block underline">
              返回简历分析
            </Link>
          )}
        </div>
      )}
    </AppShell>
  );
}
