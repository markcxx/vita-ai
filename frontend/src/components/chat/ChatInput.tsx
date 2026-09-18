"use client";

import type { RefObject } from "react";
import { ArrowDown, Atom, LoaderCircle, SendHorizontal, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FileTypeIcon } from "./files/FileTypeIcon";
import { ModelBrandIcon } from "./ModelBrandIcon";
import { ChatOptionToggle } from "./ui/ChatOptionToggle";
import { ChatToolMenu } from "./ChatToolMenu";

export type LocalAttachment = {
  content?: string;
  contentType: string;
  error?: string;
  id: string;
  name: string;
  size: number;
};

export type ApprovalMode = "always" | "unrestricted";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export function ChatInput({
  attachments,
  attachmentUploading,
  fileInputRef,
  input,
  isLoading,
  modelId,
  providerId,
  approvalMode,
  onAttachment,
  onAttachmentFiles,
  onJobDescription,
  onApprovalModeChange,
  onInput,
  onKeyDown,
  suggestions = [],
  onUseSuggestion,
  onRemoveAttachment,
  onScrollToBottom,
  onSend,
  onToggleWebSearch,
  placement = "bottom",
  composerRef,
  placeholder = "请围绕简历、岗位、面试和求职规划提问...",
  showScrollToBottom = false,
  showApprovalControl = false,
  showJobDescriptionControl = false,
  textareaRef,
  webSearchEnabled,
  thinkingEnabled,
  thinkingSupported,
  thinkingHint,
  onToggleThinking,
}: {
  attachments: LocalAttachment[];
  attachmentUploading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  input: string;
  isLoading: boolean;
  modelId: string;
  providerId: string;
  approvalMode: ApprovalMode;
  onAttachment: () => void;
  onAttachmentFiles: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onJobDescription: () => void;
  onApprovalModeChange: (mode: ApprovalMode) => void;
  onInput: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  suggestions?: string[];
  onUseSuggestion?: (question: string) => void;
  onRemoveAttachment: (id: string) => void;
  onScrollToBottom?: () => void;
  onSend: () => void;
  onToggleWebSearch: () => void;
  placement?: "bottom" | "center";
  composerRef?: RefObject<HTMLDivElement | null>;
  placeholder?: string;
  showScrollToBottom?: boolean;
  showApprovalControl?: boolean;
  showJobDescriptionControl?: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  webSearchEnabled: boolean;
  thinkingEnabled: boolean;
  thinkingSupported: boolean;
  thinkingHint?: string;
  onToggleThinking: () => void;
}) {
  const hasDraft = Boolean(input.trim() || attachments.length > 0);
  const stopping = isLoading && !hasDraft;

  return (
    <div
      className={cn(
        placement === "bottom"
          ? "chat-input-bottom-placement pointer-events-none absolute bottom-0 left-0 right-0 z-20 flex justify-center px-3 pt-8 md:p-4 md:px-8 md:pb-8 md:pt-10"
          : "w-full",
      )}
    >
      {placement === "bottom" && (
        <div
          aria-hidden="true"
          className="chat-input-overlay absolute inset-y-0 left-0 right-[6px]"
        />
      )}
      <div
        className={cn(
          "relative flex w-full flex-col transition-[max-width] duration-300 ease-out",
          placement === "bottom" ? "pointer-events-auto max-w-[840px]" : "max-w-[760px]",
        )}
        ref={composerRef}
      >
        {placement === "bottom" && showScrollToBottom && onScrollToBottom && (
          <button
            className="chat-input-bg mx-auto mb-2 flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 px-3 text-xs font-medium text-gray-600 shadow-[0_6px_18px_rgba(0,0,0,0.08)] transition-colors hover:text-gray-950 dark:border-white/10 dark:text-gray-300 dark:shadow-[0_8px_22px_rgba(0,0,0,0.28)] dark:hover:text-white"
            onClick={onScrollToBottom}
            type="button"
          >
            <ArrowDown size={14} />
            回到底部
          </button>
        )}

        <div className="chat-input-bg relative z-20 flex flex-col rounded-xl border border-gray-200 shadow-[0_12px_32px_rgba(0,0,0,0.06)] transition-all duration-300 focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/20 dark:border-white/10 dark:shadow-[0_14px_40px_rgba(0,0,0,0.35)] dark:focus-within:border-white/20 dark:focus-within:ring-white/[0.06]">
          <input
            accept=".pdf,.doc,.docx,.txt,.md,.json,.csv,.rtf,image/*"
            className="hidden"
            multiple
            onChange={onAttachmentFiles}
            ref={fileInputRef}
            type="file"
          />

          {(attachments.length > 0 || attachmentUploading) && (
            <div className="flex gap-2 overflow-x-auto px-3 pt-3 md:px-4">
              {attachments.map((file) => (
                <div
                  className="group/file flex h-16 w-[220px] shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-2.5 dark:border-white/10 dark:bg-white/[0.05]"
                  key={file.id}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <FileTypeIcon
                      contentType={file.contentType}
                      name={file.name}
                      tile
                      tileClassName="h-9 w-9"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-gray-700 dark:text-gray-200">
                        {file.name}
                      </span>
                      <span className="block text-[10px] text-gray-400">
                        {file.error ? "解析失败" : formatBytes(file.size)}
                      </span>
                    </span>
                  </div>
                  <button
                    aria-label="移除附件"
                    className="ml-1 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white"
                    onClick={() => onRemoveAttachment(file.id)}
                    type="button"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {attachmentUploading && (
                <div className="flex h-16 shrink-0 items-center gap-2 rounded-lg border border-dashed border-blue-300 bg-blue-50/70 px-3 text-xs text-blue-600 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-300">
                  <LoaderCircle className="animate-spin" size={16} />
                  正在读取文件…
                </div>
              )}
            </div>
          )}

          <textarea
            aria-label="向 AI 助手提问"
            data-markai-composer
            className="max-h-[36dvh] min-h-[56px] w-full resize-none border-none bg-transparent px-3 py-3 text-[16px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 dark:text-gray-100 dark:placeholder:text-gray-500 md:max-h-[200px] md:min-h-[64px] md:px-4 md:py-4 md:text-[15px]"
            onChange={onInput}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            ref={textareaRef}
            rows={1}
            value={input}
          />

          {!input.trim() && !isLoading && suggestions.length > 0 && <div className="flex flex-wrap gap-1.5 px-3 pb-3 md:px-4" aria-label="试试这些问题">
            {suggestions.map(question => <button key={question} type="button" title={question} className="max-w-full truncate rounded-md border border-border/60 bg-muted/35 px-2.5 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:border-primary/25 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary" onClick={() => onUseSuggestion?.(question)}>{question.includes("个人优势") ? "分析个人优势" : question.includes("生成简历") ? "生成我的简历" : question.includes("项目经历") ? "优化项目经历" : question.includes("自我介绍") ? "准备自我介绍" : "检查简历完整性"}</button>)}
          </div>}

          <div className="flex items-center justify-between px-2.5 pb-2.5 pt-1 md:px-3 md:pb-3">
            <div className="flex min-w-0 items-center gap-1">
              <ChatToolMenu
                onStudentStrengths={onUseSuggestion ? () => onUseSuggestion("请结合我的个人资料，分析我的个人优势特点，生成可视化报告。") : undefined}
                webSearchEnabled={webSearchEnabled}
                onToggleWebSearch={onToggleWebSearch}
                disabled={isLoading}
                onAttachment={onAttachment}
                onJobDescription={onJobDescription}
                attachmentDisabled={attachmentUploading || attachments.length >= 4}
                jobDescriptionDisabled={attachments.length >= 4 && !attachments.some(item => item.id.startsWith("job-description-"))}
                showJobDescriptionControl={showJobDescriptionControl}
                showApprovalControl={showApprovalControl}
                approvalMode={approvalMode}
                onApprovalModeChange={onApprovalModeChange}
              />
              <ChatOptionToggle
                label="深度思考"
                checked={thinkingEnabled}
                onChange={onToggleThinking}
                icon={<Atom size={18} />}
                disabled={!thinkingSupported || isLoading}
                hint={thinkingHint}
              />
            </div>
            <div className="flex items-center gap-2">
              <div
                className="hidden h-9 max-w-[220px] items-center gap-2 rounded-lg px-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 sm:flex"
                title={modelId}
              >
                <ModelBrandIcon model={modelId} provider={providerId} size={20} />
                <span className="max-w-[160px] truncate text-[13px]">{modelId}</span>
              </div>
              <button
                aria-label={stopping ? "停止生成" : "发送消息"}
                className={cn(
                  "relative flex h-11 w-11 min-w-11 items-center justify-center overflow-hidden rounded-full bg-gray-950 text-white shadow-sm transition-transform duration-150 ease-out hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:hover:scale-100 dark:bg-white dark:text-gray-950 dark:disabled:bg-gray-700 dark:disabled:text-gray-400 md:h-9 md:w-9 md:min-w-9",
                  stopping &&
                    "bg-red-500 text-white hover:bg-red-600 dark:bg-red-500 dark:text-white dark:hover:bg-red-600",
                )}
                disabled={!input.trim() && attachments.length === 0 && !isLoading}
                onClick={onSend}
                title={stopping ? "停止生成" : "发送"}
                type="button"
              >
                {stopping ? (
                  <>
                    <span className="absolute inset-1 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <Square className="relative z-10" fill="currentColor" size={11} />
                  </>
                ) : (
                  <SendHorizontal size={17} />
                )}
              </button>
            </div>
          </div>
        </div>

        <p className="mt-3 hidden text-center font-jakarta text-xs text-gray-400 sm:block">
          内容由 AI 生成，请注意甄别。
        </p>
      </div>
    </div>
  );
}
