import { AppShell } from "@/components/layout/app-shell";
import { AnalysisWorkspace } from "@/components/resume-analysis/analysis-workspace";
export default function ResumeAnalysisPage() {
  return (
    <AppShell contentClassName="!p-0" contentScrollable={false}>
      <AnalysisWorkspace />
    </AppShell>
  );
}
