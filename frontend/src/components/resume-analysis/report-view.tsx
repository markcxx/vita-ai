"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { ScrollStage } from "@/components/layout/scroll-stage";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  BarChart3,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Download,
  FilePenLine,
  RefreshCw,
  ThumbsUp,
} from "lucide-react";
import {
  Gauge,
  BasicsRings,
  ReportRadar,
  ScoreBars,
  DimensionChart,
  WaveOverview,
  StrengthCloud,
} from "./charts";
import { dimensionInfo, scoreText, type AnalysisReport } from "./report-types";
import s from "./analysis.module.css";
import { downloadReportPdf } from "./print-report";
import { toast } from "sonner";
import { useChartAnimation } from "./use-chart-animation";

function CardTitle({
  children,
  color,
  icon,
}: {
  children: ReactNode;
  color: string;
  icon: ReactNode;
}) {
  return (
    <h2
      className={s.cardTitle}
      style={{ "--chart-accent": color } as CSSProperties}
    >
      <span>{icon}</span>
      {children}
    </h2>
  );
}
export function ReportView({
  report,
  example = false,
}: {
  report: AnalysisReport;
  example?: boolean;
}) {
  const reportRef = useRef<HTMLElement>(null);
  const [downloading,setDownloading]=useState(false);
  async function download(){
    if(!reportRef.current||downloading)return;
    setDownloading(true);
    try{await downloadReportPdf(reportRef.current,report.id,report.title);}
    catch(error){toast.error(error instanceof Error?error.message:'报告下载失败');}
    finally{setDownloading(false);}
  }
  useChartAnimation(reportRef, report.id);
  const [expanded, setExpanded] = useState<string[]>([]);
  return (
    <ScrollStage title={report.title} sections={[{id:'report-overview',label:'总览'},{id:'report-strengths',label:'简历优势'},...dimensionInfo.map(info=>({id:info.key,label:info.name}))]} actions={<><Button asChild variant="ghost" size="sm"><Link href="/resume-analysis"><ArrowLeft size={14}/>返回</Link></Button><Button size="sm" disabled={downloading} onClick={download}><Download size={14}/>{downloading?'正在生成…':'下载报告'}</Button></>}>
    <div className={s.reportSurface}>
    <article ref={reportRef} className={s.report}>
      <Link className={s.textButton} href="/resume-analysis">
        <ArrowLeft size={14} />
        返回简历分析
      </Link>
      <header className={s.reportHeader} data-scroll-hero>
        {/* The report uses the project's default template avatar, never an inferred portrait. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={s.reportAvatar}
          src="/images/templates/sample-cartoon-avatar-reference.png"
          alt=""
        />
        <div>
          <h1>{report.title}</h1>
          <p>
            {example
              ? "示例报告 · 仅展示分析效果"
              : `分析时间：${new Date(report.createdAt).toLocaleString("zh-CN")}`}
            　·　{report.target || "暂未设置目标岗位"}
          </p>
        </div>
        <div className={s.reportActions}>
          {report.resumeId && (
            <Link href={`/editor/${report.resumeId}`} className={s.button}>
              <FilePenLine size={14} />
              去修改
            </Link>
          )}
          <Link className={s.button} href="/resume-analysis">
            <RefreshCw size={14} />
            重新分析
          </Link>
          <button
            className={s.primary}
            disabled={downloading}
            aria-busy={downloading}
            onClick={download}
          >
            <Download size={14} />
            {downloading ? "正在生成 PDF…" : "导出 PDF"}
          </button>
        </div>
      </header>
      {report.warnings.length > 0 && (
        <div className={s.notice}>{report.warnings.join("　")}</div>
      )}
      <div className={s.overview} id="report-overview" data-scroll-section>
        <div className={s.overviewLeft}>
          <section className={s.card}>
            <CardTitle color="#13a9ec" icon={<BarChart3 />}>
              求职能量
            </CardTitle>
            <div className={s.gauge}>
              <Gauge score={report.dimensions.get.score} />
            </div>
            <div className={s.legend}>
              {[
                "人事信任指数",
                "HR阅读指数",
                "个人信息指数",
                "岗位匹配指数",
                "求职能量值",
              ].map((l) => (
                <span key={l}>
                  <i />
                  {l}
                </span>
              ))}
            </div>
          </section>
          <section className={s.card}>
            <CardTitle color="#20b0b9" icon={<ClipboardList />}>
              基础信息
            </CardTitle>
            <BasicsRings report={report} />
            <div className={s.statistics}>
              <p>
                <strong>主要模块：{report.basics.sections.length} 个</strong>　
                <small>
                  （{report.basics.sections.join("、") || "未识别"}）
                </small>
              </p>
              <p>
                <strong>全文字数：{report.basics.charCount} 字</strong>　
                <small>阅读时间按文本长度估算</small>
              </p>
              <p>
                <strong>
                  文件页数：
                  {report.basics.pageCount === null
                    ? "暂不可得"
                    : `${report.basics.pageCount} 页`}
                </strong>
              </p>
            </div>
          </section>
        </div>
        <section className={s.card}>
          <CardTitle color="#ab3ded" icon={<ChartNoAxesCombined />}>
            得分指数分布
          </CardTitle>
          <div className={s.reportRadar}>
            <ReportRadar report={report} />
          </div>
          <ScoreBars report={report} />
        </section>
      </div>
      <section className={`${s.card} ${s.strengths}`} id="report-strengths" data-scroll-section>
        <CardTitle color="#138af1" icon={<ThumbsUp />}>
          简历优势点
        </CardTitle>
        <div className={s.strengthBody}>
          <div className={s.strengthText}>
            <h3>简历特色点：</h3>
            <div className={s.tags}>
              {report.strengths.slice(0, 3).map((t, i) => (
                <span className={s.tag} key={i}>
                  {t}
                </span>
              ))}
            </div>
            <h3>优势标签：</h3>
            <div className={s.tags}>
              {report.strengths.slice(3, 7).map((t, i) => (
                <span className={s.tag} key={i}>
                  {t}
                </span>
              ))}
            </div>
            {!report.strengths.length && (
              <p className={s.empty}>暂无足够证据生成优势标签</p>
            )}
          </div>
          <StrengthCloud words={report.strengths} />
        </div>
      </section>
      <section className={`${s.card} ${s.trimg}`}>
        <CardTitle
          color="#5148ff"
          icon={
            <span style={{ fontSize: 8, lineHeight: 1.1 }}>
              TRI
              <br />
              MG
            </span>
          }
        >
          简历 TRIMG 指数分析
        </CardTitle>
        <div className={s.wave}>
          <WaveOverview report={report} />
          <p>
            TRIMG
            从可信表达、阅读体验、信息呈现、岗位匹配与求职能量五个角度分析简历。分数用于辅助完善文档；展开各项建议，可查看原文依据与具体修改方向。
          </p>
        </div>
        <div className={s.issueDivider}>
          <span>
            已为你分析出 TRIMG 指数详情以及 <b>{report.issues.length}</b>{" "}
            个问题与建议
          </span>
        </div>
        {dimensionInfo.map((info) => {
          const d = report.dimensions[info.key];
          const issues = report.issues.filter((i) => i.dimension === info.key);
          const open = expanded.includes(info.key);
          return (
            <section
              className={s.dimensionCard}
              id={info.key}
              data-scroll-section
              key={info.key}
              style={{ "--dimension": info.color } as CSSProperties}
            >
              <div className={s.dimensionTop}>
                <div>
                  <div className={s.dimensionScore}>
                    {scoreText(d.score)}
                    {d.score !== null && "′"}
                  </div>
                  <h3 className={s.dimensionName}>
                    {info.english} {info.name}
                  </h3>
                  <p className={s.dimensionDescription}>{info.description}</p>
                </div>
                <DimensionChart kind={info.key} values={d.values} />
              </div>
              <div className={s.dimensionBottom}>
                <div className={s.tags}>
                  {d.tags.map((tag, i) => (
                    <span className={s.tag} key={i}>
                      {tag}
                    </span>
                  ))}
                </div>
                <p className={s.summary}>
                  <strong>概述：</strong> {d.summary}
                </p>
                <div className={s.expandRow}>
                  <button
                    className={s.expand}
                    aria-expanded={open}
                    aria-controls={`issues-${info.key}`}
                    onClick={() =>
                      setExpanded(
                        open
                          ? expanded.filter((k) => k !== info.key)
                          : [...expanded, info.key],
                      )
                    }
                  >
                    {open ? "收起" : "展开"}
                    {issues.length ? ` · ${issues.length} 条建议` : ""}
                    {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>
                <div id={`issues-${info.key}`} hidden={!open}>
                  <div className={s.issues}>
                    {issues.length ? (
                      issues.map((issue) => (
                        <div key={issue.id} className={s.issue}>
                          <h4>
                            {issue.priority === "high" ? "优先完善 · " : ""}
                            {issue.title}
                          </h4>
                          <blockquote>{issue.evidence}</blockquote>
                          <p>{issue.suggestion}</p>
                          {issue.rewrite && (
                            <p>
                              <strong>改写参考：</strong>
                              {issue.rewrite}
                            </p>
                          )}
                          {report.resumeId && (
                            <Link
                              className={s.textButton}
                              href={`/editor/${report.resumeId}`}
                            >
                              前往编辑简历 →
                            </Link>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className={s.empty}>
                        {d.score === null
                          ? "补充目标岗位或更多信息后可进一步评估。"
                          : "本维度暂无单独修改建议。"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </section>
      <footer className={s.reportDownload}>
        <button className={s.primary} disabled={downloading} aria-busy={downloading} onClick={download}>
          <Download size={16} /> {downloading ? "正在生成 PDF…" : "下载 PDF 报告"}
        </button>
      </footer>
    </article>
    </div></ScrollStage>
  );
}
