"use client";

import { TemplatePickerDialog } from './TemplatePickerDialog';
import { useState } from "react";
import { CheckCircle2, ChevronRight, Eye, FilePlus2, LoaderCircle, Sparkles } from "lucide-react";
import { getTemplateName } from "@/lib/template-catalog";
import { cn } from "@/lib/utils";

export type ResumeGenerationRequest = {
  toolCallId: string;
  toolName: string;
  title: string;
  reason: string;
  targetRole: string;
  jobDescription: string;
  language: "zh" | "en";
  profileVersion: number;
  requiresTemplateSelection: true;
};

export type ResumeGenerationState = {
  status: "ready" | "generating" | "success" | "error";
  error?: string;
  result?: { resumeId: string; title: string };
};

export function ResumeGenerationToolCard({ request, state, onGenerate, onPreview }: {
  request: ResumeGenerationRequest;
  state: ResumeGenerationState;
  onGenerate: (request: ResumeGenerationRequest, template: string) => void;
  onPreview: (resumeId: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [template, setTemplate] = useState("ats");
  const [pickerOpen, setPickerOpen] = useState(false);
  const done = state.status === "success";

  return (
    <section className="my-3 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/10 dark:bg-white/[0.025]">
      <button className="flex h-9 w-full items-center gap-2 px-2.5 text-left hover:bg-gray-50 dark:hover:bg-white/[0.04]" onClick={() => setOpen((value) => !value)} type="button" aria-expanded={open}>
        <span className={cn("flex h-5 w-5 items-center justify-center rounded-md", done ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" : "bg-primary/10 text-primary")}>
          {state.status === "generating" ? <LoaderCircle className="animate-spin" size={12} /> : done ? <CheckCircle2 size={12} /> : <FilePlus2 size={12} />}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-700 dark:text-gray-300">{done ? state.result?.title : request.title}</span>
        <span className="text-[11px] text-gray-400">{state.status === "generating" ? "正在生成" : done ? "已创建" : state.status === "error" ? "生成失败" : "选择模板"}</span>
        <ChevronRight className={cn("text-gray-400 transition-transform", open && "rotate-90")} size={14} />
      </button>
      {open && <div className="border-t border-gray-100 p-3 dark:border-white/[0.08]">
        {!done ? <>
          <div className="mb-3 flex items-start gap-2 rounded-md bg-blue-50/70 px-3 py-2 text-xs leading-5 text-blue-900 dark:bg-blue-500/10 dark:text-blue-100"><Sparkles className="mt-0.5 shrink-0" size={13} />{request.reason}</div>
          <div className="grid gap-3">
            <div className="space-y-1.5"><span className="text-[11px] font-medium text-gray-500">简历模板</span><button type="button" onClick={() => setPickerOpen(true)} disabled={state.status === "generating"} className="flex h-10 w-full items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm hover:bg-muted disabled:opacity-60"><Eye size={16} className="text-muted-foreground" /><span className="flex-1 text-left">{getTemplateName(template)}</span><span className="text-xs text-muted-foreground">查看并选择</span><ChevronRight size={14} /></button></div>
          </div>
          {request.jobDescription && <p className="mt-3 line-clamp-3 rounded-md bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-500 dark:bg-white/[0.035]">已结合岗位招聘信息：{request.jobDescription}</p>}
          {state.error && <p className="mt-2 text-xs text-red-500">{state.error}</p>}
        </> : <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-gray-900 dark:text-gray-100">专项简历已保存到“我的简历”</p><p className="mt-1 text-xs text-gray-500">基于个人资料库 v{request.profileVersion} 生成，可进入编辑器继续修改。</p></div><button className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground" onClick={() => state.result && onPreview(state.result.resumeId)} type="button"><Eye size={14} />预览简历</button></div>}
      </div>}
      {pickerOpen && <TemplatePickerDialog value={template} onConfirm={value => { setTemplate(value); onGenerate(request, value); }} onClose={() => setPickerOpen(false)} />}
    </section>
  );
}
