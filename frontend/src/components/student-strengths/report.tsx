"use client";

import { useRef, useState } from "react";
import { Download, Sparkles } from "lucide-react";
import { StrengthCloud } from "@/components/resume-analysis/charts";
import { useChartAnimation } from "@/components/resume-analysis/use-chart-animation";
import { downloadReportPdf } from "@/components/resume-analysis/print-report";
import { toast } from "sonner";
import s from "@/components/resume-analysis/analysis.module.css";

export type StudentReport = {
  id: string; title: string; createdAt: string; profileVersion: number; isSample: boolean;
  strengths: string[]; evidenceCount: number; counts: Record<string, number>;
  dimensions: { key: string; label: string; score: number | null; summary: string; tags: string[]; evidence: string[]; suggestions: string[]; incomplete?: boolean }[];
};
const colors = ["#458df0", "#8e80e7", "#48b8af", "#f0a35f", "#e782a8"];
const point = (radius: number, index: number) => `${230 + Math.sin(index * Math.PI * 2 / 5) * radius},${180 - Math.cos(index * Math.PI * 2 / 5) * radius}`;

export function StudentStrengthsReport({ report }: { report: StudentReport }) {
  const ref = useRef<HTMLElement>(null);
  const [downloading,setDownloading]=useState(false);
  async function download(){
    if(!ref.current||downloading)return;
    setDownloading(true);
    try{await downloadReportPdf(ref.current,report.id,report.title);}
    catch(error){toast.error(error instanceof Error?error.message:'报告下载失败');}
    finally{setDownloading(false);}
  }
  useChartAnimation(ref, report.id);
  return <div className={s.reportSurface}><article ref={ref} className={s.report}>
    <header className={s.reportHeader}><div>
      <h1>{report.title}</h1>
      <p>{new Date(report.createdAt).toLocaleString("zh-CN")} · 个人资料库 v{report.profileVersion}{report.isSample ? " · 示例资料" : ""}</p>
    </div></header>
    <div className={s.notice}>根据资料库中的真实记录整理优势。图表表示各维度的材料证据充分度，资料不足不代表能力不足。</div>
    <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
      {[["实践经历", (report.counts.experiences || 0) + (report.counts.projects || 0)], ["教育记录", report.counts.education || 0], ["技能类别", report.counts.skills || 0], ["优势依据", report.evidenceCount]].map(([label, value]) => <div key={label} className={s.card}><div className="text-2xl font-semibold">{value}</div><p className="mt-2 text-xs text-muted-foreground">{label}</p></div>)}
    </div>
    <div className="mb-5 grid gap-5 lg:grid-cols-2">
      <section className={s.card}><h2 className={s.cardTitle}><Sparkles size={18} />优势维度分布</h2>
        <svg viewBox="0 0 460 365" role="img" aria-label={report.dimensions.map(d => `${d.label}：${d.score ?? "资料不足"}`).join("，")}>
          {[.25,.5,.75,1].map(r => <polygon key={r} points={Array.from({length:5}, (_,i) => point(120*r,i)).join(" ")} fill="none" stroke="#dfe5ed" />)}
          {report.dimensions.every(d => d.score !== null) && <polygon points={report.dimensions.map((d,i) => point(120*(d.score ?? 0)/100,i)).join(" ")} fill="#458df033" stroke="#458df0" />}
          {report.dimensions.map((d,i) => <g key={d.key}>
            {d.score !== null && <circle cx={Number(point(120*d.score/100,i).split(',')[0])} cy={Number(point(120*d.score/100,i).split(',')[1])} r="5" fill={colors[i]} />}
            <text x={Number(point(152,i).split(',')[0])} y={Number(point(152,i).split(',')[1])} textAnchor="middle" fill="currentColor" fontSize="13">{d.label}<tspan x={Number(point(152,i).split(',')[0])} dy="19" fill={colors[i]}>{d.score ?? "待补充"}</tspan></text>
          </g>)}
        </svg>
      </section>
      <section className={s.card}><h2 className={s.cardTitle}>个人优势关键词</h2>
        {report.strengths.length ? <StrengthCloud words={report.strengths} /> : <p className={s.empty}>补充具体经历后，可以提炼更多有依据的优势。</p>}
        <div className={s.tags}>{report.strengths.slice(0,6).map(tag => <span className={s.tag} key={tag}>{tag}</span>)}</div>
      </section>
    </div>
    {report.dimensions.map((d,i) => <section key={d.key} className={`${s.card} mb-5`}>
      <div className="flex items-center justify-between gap-4"><h2 className={s.cardTitle}>{d.label}</h2><strong style={{color: colors[i]}} className="text-xl">{d.score === null ? (d.incomplete ? "未完成" : "待补充") : `${d.score} / 100`}</strong></div>
      <svg viewBox="0 0 800 18" className="mb-4 w-full" role="img" aria-label={`${d.label}证据充分度 ${d.score ?? "待补充"}`}><rect width="800" height="8" rx="4" fill="#edf0f4" />{d.score !== null && <rect width={d.score*8} height="8" rx="4" fill={colors[i]} />}</svg>
      <p className="text-sm leading-7">{d.summary}</p>
      <div className="mt-4 grid gap-5 md:grid-cols-2"><div><h3 className="mb-2 text-sm font-semibold">资料依据</h3>{d.evidence.length ? d.evidence.map((quote,j) => <blockquote key={j} className="mb-2 border-l-2 border-border bg-muted/40 px-3 py-2 text-sm leading-6 text-muted-foreground">{quote}</blockquote>) : <p className="text-sm text-muted-foreground">尚无足够记录。</p>}</div>
        <div><h3 className="mb-2 text-sm font-semibold">下一步可以做什么</h3><ul className="list-inside list-disc space-y-2 text-sm leading-6">{d.suggestions.map((suggestion,j) => <li key={j}>{suggestion}</li>)}</ul></div></div>
    </section>)}
    <footer className={s.reportDownload}><button className={s.primary} disabled={downloading} aria-busy={downloading} onClick={download}><Download size={16} />{downloading?"正在生成 PDF…":"下载 PDF 报告"}</button></footer>
  </article></div>;
}
