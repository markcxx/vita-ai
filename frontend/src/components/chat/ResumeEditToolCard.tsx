"use client";

import { useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleCheck,
  FilePenLine,
  Lightbulb,
  LoaderCircle,
  Plus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getProposalChanges,
  isEmptyDisplayValue,
  ResumeDiffText,
  type ResumeEditProposal,
} from "./ResumeEditApprovalDialog";

export type ProposalStatus = "pending" | "applying" | "approved" | "rejected";

const statusLabels: Record<ProposalStatus, string> = {
  pending: "等待批准",
  applying: "正在应用",
  approved: "已应用",
  rejected: "未应用",
};

export function ResumeEditToolCard({
  onApply,
  onReject,
  proposal,
  status,
}: {
  onApply: (proposal: ResumeEditProposal) => void;
  onReject: (proposal: ResumeEditProposal) => void;
  proposal: ResumeEditProposal;
  status: ProposalStatus;
}) {
  const [open, setOpen] = useState(status === "pending" || status === "applying");
  const changes = getProposalChanges(proposal);
  const awaitingDecision = status === "pending" || status === "applying";

  return (
    <section className="my-3 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/10 dark:bg-white/[0.025]">
      <button
        aria-expanded={open}
        className="group/tool flex h-9 w-full items-center gap-2 px-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04]"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
            status === "rejected"
              ? "bg-gray-100 text-gray-400 dark:bg-white/[0.06]"
              : "bg-primary/10 text-primary",
          )}
        >
          {status === "applying" ? (
            <LoaderCircle className="animate-spin" size={12} />
          ) : status === "approved" ? (
            <CircleCheck size={12} />
          ) : status === "rejected" ? (
            <X size={12} />
          ) : (
            <FilePenLine size={12} />
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-600 dark:text-gray-300">
          {proposal.title || "简历修改"}
        </span>
        <span className="shrink-0 text-[11px] text-gray-400 dark:text-gray-500">
          {statusLabels[status]}
        </span>
        <ChevronRight
          className={cn(
            "shrink-0 text-gray-400 transition-transform duration-200",
            open && "rotate-90",
          )}
          size={14}
        />
      </button>

      {open && (
        <div className="border-t border-gray-100 dark:border-white/[0.08]">
          <div className="chat-solid-scrollbar max-h-[480px] overflow-y-auto px-3 py-3">
            {proposal.reason && (
              <div className="mb-3 flex items-start gap-2 rounded-md bg-amber-50/80 px-3 py-2 text-xs leading-5 text-amber-900 dark:bg-amber-400/10 dark:text-amber-100">
                <Lightbulb className="mt-0.5 shrink-0 text-amber-500" size={13} />
                <span>{proposal.reason}</span>
              </div>
            )}

            <div className="divide-y divide-gray-100 dark:divide-white/[0.08]">
              {changes.map((change) => (
                <section className="py-3 first:pt-0 last:pb-0" key={change.key}>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-800 dark:text-gray-200">
                    {isEmptyDisplayValue(change.oldValue) ? (
                      <Plus className="text-emerald-500" size={13} />
                    ) : (
                      <FilePenLine className="text-gray-400" size={13} />
                    )}
                    {change.label}
                  </div>
                  {change.note && (
                    <p className="mb-2 pl-5 text-xs leading-5 text-gray-500 dark:text-gray-400">
                      {change.note}
                    </p>
                  )}
                  <div className="grid items-start gap-2 lg:grid-cols-[minmax(0,1fr)_18px_minmax(0,1fr)]">
                    <div className="min-w-0">
                      <div className="mb-1 text-[10px] font-medium text-red-500">修改前</div>
                      {isEmptyDisplayValue(change.oldValue) ? (
                        <div className="flex min-h-11 items-center rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400 dark:bg-white/[0.035]">
                          此处原本为空
                        </div>
                      ) : (
                        <ResumeDiffText tone="old" value={change.oldValue} />
                      )}
                    </div>
                    <ArrowRight className="mx-auto mt-8 hidden text-gray-300 lg:block dark:text-gray-600" size={13} />
                    <div className="min-w-0">
                      <div className="mb-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        修改后
                      </div>
                      <ResumeDiffText tone="new" value={change.newValue} />
                    </div>
                  </div>
                </section>
              ))}
            </div>
          </div>

          {awaitingDecision && (
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50/70 px-3 py-2.5 dark:border-white/[0.08] dark:bg-white/[0.02]">
              <button
                className="h-8 rounded-md px-3 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200/70 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-white/[0.08]"
                disabled={status === "applying"}
                onClick={() => onReject(proposal)}
                type="button"
              >
                暂不应用
              </button>
              <button
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-60"
                disabled={status === "applying"}
                onClick={() => onApply(proposal)}
                type="button"
              >
                {status === "applying" ? <LoaderCircle className="animate-spin" size={13} /> : <Check size={13} />}
                应用修改
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
