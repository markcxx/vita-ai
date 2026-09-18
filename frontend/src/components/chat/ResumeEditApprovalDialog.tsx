"use client";

import { ArrowRight, Check, FilePenLine, Lightbulb, LoaderCircle, Plus } from "lucide-react";
import { AppDialog } from "@/components/ui/AppDialog";
import { cn } from "@/lib/utils";

export type ResumeEditProposal = {
  toolCallId: string;
  toolName: string;
  requiresApproval: true;
  operation?: string;
  title?: string;
  reason?: string;
  sectionId?: string;
  itemId?: string;
  sectionTitle?: string;
  sectionType?: string;
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  updatedContent?: unknown;
  targetLanguage?: string;
  template?: string;
  preset?: string;
  themeConfig?: unknown;
  sectionIds?: string[];
  newSection?: unknown;
  changes?: {
    field?: string;
    itemId?: string;
    itemLabel?: string;
    issue?: string;
    reason?: string;
    sectionId?: string;
    sectionTitle?: string;
    sectionType?: string;
    oldTitle?: string;
    newTitle?: string;
    oldValue?: unknown;
    newValue?: unknown;
    updatedContent?: unknown;
  }[];
};

const fieldLabels: Record<string, string> = {
  avatar: "头像",
  categories: "技能分类",
  company: "公司",
  content: "内容",
  current: "至今",
  date: "日期",
  degree: "学历",
  description: "描述",
  educationLevel: "学历",
  email: "邮箱",
  endDate: "结束时间",
  field: "专业",
  fullName: "姓名",
  github: "GitHub",
  gpa: "GPA",
  highlights: "亮点",
  institution: "学校",
  issuer: "颁发机构",
  items: "条目",
  jobTitle: "职位",
  language: "语言",
  linkedin: "LinkedIn",
  location: "地点",
  name: "名称",
  phone: "电话",
  position: "岗位",
  proficiency: "熟练度",
  resumeTitle: "简历名称",
  skills: "技能",
  startDate: "开始时间",
  subtitle: "副标题",
  technologies: "技术栈",
  template: "简历模板",
  themeConfig: "主题设置",
  primaryColor: "主色",
  accentColor: "强调色",
  fontFamily: "字体",
  fontSize: "字号",
  lineSpacing: "行距",
  sectionSpacing: "模块间距",
  margin: "页边距",
  avatarStyle: "头像样式",
  text: "内容",
  title: "标题",
  url: "链接",
  website: "网站",
  wechat: "微信",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function labelFor(key: string) {
  return fieldLabels[key] || key;
}

function primitiveToText(value: unknown) {
  if (value === null || value === undefined || value === "") return "空";
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return String(value);
}

export function isEmptyDisplayValue(value: unknown) {
  return value === null
    || value === undefined
    || value === ""
    || (Array.isArray(value) && value.length === 0);
}

function itemTitle(item: Record<string, unknown>, fallback: string) {
  const title = item.name || item.title;
  const companyPosition = [item.company, item.position].filter(Boolean).join(" · ");
  const schoolDegree = [item.institution, item.degree, item.field].filter(Boolean).join(" · ");
  return primitiveToText(title || companyPosition || schoolDegree || fallback);
}

function formatValue(value: unknown, depth = 0): string[] {
  if (value === null || value === undefined || value === "") return ["空"];
  if (typeof value === "string") return value.split("\n").filter(Boolean);
  if (typeof value === "number" || typeof value === "boolean") return [primitiveToText(value)];

  if (Array.isArray(value)) {
    if (value.length === 0) return ["空"];
    if (value.every((item) => typeof item !== "object" || item === null)) {
      return value.map((item) => `• ${primitiveToText(item)}`);
    }

    return value.flatMap((item, index) => {
      if (!isRecord(item)) return [`${index + 1}. ${primitiveToText(item)}`];

      const lines = [`${index + 1}. ${itemTitle(item, `条目 ${index + 1}`)}`];
      Object.entries(item).forEach(([key, inner]) => {
        if (key === "id" || key === "name" || key === "title") return;
        if (inner === null || inner === undefined || inner === "" || (Array.isArray(inner) && inner.length === 0)) return;
        if (Array.isArray(inner) && inner.every((entry) => typeof entry !== "object" || entry === null)) {
          lines.push(`   ${labelFor(key)}：${inner.map(primitiveToText).join("、")}`);
          return;
        }
        if (!isRecord(inner) && !Array.isArray(inner)) {
          lines.push(`   ${labelFor(key)}：${primitiveToText(inner)}`);
        }
      });
      return lines;
    });
  }

  if (isRecord(value)) {
    if (Array.isArray(value.categories)) {
      return formatValue(value.categories, depth + 1);
    }
    if (Array.isArray(value.items)) {
      return formatValue(value.items, depth + 1);
    }

    const lines = Object.entries(value)
      .filter(([key, inner]) => !key.startsWith("_") && key !== "id" && inner !== undefined && inner !== null && inner !== "")
      .flatMap(([key, inner]) => {
        if (Array.isArray(inner) && inner.every((entry) => typeof entry !== "object" || entry === null)) {
          return [`${labelFor(key)}：${inner.map(primitiveToText).join("、") || "空"}`];
        }
        if (!isRecord(inner) && !Array.isArray(inner)) {
          return [`${labelFor(key)}：${primitiveToText(inner)}`];
        }
        return [`${labelFor(key)}：`, ...formatValue(inner, depth + 1).map((line) => `  ${line}`)];
      });

    return lines.length > 0 ? lines : ["空"];
  }

  return [primitiveToText(value)];
}

export function getProposalChanges(proposal: ResumeEditProposal) {
  if (Array.isArray(proposal.changes) && proposal.changes.length > 0) {
    return proposal.changes.map((change, index) => ({
      key: `${change.sectionId || change.field || index}-${index}`,
      label: [
        change.sectionTitle || proposal.sectionTitle,
        change.itemLabel,
        change.field ? labelFor(change.field) : change.newTitle,
      ].filter(Boolean).join(" · ") || `修改 ${index + 1}`,
      oldValue: change.oldValue,
      newValue: change.newValue,
      note: change.issue || change.reason,
    }));
  }

  if (proposal.operation === "add_section") {
    return [
      {
        key: "add-section",
        label: proposal.sectionTitle || "新增模块",
        oldValue: null,
        newValue: proposal.newValue ?? proposal.newSection,
        note: proposal.reason,
      },
    ];
  }

  return [
    {
      key: `${proposal.sectionId || proposal.toolCallId}-${proposal.field || "content"}`,
      label: proposal.sectionTitle
        ? `${proposal.sectionTitle}${proposal.field ? ` · ${labelFor(proposal.field)}` : ""}`
        : proposal.title || "简历修改",
      oldValue: proposal.oldValue,
      newValue: proposal.newValue,
      note: proposal.reason,
    },
  ];
}

export function ResumeDiffText({
  tone,
  value,
}: {
  tone: "old" | "new";
  value: unknown;
}) {
  const lines = formatValue(value).slice(0, 120);

  return (
    <div
      className={cn(
        "min-h-11 max-h-56 overflow-auto rounded-lg px-3 py-2.5 text-[13px] leading-6",
        tone === "old"
          ? "bg-red-50/75 text-red-800 dark:bg-red-500/10 dark:text-red-200"
          : "bg-emerald-50/75 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100",
      )}
    >
      {lines.map((line, index) => (
        <div
          className={cn(
            "whitespace-pre-wrap break-words",
            tone === "old" && line !== "空" && "line-through decoration-red-500/70",
          )}
          key={`${line}-${index}`}
        >
          {line}
        </div>
      ))}
    </div>
  );
}

export function ResumeEditApprovalDialog({
  applying,
  onApply,
  onClose,
  proposal,
}: {
  applying: boolean;
  onApply: (proposal: ResumeEditProposal) => void;
  onClose: () => void;
  proposal: ResumeEditProposal | null;
}) {
  const changes = proposal ? getProposalChanges(proposal) : [];

  return (
    <AppDialog
      bodyClassName="flex min-h-0 flex-col"
      closeDisabled={applying}
      height="min(720px, calc(100dvh - 48px))"
      maskClosable={!applying}
      onClose={onClose}
      open={Boolean(proposal)}
      panelClassName="max-w-[720px]"
      title={
        <span className="flex min-w-0 items-center gap-2">
          <FilePenLine className="shrink-0 text-primary" size={18} />
          <span className="truncate">{proposal?.title || "确认简历修改"}</span>
        </span>
      }
      width={720}
      zIndex={1600}
    >
      {proposal && (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {proposal.reason && (
              <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-amber-50 px-3 py-2.5 text-sm leading-6 text-amber-950 dark:bg-amber-400/10 dark:text-amber-100">
                <Lightbulb className="mt-1 shrink-0 text-amber-500" size={15} />
                <div>
                  <div className="text-xs font-semibold text-amber-700 dark:text-amber-300">修改理由</div>
                  <p className="mt-0.5">{proposal.reason}</p>
                </div>
              </div>
            )}
            <div className="divide-y divide-gray-100 dark:divide-white/[0.08]">
              {changes.map((change) => (
                <section
                  className="py-4 first:pt-0 last:pb-0"
                  key={change.key}
                >
                  <div className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {isEmptyDisplayValue(change.oldValue) ? (
                      <Plus className="text-emerald-500" size={14} />
                    ) : (
                      <FilePenLine className="text-gray-400" size={14} />
                    )}
                    {change.label}
                  </div>
                  {change.note && (
                    <p className="mb-2.5 pl-[22px] text-xs leading-5 text-gray-500 dark:text-gray-400">
                      {change.note}
                    </p>
                  )}
                  <div className="grid items-start gap-2 md:grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)]">
                    <div className="min-w-0">
                      <div className="mb-1 h-4 text-[11px] font-medium text-red-500">原内容</div>
                      {isEmptyDisplayValue(change.oldValue) ? (
                        <div className="flex min-h-11 items-center rounded-lg bg-gray-50 px-3 py-2.5 text-[13px] leading-6 text-gray-400 dark:bg-white/[0.035] dark:text-gray-500">
                          此处原本为空
                        </div>
                      ) : (
                        <ResumeDiffText tone="old" value={change.oldValue} />
                      )}
                    </div>
                    <ArrowRight className="mx-auto mt-8 hidden text-gray-300 md:block dark:text-gray-600" size={15} />
                    <div className="min-w-0">
                      <div className="mb-1 h-4 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        {isEmptyDisplayValue(change.newValue)
                          ? "删除后"
                          : isEmptyDisplayValue(change.oldValue)
                            ? "新增内容"
                            : "修改后"}
                      </div>
                      <ResumeDiffText tone="new" value={change.newValue} />
                    </div>
                  </div>
                </section>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 bg-gray-50/70 px-5 py-3 dark:bg-white/[0.025]">
            <span className="text-xs text-gray-400">应用后将立即更新当前简历</span>
            <div className="flex items-center gap-2">
              <button
                className="h-10 rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50 dark:bg-white/[0.07] dark:text-gray-200 dark:hover:bg-white/[0.11]"
                disabled={applying}
                onClick={onClose}
                type="button"
              >
                暂不应用
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:brightness-95 disabled:opacity-60"
                disabled={applying}
                onClick={() => onApply(proposal)}
                type="button"
              >
                {applying ? <LoaderCircle className="animate-spin" size={15} /> : <Check size={15} />}
                应用修改
              </button>
            </div>
          </div>
        </>
      )}
    </AppDialog>
  );
}
