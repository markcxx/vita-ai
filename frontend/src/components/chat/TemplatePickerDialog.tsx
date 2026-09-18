"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/search-field";
import { ResumePaper } from "@/components/dashboard/resume-paper";
import { TEMPLATES } from "@/lib/constants";
import { getTemplateName } from "@/lib/template-catalog";
import { buildMockResume } from "@/lib/template-preview";
import { cn } from "@/lib/utils";

export function TemplatePickerDialog({ value, onConfirm, onClose, purpose = "generate" }: {
  value: string;
  purpose?: "generate" | "switch";
  onConfirm: (template: string) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(value);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(12);
  const previews = useMemo(() => TEMPLATES.map(id => ({ id, name: getTemplateName(id), resume: buildMockResume(id) })), []);
  const matches = previews.filter(item => item.name.includes(query.trim()));
  const active = previews.find(item => item.id === selected);

  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="flex h-[88dvh] w-[calc(100vw-24px)] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
      <DialogHeader className="shrink-0 border-b px-6 py-5 text-left">
        <DialogTitle>选择简历模板</DialogTitle>
        <DialogDescription>{purpose === "switch" ? "选择新模板，保留已有简历内容。图中文字为排版示例。" : "点击模板查看完整样式，确认后立即生成你的简历。图中文字为排版示例。"}</DialogDescription>
      </DialogHeader>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="shrink-0 px-5 py-4"><SearchField value={query} onValueChange={v => { setQuery(v); setLimit(12); }} placeholder="搜索模板名称" /></div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3" aria-label="可选简历模板">
              {matches.slice(0, limit).map(item => <button key={item.id} type="button" aria-pressed={selected === item.id} aria-label={`选择${item.name}`} onClick={() => setSelected(item.id)} className={cn("overflow-hidden rounded-xl border bg-card text-left transition-colors focus-visible:outline-2 focus-visible:outline-primary", selected === item.id ? "border-primary ring-2 ring-primary/15" : "border-border hover:border-primary/50")}>
                <div className="pointer-events-none h-[200px] bg-white p-2 sm:h-[230px]" aria-hidden="true"><ResumePaper resume={item.resume} fit /></div>
                <div className="flex items-center justify-between gap-2 border-t px-3 py-3 text-xs"><span className="truncate">{item.name}</span>{selected === item.id && <Check size={15} className="shrink-0 text-primary" />}</div>
              </button>)}
            </div>
            {!matches.length && <p className="py-12 text-center text-sm text-muted-foreground">没有找到对应模板，试试其他名称。</p>}
            {matches.length > limit && <div className="mt-5 text-center"><Button variant="outline" onClick={() => setLimit(count => count + 12)}>加载更多模板</Button></div>}
          </div>
        </div>
        {active && <aside className="hidden w-[36%] shrink-0 flex-col border-l bg-muted/30 p-5 md:flex">
          <p className="mb-4 text-sm font-medium">{active.name} · 完整预览</p>
          <div className="min-h-0 flex-1"><ResumePaper resume={active.resume} fit /></div>
        </aside>}
      </div>
      <footer className="flex shrink-0 items-center justify-between gap-3 border-t px-5 py-4">
        <span className="min-w-0 truncate text-sm text-muted-foreground">已选：{getTemplateName(selected)}</span>
        <div className="flex shrink-0 gap-2"><Button variant="outline" onClick={onClose}>取消</Button><Button onClick={() => { onConfirm(selected); onClose(); }}>{purpose === "switch" ? "应用模板" : "确认并生成"}</Button></div>
      </footer>
    </DialogContent>
  </Dialog>;
}
