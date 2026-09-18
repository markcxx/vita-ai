"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { Resume } from "@/types/resume";
import { ResumePaper } from "@/components/dashboard/resume-paper";
import { referenceTheme, TEMPLATE_COLORS } from "@/lib/reference-templates";
import styles from "./live-resume-preview.module.css";

export type LiveResumeState = {
  resume: Resume;
  status: "generating" | "complete" | "error";
  message: string;
};

export function LiveResumePreview({ value, closing = false, onDismiss, onColorChange }: {
  value: LiveResumeState;
  closing?: boolean;
  onDismiss: () => void;
  onColorChange: (color: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!expanded) return;
    const previous = document.activeElement as HTMLElement | null;
    expandButton.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setExpanded(false); }
      if (event.key === "Tab") {
        const buttons = [...(panel.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || [])];
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [expanded]);

  return createPortal(<>
    {expanded && <div className={styles.overlay} onClick={() => setExpanded(false)} aria-hidden="true" />}
    <section ref={panel} className={styles.panel} data-expanded={expanded} data-closing={closing} inert={closing || undefined} role={expanded ? "dialog" : "region"} aria-modal={expanded || undefined} aria-label="简历实时预览">
      <span className="sr-only" role="status">{value.message}</span>
      {(expanded || value.status !== "generating") && <button ref={expandButton} className={styles.close} onClick={() => expanded ? setExpanded(false) : onDismiss()} aria-label={expanded ? "缩回右上角" : "关闭实时预览"}><X size={16} /></button>}
      <div className={styles.paper}>
        <ResumePaper resume={value.resume} fit />
        {!expanded && <button className={styles.paperButton} onClick={() => setExpanded(true)} aria-label="放大简历内容" />}
      </div>
      <div className={styles.colors} role="group" aria-label="简历配色">
        {Array.from(new Set([referenceTheme(value.resume.template).accentColor, ...TEMPLATE_COLORS])).map(color => <button key={color} type="button" aria-label={`配色 ${color}`} title="切换简历配色" aria-pressed={(value.resume.themeConfig?.accentColor || referenceTheme(value.resume.template).accentColor) === color} style={{ backgroundColor: color }} onClick={() => onColorChange(color)} />)}
      </div>
    </section>
  </>, document.body);
}
