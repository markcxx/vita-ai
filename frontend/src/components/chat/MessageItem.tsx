"use client";

import type { RefObject } from "react";
import { useMemo, useRef, useState } from "react";
import {
  Copy,
  Languages,
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  RotateCw,
  Share2,
  Trash2,
} from "lucide-react";
import { FirstTokenLoader } from "./FirstTokenLoader";
import { FileTypeIcon } from "./files/FileTypeIcon";
import { FloatingMenu, type FloatingMenuItem } from "./FloatingMenu";
import { MarkdownContent } from "./MarkdownContent";
import { MessageActionButton } from "./MessageActionButton";
import { ModelAvatar } from "./ModelAvatar";
import { ThinkingPanel } from "./ThinkingPanel";
import type { LocalAttachment } from "./ChatInput";
import type { ResumeEditProposal } from "./ResumeEditApprovalDialog";
import { ResumeEditToolCard, type ProposalStatus } from "./ResumeEditToolCard";
import { ResumeGenerationToolCard, type ResumeGenerationRequest, type ResumeGenerationState } from "./ResumeGenerationToolCard";
import { StudentStrengthsToolCard } from "./StudentStrengthsToolCard";

export type ChatMessage = {
  attachments?: LocalAttachment[];
  blocks?: ChatMessageBlock[];
  resumeEditProposals?: ResumeEditProposal[];
  resumeGenerationRequests?: ResumeGenerationRequest[];
  id: string;
  sourceMessageIds?: string[];
  content: string;
  createdAt?: Date;
  isStreaming?: boolean;
  role: "assistant" | "user";
};

export type ChatMessageBlock =
  | { key: string; type: "text"; content: string }
  | { key: string; type: "reasoning"; content: string; thinking?: boolean }
  | { key: string; type: "student-strengths"; requestId: string; createdAt?: string }
  | { key: string; type: "resume-edit"; proposal: ResumeEditProposal }
  | { key: string; type: "resume-generation"; request: ResumeGenerationRequest };

function formatRelativeTime(date?: Date) {
  if (!date) return "";
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function MoreMenuButton({
  align,
  items,
}: {
  align: "left" | "right";
  items: FloatingMenuItem[];
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <>
      <MessageActionButton
        icon={MoreHorizontal}
        onClick={() => setOpen((value) => !value)}
        ref={buttonRef}
        title="更多"
      />
      <FloatingMenu
        align={align}
        anchorRef={buttonRef as RefObject<HTMLElement | null>}
        items={items}
        onClose={() => setOpen(false)}
        open={open}
      />
    </>
  );
}

function MessageEditor({
  content,
  onCancel,
  onSave,
}: {
  content: string;
  onCancel: () => void;
  onSave: (content: string) => void;
}) {
  const [draft, setDraft] = useState(content);

  return (
    <div className="chat-input-bg w-full rounded-xl border border-gray-200 p-3 shadow-[0_8px_24px_rgba(0,0,0,0.06)] dark:border-white/10 dark:shadow-[0_12px_30px_rgba(0,0,0,0.24)]">
      <textarea
        aria-label="编辑消息内容"
        autoFocus
        className="chat-font-size max-h-[55dvh] min-h-[160px] w-full resize-y rounded-lg border border-gray-200 bg-transparent px-3 py-3 leading-relaxed text-gray-900 outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/15 dark:border-white/10 dark:text-gray-100"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
            return;
          }
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            onSave(draft);
          }
        }}
        value={draft}
      />
      <div className="mt-3 flex justify-end gap-2">
        <button
          className="h-9 rounded-md px-3 text-sm text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.07]"
          onClick={onCancel}
          type="button"
        >
          取消
        </button>
        <button
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-white transition-opacity hover:opacity-85 dark:text-gray-900"
          onClick={() => onSave(draft)}
          type="button"
        >
          保存
        </button>
      </div>
    </div>
  );
}

export function MessageItem({
  message,
  modelId,
  providerId,
  onCopy,
  onDelete,
  onEdit,
  onMenuUnavailable,
  onApplyProposal,
  onGenerateResume,
  onPreviewResume,
  onRegenerate,
  onRejectProposal,
  proposalStatuses,
  generationStates,
}: {
  message: ChatMessage;
  modelId: string;
  providerId: string;
  onCopy: (message: ChatMessage) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, content: string) => void;
  onMenuUnavailable: (label: string) => void;
  onApplyProposal: (proposal: ResumeEditProposal) => void;
  onGenerateResume: (request: ResumeGenerationRequest, template: string) => void;
  onPreviewResume: (resumeId: string) => void;
  onRegenerate?: (message: ChatMessage) => void;
  onRejectProposal: (proposal: ResumeEditProposal) => void;
  proposalStatuses: Record<string, ProposalStatus>;
  generationStates: Record<string, ResumeGenerationState>;
}) {
  const relativeTime = formatRelativeTime(message.createdAt);
  const [editing, setEditing] = useState(false);
  const attachments = message.attachments || [];
  const resumeEditProposals = message.resumeEditProposals || [];
  const resumeGenerationRequests = message.resumeGenerationRequests || [];
  const blocks = message.blocks || [];
  const hasReasoning = blocks.some((block) => block.type === "reasoning");
  const menuItems = useMemo<FloatingMenuItem[]>(
    () => [
      { icon: Pencil, label: "编辑", onClick: () => setEditing(true) },
      { icon: Copy, label: "复制", onClick: () => onCopy(message) },
      ...(onRegenerate
        ? [{ icon: RotateCw, label: "重新生成", onClick: () => onRegenerate(message) }]
        : []),
      {
        icon: Languages,
        label: "翻译",
        submenu: [
          { label: "翻译成中文", onClick: () => onMenuUnavailable("翻译") },
          { label: "翻译成英文", onClick: () => onMenuUnavailable("翻译") },
        ],
      },
      { icon: MessageSquarePlus, label: "创建子话题", onClick: () => onMenuUnavailable("创建子话题") },
      { icon: Share2, label: "分享", onClick: () => onMenuUnavailable("分享") },
      { danger: true, icon: Trash2, label: "删除", onClick: () => onDelete(message.id) },
    ],
    [message, onCopy, onDelete, onMenuUnavailable, onRegenerate],
  );

  if (message.role === "user") {
    return (
      <div className="relative flex w-full justify-end" data-message-id={message.id}>
        <div className="group group/message relative flex w-full flex-col items-end">
          {relativeTime && (
            <time className="mb-2 mr-1 text-xs text-gray-400 opacity-100 transition-opacity duration-200 md:opacity-0 md:group-hover/message:opacity-100 dark:text-gray-500">
              {relativeTime}
            </time>
          )}

          {editing ? (
            <div className="w-full max-w-[720px]">
              <MessageEditor
                content={message.content}
                onCancel={() => setEditing(false)}
                onSave={(content) => {
                  onEdit(message.id, content);
                  setEditing(false);
                }}
              />
            </div>
          ) : (
            <>
              {attachments.length > 0 && (
                <div className="mb-2 flex w-full max-w-[360px] flex-col items-stretch gap-2">
                  {attachments.map((file) => (
                    <div
                      className="group/file grid min-h-16 w-full grid-cols-[44px_minmax(0,1fr)] items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left shadow-sm transition-[border-color,background-color,box-shadow] hover:border-gray-300 hover:bg-gray-50/70 hover:shadow-md dark:border-white/10 dark:bg-[#191919] dark:hover:border-white/20 dark:hover:bg-[#1d1d1d]"
                      key={file.id}
                    >
                      <FileTypeIcon
                        className="h-[22px] w-[22px]"
                        contentType={file.contentType}
                        name={file.name}
                        tile
                        tileClassName="h-11 w-11"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {file.name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">
                          {file.contentType || "文件"} · {file.error ? "解析失败" : formatBytes(file.size)}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="chat-font-size chat-user-bubble-bg flex w-fit max-w-[92%] flex-col gap-3 break-words rounded-2xl rounded-tr-sm px-4 py-3 text-left text-gray-900 shadow-sm dark:text-gray-100 md:max-w-[85%] md:px-5">
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </>
          )}

          {!editing && (
            <div className="mr-1 mt-2 flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
              <MessageActionButton icon={Pencil} onClick={() => setEditing(true)} title="编辑" />
              <MessageActionButton icon={Copy} onClick={() => onCopy(message)} title="复制" />
              <MessageActionButton
                danger
                icon={Trash2}
                onClick={() => onDelete(message.id)}
                title="删除"
              />
              <MoreMenuButton align="right" items={menuItems} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full" data-message-id={message.id}>
      <div className="group group/message relative w-full">
        <div className="message-header mb-3 flex items-center gap-2.5">
          <ModelAvatar model={modelId} provider={providerId} />
          <div className="flex min-w-0 flex-col">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-jakarta text-[15px] font-bold text-gray-900 dark:text-gray-100">
                {modelId}
              </span>
              {relativeTime && (
                <time className="shrink-0 text-xs text-gray-400 opacity-100 transition-opacity duration-200 md:opacity-0 md:group-hover/message:opacity-100 dark:text-gray-500">
                  {relativeTime}
                </time>
              )}
            </div>
            {message.isStreaming && !message.content && !hasReasoning && (
              <span className="mt-0.5 animate-pulse text-xs font-medium text-gray-400">
                正在思考…
              </span>
            )}
          </div>
        </div>

        <div className="markdown-body chat-font-size ml-10 leading-relaxed text-gray-900 dark:text-gray-100">
          {editing ? (
            <MessageEditor
              content={message.content}
              onCancel={() => setEditing(false)}
              onSave={(content) => {
                onEdit(message.id, content);
                setEditing(false);
              }}
            />
          ) : (
            <>
              {blocks.length > 0 ? blocks.map((block, index) => {
                const isLastBlock = index === blocks.length - 1;
                if (block.type === "text") {
                  return (
                    <div className={index > 0 ? "mt-4" : undefined} key={block.key}>
                      <MarkdownContent>{block.content}</MarkdownContent>
                      {message.isStreaming && isLastBlock && (
                        <span className="ml-1 inline-block h-4 w-2 animate-pulse rounded-full bg-primary align-middle" />
                      )}
                    </div>
                  );
                }
                if (block.type === "reasoning") {
                  return (
                    <div className={index > 0 ? "mt-4" : undefined} key={block.key}>
                      <ThinkingPanel content={block.content} thinking={block.thinking} />
                    </div>
                  );
                }
                if (block.type === "student-strengths") {
                  return <StudentStrengthsToolCard key={block.requestId} requestId={block.requestId} autoStart={Boolean(message.isStreaming) || Boolean(block.createdAt && Date.now() - new Date(block.createdAt).getTime() < 60000)} />;
                }
                if (block.type === "resume-edit") {
                  const proposal = block.proposal;
                  return (
                    <ResumeEditToolCard
                      key={`${block.key}-${proposalStatuses[proposal.toolCallId] || "pending"}`}
                      onApply={onApplyProposal}
                      onReject={onRejectProposal}
                      proposal={proposal}
                      status={proposalStatuses[proposal.toolCallId] || "pending"}
                    />
                  );
                }
                const request = block.request;
                return (
                  <ResumeGenerationToolCard
                    key={block.key}
                    onGenerate={onGenerateResume}
                    onPreview={onPreviewResume}
                    request={request}
                    state={generationStates[request.toolCallId] || { status: "ready" }}
                  />
                );
              }) : (
                <>
                  {message.content ? <MarkdownContent>{message.content}</MarkdownContent> : null}
                  {resumeEditProposals.map((proposal) => (
                    <ResumeEditToolCard
                      key={`${proposal.toolCallId}-${proposalStatuses[proposal.toolCallId] || "pending"}`}
                      onApply={onApplyProposal}
                      onReject={onRejectProposal}
                      proposal={proposal}
                      status={proposalStatuses[proposal.toolCallId] || "pending"}
                    />
                  ))}
                  {resumeGenerationRequests.map((request) => (
                    <ResumeGenerationToolCard
                      key={request.toolCallId}
                      onGenerate={onGenerateResume}
                      onPreview={onPreviewResume}
                      request={request}
                      state={generationStates[request.toolCallId] || { status: "ready" }}
                    />
                  ))}
                </>
              )}
              {message.isStreaming && (blocks.length === 0 || !["text", "reasoning"].includes(blocks[blocks.length - 1]?.type)) ? (
                <div className={blocks.length > 0 ? "mt-3" : undefined}><FirstTokenLoader /></div>
              ) : null}
            </>
          )}
        </div>

        {!message.isStreaming && !editing && (
          <div className="ml-10 mt-2 flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
            <MessageActionButton icon={Copy} onClick={() => onCopy(message)} title="复制" />
            {onRegenerate && (
              <MessageActionButton
                icon={RotateCw}
                onClick={() => onRegenerate(message)}
                title="重新生成"
              />
            )}
            <MessageActionButton icon={Pencil} onClick={() => setEditing(true)} title="编辑" />
            <MessageActionButton
              danger
              icon={Trash2}
              onClick={() => onDelete(message.id)}
              title="删除"
            />
            <MoreMenuButton align="left" items={menuItems} />
          </div>
        )}
      </div>
    </div>
  );
}
