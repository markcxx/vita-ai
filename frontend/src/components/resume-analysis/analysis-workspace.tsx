"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ScrollStage } from "@/components/layout/scroll-stage";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
  ArrowRight,
  Check,
  FileText,
  FolderOpen,
  LoaderCircle,
  Upload,
  Trash2,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HeroRadar, ReportRadar } from "./charts";
import { SearchField } from "@/components/ui/search-field";
import type { AnalysisReport } from "./report-types";
import s from "./analysis.module.css";
import { readAnalysisResponse } from "./api-response";
import { AppDialog } from "@/components/ui/AppDialog";
import { StudentStrengthsReport, type StudentReport } from "@/components/student-strengths/report";

type HistoryReport = Pick<AnalysisReport, "id" | "title" | "createdAt"> & { kind?: string };

type ResumeOption = {
  id: string;
  title: string;
  updatedAt: string;
  template: string;
};
type Source =
  { kind: "file"; file: File } | { kind: "resume"; resume: ResumeOption };
export function AnalysisWorkspace() {
  const fileInput = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [studentReport, setStudentReport] = useState<StudentReport | null>(null);
  const [studentOpen, setStudentOpen] = useState(false);
  const [studentError, setStudentError] = useState("");
  const studentRequest = useRef(0);
  const [radar, setRadar] = useState(false),
    [drag, setDrag] = useState(false),
    [source, setSource] = useState<Source | null>(null),
    [picker, setPicker] = useState(false),
    [query, setQuery] = useState(""),
    [resumes, setResumes] = useState<ResumeOption[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [pickerError, setPickerError] = useState(""),
    [busy, setBusy] = useState(false),
    [completed, setCompleted] = useState<AnalysisReport | null>(null),
    [history, setHistory] = useState<
      HistoryReport[]
    >([]),
    [historyError, setHistoryError] = useState("");
  const phase = completed ? 3 : source ? 2 : 1;
  useEffect(() => {
    if (source || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    let scanTimer: ReturnType<typeof setTimeout>;
    let cycleTimer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      scanTimer = setTimeout(() => setRadar(true), 3800);
      cycleTimer = setTimeout(() => {
        setRadar(false);
        schedule();
      }, 11200);
    };
    schedule();
    return () => {
      clearTimeout(scanTimer);
      clearTimeout(cycleTimer);
    };
  }, [source]);
  useEffect(() => {
    let active = true;
    setHistory([]);
    setHistoryError("");
    setCompleted(null);
    setSource(null);
    setStudentOpen(false);
    setStudentReport(null);
    studentRequest.current += 1;
    fetch("/api/resume-analysis", { cache: "no-store" })
      .then(readAnalysisResponse)
      .then((data) => {
        if (active) setHistory(data as HistoryReport[]);
      })
      .catch(() => {
        if (active) setHistoryError("分析记录暂时无法加载");
      });
    return () => {
      active = false;
      abort.current?.abort();
    };
  }, []);
  async function openPicker() {
    setPicker(true);
    setLoading(true);
    setPickerError("");
    try {
      setResumes(await readAnalysisResponse(await fetch("/api/resume")) as ResumeOption[]);
    } catch (e) {
      setPickerError(e instanceof Error ? e.message : "简历加载失败");
    } finally {
      setLoading(false);
    }
  }
  async function deleteReport(id: string) {
    setDeleting(id);
    setHistoryError("");
    try {
      await readAnalysisResponse(await fetch(`/api/resume-analysis/${encodeURIComponent(id)}`, { method: "DELETE" }));
      setHistory((rows) => rows.filter((row) => row.id !== id));
      if (completed?.id === id) { setCompleted(null); setSource(null); setRadar(false); }
      setDeleteTarget(null);
    } catch (e) {
      setHistoryError(e instanceof Error ? e.message : "删除失败，请重试");
    } finally { setDeleting(null); }
  }
  async function openStudentReport(id: string) {
    const request = ++studentRequest.current;
    setStudentReport(null); setStudentError(""); setStudentOpen(true);
    try {
      const result = await readAnalysisResponse(await fetch(`/api/resume-analysis/${encodeURIComponent(id)}`, { cache: "no-store" }));
      if (request === studentRequest.current) setStudentReport(result as unknown as StudentReport);
    } catch (e) {
      if (request === studentRequest.current) setStudentError(e instanceof Error ? e.message : "报告加载失败");
    }
  }
  function chooseFile(file?: File) {
    if (!file) return;
    setError("");
    if (!/\.(pdf|docx)$/i.test(file.name)) {
      setError("请上传 PDF 或 DOCX 格式的简历。");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("文件大小不能超过 10 MB。");
      return;
    }
    const next: Source = { kind: "file", file };
    setSource(next);
    void start(next);
  }
  async function start(selected: Source) {
    if (abort.current) return;
    setCompleted(null);
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError("");
    setRadar(false);
    const body = new FormData();
    if (selected.kind === "file") body.append("file", selected.file);
    else body.append("resumeId", selected.resume.id);
    try {
      const data = await readAnalysisResponse(
        await fetch("/api/resume-analysis", {
          method: "POST",
          body,
          signal: controller.signal,
        }),
      );
      if (controller.signal.aborted) return;
      const result = data as unknown as AnalysisReport;
      if (!result.id || !result.dimensions || !Array.isArray(result.issues)) throw new Error("分析结果暂不完整，请重试。");
      setCompleted(result);
      setHistory((items) => [
        result,
        ...items.filter((item) => item.id !== result.id),
      ]);
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : "分析失败，请重试");
    } finally {
      if (abort.current === controller) {
        setBusy(false);
        abort.current = null;
      }
    }
  }
  return (
    <ScrollStage title="简历分析" actions={
      busy ? <span className="flex items-center gap-2" role="status"><LoaderCircle className="animate-spin" size={15}/>AI 正在分析…</span> : completed ?
      <Button asChild><Link href={`/resume-analysis/${completed.id}`}>查看分析报告<ArrowRight size={15}/></Link></Button> :
      <><Button variant="outline" onClick={openPicker}><FolderOpen size={15}/>我的简历</Button><Button onClick={() => fileInput.current?.click()}><Upload size={15}/>上传简历</Button></>
    }><div className={s.page}>
      <section
        data-scroll-hero
        className={`${s.hero} ${drag ? s.dropActive : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (!busy) chooseFile(e.dataTransfer.files[0]);
        }}
      >
        <div className={s.heroMain}>
          <div>
            <div data-scroll-intro><p className={s.eyebrow}>简历分析 · RESUME ANALYSIS</p>
            <h1>
              看见简历优势，
              <br />
              找到下一步提升方向
            </h1>
            <p className={s.subtitle}>
              从内容表达、阅读体验到岗位匹配，让每一段经历更有说服力。
            </p>
            </div>
            <input
              ref={fileInput}
              hidden
              type="file"
              accept=".pdf,.docx"
              onChange={(e) => {
                chooseFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {!source ? (
              <>
                <div className={s.actions}>
                  <button
                    className={s.primary}
                    onClick={() => fileInput.current?.click()}
                  >
                    <Upload size={15} />
                    上传简历开始分析
                  </button>
                  <button className={s.button} onClick={openPicker}>
                    <FolderOpen size={15} />
                    从我的简历选择
                  </button>
                </div>
                <p className={s.hint}>
                  支持 PDF、DOCX，最大 10 MB · 也可直接拖入文件
                </p>
              </>
            ) : (
              <div className={s.sourceForm}>
                <div className={s.source}>
                  <FileText size={17} />
                  <span>
                    {source.kind === "file"
                      ? source.file.name
                      : source.resume.title}
                  </span>
                  <Check size={14} />
                  {!busy && (
                    <button
                      aria-label="移除简历"
                      onClick={() => {
                        setSource(null);
                        setCompleted(null);
                        setError("");
                        setRadar(false);
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className={s.actions}>
                  {completed ? (
                    <Link
                      className={s.primary}
                      href={`/resume-analysis/${completed.id}`}
                    >
                      查看分析报告
                      <ArrowRight size={15} />
                    </Link>
                  ) : busy ? (
                    <span className={s.progress} role="status">
                      <LoaderCircle className={s.spin} size={16} />
                      AI 正在分析简历…
                    </span>
                  ) : (
                    <button
                      className={s.primary}
                      onClick={() => void start(source)}
                    >
                      重新分析
                    </button>
                  )}
                </div>
              </div>
            )}
            {error && (
              <p role="alert" className={s.error}>
                {error}
              </p>
            )}
          </div>
          <div
            className={s.stage}
            data-radar={Boolean(completed) || (radar && !source)}
            data-analyzing={busy}
          >
            <div aria-hidden="true">
              <div className={s.papers}>
                <div className={`${s.paper} ${s.paperBack}`} />
                <div className={s.paper}>
                  <div className={s.paperHead}>
                    <Image
                      src="/images/templates/sample-cartoon-avatar-reference.png"
                      alt=""
                      width={52}
                      height={62}
                    />
                    <b />
                  </div>
                  <div className={s.paperLines}>
                    {Array.from({ length: 6 }, (_, i) => (
                      <i key={i} />
                    ))}
                  </div>
                </div>
                <div className={s.scanner} />
              </div>
              <div className={s.heroRadar}>
                {completed ? (
                  <ReportRadar report={completed} />
                ) : radar && !source ? (
                  <HeroRadar />
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <ol className={s.steps} aria-label="简历分析流程" data-phase={phase}>
          {[
            ["上传简历", "上传文件或导入站内简历"],
            ["AI 大模型分析", "智能识别简历内容，分析优化方向"],
            ["查看报告", "查看分析结果，获取修改建议"],
          ].map(([title, hint], i) => (
            <li
              className={s.step}
              key={title}
              data-active={phase === i + 1}
              data-done={phase > i + 1}
              aria-current={phase === i + 1 ? "step" : undefined}
            >
              <strong>{title}</strong>
              <small>{hint}</small>
              <span className={s.stepNode}>
                {phase > i + 1 ? (
                  <Check size={17} />
                ) : i === 1 && busy ? (
                  <LoaderCircle className={s.spin} size={19} />
                ) : (
                  <span>0{i + 1}</span>
                )}
              </span>
            </li>
          ))}
        </ol>
      </section>
      <section className={s.section} id="analysis-history">
        <div className={s.sectionHead}>
          <h2>最近分析报告</h2>
          <span className={s.hint}>{history.length} 份报告</span>
        </div>
        {history.length ? (
          history.map((item) => (
            <div key={item.id} className={s.historyRow}>
              <FileText size={16} />
              {item.kind === "student-strengths" ? <button className="min-w-0 flex-1 text-left" onClick={() => void openStudentReport(item.id)}>{item.title}</button> : <Link href={`/resume-analysis/${item.id}`}>{item.title}</Link>}
              <small>
                {new Date(item.createdAt).toLocaleDateString("zh-CN")}
              </small>
              {item.kind === "student-strengths" ? <button className={s.historyEnter} onClick={() => void openStudentReport(item.id)}>查看报告 <ArrowRight size={14} /></button> : <Link className={s.historyEnter} href={`/resume-analysis/${item.id}`}>查看报告 <ArrowRight size={14} /></Link>}
              <button className={s.historyDelete} aria-label={`删除${item.title}`} onClick={() => setDeleteTarget(item.id)}><Trash2 size={15} /></button>
            </div>
          ))
        ) : (
          <p className={s.empty}>
            {historyError || "完成第一次分析后，报告会保存在这里。"}
          </p>
        )}
      </section>
      <AppDialog open={studentOpen} onClose={() => { setStudentOpen(false); studentRequest.current += 1; }} title="学生个人优势特点分析" width={1120} height="88dvh" bodyClassName="!p-0">
        {studentReport ? <StudentStrengthsReport report={studentReport} /> : <p className="p-10 text-center text-sm text-muted-foreground" role="status">{studentError || "正在加载报告…"}</p>}
      </AppDialog>
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>删除分析记录</DialogTitle><DialogDescription>删除后无法恢复，不会删除原简历或个人资料。</DialogDescription></DialogHeader>
          {historyError && <p role="alert">{historyError}</p>}
          <div className={s.actions}>
            <button className={s.button} disabled={!!deleting} onClick={() => setDeleteTarget(null)}>取消</button>
            <button className={s.primary} disabled={!!deleting} onClick={() => { if (deleteTarget) void deleteReport(deleteTarget); }}>{deleting ? "正在删除…" : "删除记录"}</button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={picker} onOpenChange={setPicker}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>从我的简历选择</DialogTitle>
            <DialogDescription>
              选择一份简历，分析当前已保存的内容。
            </DialogDescription>
          </DialogHeader>
          <SearchField
            aria-label="搜索简历"
            value={query}
            onValueChange={setQuery}
            placeholder="搜索简历名称"
          />
          <div className={s.picker}>
            {loading ? (
              <p className={s.empty}>正在加载简历…</p>
            ) : pickerError ? (
              <p className={s.error} role="alert">
                {pickerError}
              </p>
            ) : (
              resumes
                .filter((r) =>
                  r.title.toLowerCase().includes(query.toLowerCase()),
                )
                .map((r) => (
                  <button
                    className={s.pickerItem}
                    key={r.id}
                    onClick={() => {
                      const next: Source = { kind: "resume", resume: r };
                      setSource(next);
                      void start(next);
                      setPicker(false);
                      setError("");
                    }}
                  >
                    <FileText size={24} />
                    <span>
                      {r.title}
                      <small>
                        更新于{" "}
                        {new Date(r.updatedAt).toLocaleDateString("zh-CN")}
                      </small>
                    </span>
                    <ArrowRight size={15} />
                  </button>
                ))
            )}
            {!loading &&
              !pickerError &&
              !resumes.filter((r) =>
                r.title.toLowerCase().includes(query.toLowerCase()),
              ).length && (
                <p className={s.empty}>
                  {resumes.length
                    ? "没有匹配的简历"
                    : "还没有简历，可以先上传文件。"}
                </p>
              )}
          </div>
        </DialogContent>
      </Dialog>
    </div></ScrollStage>
  );
}
