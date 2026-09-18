"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DefaultChatTransport, isReasoningUIPart, isToolUIPart } from "ai";
import { useChat } from "@ai-sdk/react";
import { AlertCircle, Sparkles } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

import { cn } from "@/lib/utils";
import { getPreference, setPreference } from "@/lib/user-preferences";
import { useEditorStore } from "@/stores/editor-store";
import { useResumeStore } from "@/stores/resume-store";
import { ChatInput, type ApprovalMode, type LocalAttachment } from "./ChatInput";
import { type ChatMessage, MessageItem } from "./MessageItem";
import type { ResumeEditProposal } from "./ResumeEditApprovalDialog";
import type { ProposalStatus } from "./ResumeEditToolCard";
import type { ResumeGenerationRequest, ResumeGenerationState } from "./ResumeGenerationToolCard";
import previewStyles from "./live-resume-preview.module.css";
import { LiveResumePreview, type LiveResumeState } from "./LiveResumePreview";
import { buildMockResume } from "@/lib/template-preview";
import { readJsonStream } from "@/lib/read-json-stream";
import type { Resume, ResumeSection, ThemeConfig } from "@/types/resume";
import { WelcomePanel } from "./WelcomePanel";
import { useRouter } from 'next/navigation';
import { JobDescriptionDialog } from "./JobDescriptionDialog";
import {
  ATTACHMENTS_CONTEXT_END,
  ATTACHMENTS_CONTEXT_START,
  ATTACHMENTS_META_END,
  ATTACHMENTS_META_START,
  PROPOSAL_EVENT_END,
  PROPOSAL_EVENT_START,
  WORKFLOW_EVENT_END,
  WORKFLOW_EVENT_START,
  buildChatMessages,
  toAttachmentMetadata,
} from "./chat-message-adapter";

const APPROVAL_MODE_STORAGE_KEY = "vitaai_resume_approval_mode";
const MAIN_QUESTIONS = [
  "请结合我的个人信息，帮我生成简历。",
  "请结合我的个人资料，分析我的个人优势特点，生成可视化报告。",
  "请根据我的经历，帮我准备一段面试自我介绍。",
  "请结合我的求职方向，给我一些求职准备建议。",
];
const EDITOR_QUESTIONS = [
  "请优化这份简历的项目经历，突出我的贡献和成果。",
  "请结合我的个人资料，分析我的个人优势特点，生成可视化报告。",
  "请检查这份简历的信息是否完整，指出需要补充的内容。",
  "请精简这份简历的文字，保留关键经历和成果。",
];

export default function ChatApp({ resumeId }: { resumeId?: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [jobDescriptionOpen, setJobDescriptionOpen] = useState(false);
  const [input, setInput] = useState("");
  const [composerHeight, setComposerHeight] = useState(0);
  const [isAwayFromBottom, setIsAwayFromBottom] = useState(false);
  const [modelId, setModelId] = useState("AI 模型");
  const [providerId, setProviderId] = useState("openai");
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [thinkingSupported, setThinkingSupported] = useState(false);
  const [thinkingHint, setThinkingHint] = useState("正在读取模型能力");
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>("always");
  const [proposalStatuses, setProposalStatuses] = useState<Record<string, ProposalStatus>>({});
  const [liveResume, setLiveResume] = useState<LiveResumeState | null>(null);
  const [previewClosing, setPreviewClosing] = useState(false);
  useEffect(() => {
    if (!previewClosing) return;
    const timeout = window.setTimeout(() => {
      setLiveResume(null);
      setPreviewClosing(false);
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 460);
    return () => window.clearTimeout(timeout);
  }, [previewClosing]);
  const generationAbort = useRef<AbortController | null>(null);
  const liveColor = useRef<string | undefined>(undefined);
  const liveSaved = useRef<{ id: string; theme: ThemeConfig } | null>(null);
  const colorSaveQueue = useRef<Promise<void>>(Promise.resolve());
  const saveLiveColor = useCallback((id: string, theme: ThemeConfig) => {
    const task = colorSaveQueue.current.catch(() => undefined).then(async () => {
      const response = await fetch(`/api/resume/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ themeConfig: theme }) });
      if (!response.ok) throw new Error("配色保存失败，请稍后重试");
    });
    colorSaveQueue.current = task;
    void task.catch(error => toast.error(error.message));
    return task;
  }, []);
  const handleLiveColor = useCallback((color: string) => {
    liveColor.current = color;
    setLiveResume(current => current && ({ ...current, resume: { ...current.resume, themeConfig: { ...current.resume.themeConfig, accentColor: color } } }));
    if (liveSaved.current) {
      liveSaved.current.theme = { ...liveSaved.current.theme, accentColor: color };
      void saveLiveColor(liveSaved.current.id, liveSaved.current.theme);
    }
  }, [saveLiveColor]);
  useEffect(() => () => generationAbort.current?.abort(), []);
  const [generationStates, setGenerationStates] = useState<Record<string, ResumeGenerationState>>({});
  const autoApplyingProposalIdsRef = useRef(new Set<string>());
  const pendingConsumedRef = useRef<string | null>(null);
  const router = useRouter();
  const pendingAiMessage = useEditorStore((state) => state.pendingAiMessage);
  const setPendingAiMessage = useEditorStore((state) => state.setPendingAiMessage);
  const setResume = useResumeStore((state) => state.setResume);

  // useChat retains its transport: read current options at send/regenerate time.
  const requestOptions = useRef({ approvalMode, resumeId, thinkingEnabled: false });
  useEffect(() => {
    requestOptions.current = { approvalMode, resumeId, thinkingEnabled: thinkingSupported && thinkingEnabled };
  }, [approvalMode, resumeId, thinkingEnabled, thinkingSupported]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai/chat",
        body: () => ({ ...requestOptions.current, sessionId: undefined }),
        headers: () => {

          return {
            "Content-Type": "application/json",

          };
        },
      }),
    [],
  );

  const { error, messages, regenerate, sendMessage, setMessages, status, stop } = useChat({
    experimental_throttle: 50,
    id: resumeId ? `vitaai-resume-chat-local-${resumeId}` : `vitaai-resume-chat-local`,
    transport,
  });

  const isLoading = status === "submitted" || status === "streaming";
  const chatMessages = useMemo(
    () => buildChatMessages(messages, status),
    [messages, status],
  );
  const messagesContentSignature = useMemo(
    () => messages.map((message) => {
      const partSignature = (message.parts || []).map((part) => {
        if (part.type === "text" || isReasoningUIPart(part)) return `${part.type}:${part.text.length}`;
        if (isToolUIPart(part)) return `${part.type}:${part.state}`;
        return part.type;
      }).join(",");
      return `${message.id}:${partSignature}`;
    }).join("|"),
    [messages],
  );
  const showWelcome = chatMessages.length === 0;
  const isEditorChat = Boolean(resumeId);
  const showCenteredWelcome = showWelcome;
  const questions = isEditorChat ? EDITOR_QUESTIONS : MAIN_QUESTIONS;
  const [questionIndex, setQuestionIndex] = useState(0);
  const suggestedQuestion = questions[questionIndex % questions.length];
  useEffect(() => {
    if (input.trim() || isLoading || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setQuestionIndex(current => (current + 1 + Math.floor(Math.random() * (questions.length - 1))) % questions.length), 6500);
    return () => window.clearInterval(timer);
  }, [input, isLoading, questions]);
  const resumeEditProposals = useMemo(
    () => chatMessages.flatMap((message) => message.resumeEditProposals || []),
    [chatMessages],
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai/config")
      .then((res) => res.json())
      .then((data: { model?: string; provider?: string; thinking?: { supported: boolean; defaultEnabled: boolean; reason: string } }) => {
        if (cancelled) return;
        setModelId(data.model || "AI 模型");
        setProviderId(data.provider || "openai");
        setThinkingSupported(data.thinking?.supported ?? false);
        setThinkingEnabled(false);
        setThinkingHint(data.thinking?.reason || "");
      })
      .catch(() => {
        if (!cancelled) {
          setThinkingHint("暂时无法读取模型能力，请刷新重试");
          setModelId("AI 模型");
          setProviderId("openai");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const stored = getPreference(APPROVAL_MODE_STORAGE_KEY);
    if (stored === "always" || stored === "unrestricted") {
      setApprovalMode(stored);
    }
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    shouldStickToBottomRef.current = true;
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
    window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
    });
    setIsAwayFromBottom(false);
  }, []);

  useEffect(() => {
    if (!shouldStickToBottomRef.current) return;

    // Do not call scrollToBottom here: it writes React state, while this effect
    // runs for every streamed reasoning delta. Writing state from a scroll
    // effect can synchronously trigger onScroll and recurse until React aborts.
    messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [messagesContentSignature, status]);

  useEffect(() => {
    if (!pendingAiMessage) {
      pendingConsumedRef.current = null;
      return;
    }
    if (
      !resumeId ||
      attachmentUploading ||
      pendingConsumedRef.current === pendingAiMessage
    ) {
      return;
    }

    pendingConsumedRef.current = pendingAiMessage;
    sendMessage({ text: pendingAiMessage });
    setPendingAiMessage(null);
  }, [
    attachmentUploading,
    pendingAiMessage,
    resumeId,
    sendMessage,
    setPendingAiMessage,
  ]);

  const handleMessagesScroll = useCallback(() => {
    const element = messagesScrollRef.current;
    if (!element) return;
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    const awayFromBottom = distance > 160;
    shouldStickToBottomRef.current = !awayFromBottom;
    setIsAwayFromBottom((current) => current === awayFromBottom ? current : awayFromBottom);
  }, []);

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  useEffect(() => {
    const composer = composerRef.current;
    if (!composer || typeof ResizeObserver === "undefined") return;

    const updateHeight = () => {
      const nextHeight = Math.ceil(composer.getBoundingClientRect().height);
      setComposerHeight((current) => current === nextHeight ? current : nextHeight);
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(composer);
    return () => observer.disconnect();
  }, [showCenteredWelcome]);

  const handleInput = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(event.target.value);
      window.requestAnimationFrame(resizeTextarea);
    },
    [resizeTextarea],
  );

  const buildMessageWithAttachments = useCallback((draft: string) => {
    if (attachments.length === 0) return draft;

    const visibleText = draft || "请分析我上传的简历文件。";
    const attachmentMetadata = attachments.map(toAttachmentMetadata);
    const attachmentContext = attachments
      .map((file, index) => {
        const content = file.content?.trim();
        if (!content) {
          return `${index + 1}. 文件名：${file.name}
类型：${file.contentType || "未知类型"}
大小：${Math.ceil(file.size / 1024)} KB
说明：${file.error || "文件未提取到正文内容。请根据可见文件名和用户问题回应，并说明可能需要用户重新上传可解析版本。"}`;
        }

        return `${index + 1}. 文件名：${file.name}
类型：${file.contentType || "未知类型"}
内容：
${content.slice(0, 12000)}`;
      })
      .join("\n\n---\n\n");

    return [
      visibleText,
      "",
      `${ATTACHMENTS_META_START}${JSON.stringify(attachmentMetadata)}${ATTACHMENTS_META_END}`,
      "",
      `${ATTACHMENTS_CONTEXT_START}
以下是用户上传的附件内容或附件信息，仅供你理解上下文，不要在回复中重复这段标记文本：
${attachmentContext}
${ATTACHMENTS_CONTEXT_END}`,
    ].join("\n");
  }, [attachments]);

  const handleSend = useCallback(() => {
    if (isLoading && !input.trim()) {
      stop();
      return;
    }

    const draft = input.trim();
    if ((!draft && attachments.length === 0) || attachmentUploading) return;

    shouldStickToBottomRef.current = true;
    sendMessage({ text: buildMessageWithAttachments(draft) });
    setInput("");
    setAttachments([]);
    window.requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      scrollToBottom("auto");
    });
  }, [
    attachmentUploading,
    attachments.length,
    buildMessageWithAttachments,
    input,
    isLoading,
    sendMessage,
    scrollToBottom,
    stop,
  ]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Tab" && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey && !event.nativeEvent.isComposing && !input.trim() && !isLoading) {
        event.preventDefault();
        setInput(suggestedQuestion);
        window.requestAnimationFrame(resizeTextarea);
        return;
      }
      if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
        event.preventDefault();
        handleSend();
      }
    },
    [handleSend, input, isLoading, suggestedQuestion, resizeTextarea],
  );

  const handleCopy = useCallback(async (message: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success("已复制");
    } catch {
      toast.error("复制失败，请手动复制");
    }
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      const groupedMessage = chatMessages.find((message) => message.id === id);
      const sourceIds = new Set(groupedMessage?.sourceMessageIds || [id]);
      setMessages((current) => current.filter((message) => !sourceIds.has(message.id)));
      toast.success("消息已删除");
    },
    [chatMessages, setMessages],
  );

  const handleEdit = useCallback(
    (id: string, content: string) => {
      const nextContent = content.trim();
      if (!nextContent) {
        toast.error("消息内容不能为空");
        return;
      }

      setMessages((current) =>
        current.map((message) => {
          if (message.id !== id) return message;
          return {
            ...message,
            parts: message.parts.map((part) =>
              part.type === "text" ? { ...part, text: nextContent } : part,
            ),
          };
        }),
      );
      toast.success("消息已更新");
    },
    [setMessages],
  );

  const handleRegenerate = useCallback(
    (message: ChatMessage) => {
      shouldStickToBottomRef.current = true;
      void regenerate({ messageId: message.id });
    },
    [regenerate],
  );

  const handleMenuUnavailable = useCallback((label: string) => {
    toast(`${label}功能后续接入`, {
      icon: "✨",
    });
  }, []);

  const handleToggleWebSearch = useCallback(() => {
    setWebSearchEnabled((enabled) => !enabled);
  }, []);

  const handleApprovalModeChange = useCallback((mode: ApprovalMode) => {
    setApprovalMode(mode);
    setPreference(APPROVAL_MODE_STORAGE_KEY, mode);
  }, []);

  const continueAfterProposal = useCallback((
    proposal: ResumeEditProposal,
    outcome: "approved" | "rejected" | "failed",
    detail?: string,
  ) => {
    const event = {
      type: "resume_edit_decision",
      outcome,
      toolCallId: proposal.toolCallId,
      toolName: proposal.toolName,
      title: proposal.title || "简历修改",
      detail,
      proposal: {
        operation: proposal.operation,
        reason: proposal.reason,
        sectionTitle: proposal.sectionTitle,
        field: proposal.field,
        oldValue: proposal.oldValue,
        newValue: proposal.newValue,
        changes: proposal.changes,
      },
      instruction: outcome === "approved"
        ? "用户已经批准且修改已成功应用。请基于方案内容自然总结实际完成的修改，不要再次读取简历或调用任何工具。"
        : outcome === "rejected"
          ? "用户拒绝了这项修改。不要再次提交相同修改；请根据用户决定继续此前任务，或简洁说明下一步可选方案。"
          : "修改应用失败。请根据错误信息调整方案或告诉用户如何继续，不要声称修改已经成功。",
    };
    shouldStickToBottomRef.current = true;
    void sendMessage({
      text: `${PROPOSAL_EVENT_START}${JSON.stringify(event)}${PROPOSAL_EVENT_END}`,
    });
  }, [sendMessage]);

  const handleRejectProposal = useCallback((proposal: ResumeEditProposal) => {
    setProposalStatuses((current) => ({ ...current, [proposal.toolCallId]: "rejected" }));
    continueAfterProposal(proposal, "rejected");
  }, [continueAfterProposal]);

  const handleApplyProposal = useCallback(async (proposal: ResumeEditProposal) => {
    if (!resumeId) return;

    setProposalStatuses((current) => ({ ...current, [proposal.toolCallId]: "applying" }));
    try {

      const response = await fetch("/api/ai/resume-edit/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",

        },
        body: JSON.stringify({ proposal, resumeId }),
      });
      const data = (await response.json()) as { resume?: Parameters<typeof setResume>[0]; error?: string };
      if (!response.ok || !data.resume) {
        throw new Error(data.error || "应用修改失败");
      }

      setResume(data.resume);
      setProposalStatuses((current) => ({ ...current, [proposal.toolCallId]: "approved" }));
      toast.success("简历已更新");
      continueAfterProposal(proposal, "approved");
    } catch (error) {
      setProposalStatuses((current) => ({ ...current, [proposal.toolCallId]: "pending" }));
      autoApplyingProposalIdsRef.current.delete(proposal.toolCallId);
      const message = error instanceof Error ? error.message : "应用修改失败";
      toast.error(message);
      continueAfterProposal(proposal, "failed", message);
    }
  }, [continueAfterProposal, resumeId, setResume]);

  useEffect(() => {
    if (approvalMode !== "unrestricted") return;
    for (const proposal of resumeEditProposals) {
      const proposalStatus = proposalStatuses[proposal.toolCallId] || "pending";
      if (proposalStatus !== "pending" || autoApplyingProposalIdsRef.current.has(proposal.toolCallId)) {
        continue;
      }
      autoApplyingProposalIdsRef.current.add(proposal.toolCallId);
      void handleApplyProposal(proposal);
    }
  }, [approvalMode, handleApplyProposal, proposalStatuses, resumeEditProposals]);

  const handleAttachment = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleJobDescriptionSubmit = useCallback(({ targetRole, jobDescription }: { targetRole: string; jobDescription: string }) => {
    const content = `${targetRole ? `目标岗位：${targetRole}\n` : ""}岗位招聘信息：\n${jobDescription}`;
    const attachment: LocalAttachment = {
      id: `job-description-${crypto.randomUUID()}`,
      name: targetRole ? `${targetRole}-岗位信息.txt` : "岗位招聘信息.txt",
      contentType: "text/plain",
      content,
      size: new TextEncoder().encode(content).length,
    };
    setAttachments((current) => [...current.filter((item) => !item.id.startsWith("job-description-")), attachment].slice(0, 4));
    if (!input.trim()) {
      setInput(isEditorChat
        ? "请结合我的个人资料库和这份岗位信息，定制优化当前简历。"
        : "请直接结合我的个人资料库和这份岗位信息，生成一份专项定制简历，并让我选择简历模板。");
    }
  }, [input, isEditorChat]);

  const handleGenerateResume = useCallback(async (request: ResumeGenerationRequest, template: string) => {
    if (generationAbort.current) { toast("已有简历正在生成，请稍候"); return; }
    const controller = new AbortController();
    generationAbort.current = controller;
    liveColor.current = undefined;
    liveSaved.current = null;
    const draft = { ...buildMockResume(template), id: "live-draft", title: request.title, language: request.language, sections: [] } as Resume;
    setPreviewClosing(false);
    setLiveResume({ resume: draft, status: "generating", message: "正在连接生成服务" });
    setGenerationStates(current => ({ ...current, [request.toolCallId]: { status: "generating" } }));
    try {

      const response = await fetch("/api/ai/tailored-resume/stream", {
        method: "POST", signal: controller.signal,
        headers: { "Content-Type": "application/json",  },
        body: JSON.stringify({ targetRole: request.targetRole, jobDescription: request.jobDescription, language: request.language, template, thinkingEnabled: requestOptions.current.thinkingEnabled }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || error.error || "专项简历生成失败");
      }
      let completed: { resumeId: string; title: string; resume: Resume } | undefined;
      await readJsonStream(response, event => {
        if (event.type === "error") throw new Error(String(event.message));
        if (event.type === "status") setLiveResume(current => current && ({ ...current, message: String(event.message) }));
        if (event.type === "preview" && Array.isArray(event.sections)) {
          setLiveResume(current => current && ({ ...current, message: "正在写入内容…", resume: { ...current.resume, sections: event.sections as ResumeSection[] } }));
        }
        if (event.type === "complete" && typeof event.resumeId === "string" && typeof event.title === "string" && event.resume) {
          completed = { resumeId: event.resumeId, title: event.title, resume: event.resume as Resume };
        }
      });
      if (!completed) throw new Error("生成连接已中断，请重试；预览尚未确认保存。");
      const data = completed;
      const theme = { ...draft.themeConfig, ...data.resume.themeConfig, ...(liveColor.current ? { accentColor: liveColor.current } : {}) };
      liveSaved.current = { id: data.resumeId, theme };
      if (liveColor.current) await saveLiveColor(data.resumeId, theme).catch(() => undefined);
      setLiveResume({ resume: { ...data.resume, themeConfig: { ...theme, ...(liveColor.current ? { accentColor: liveColor.current } : {}) } }, status: "complete", message: "已保存到我的简历" });
      setGenerationStates(current => ({ ...current, [request.toolCallId]: { status: "success", result: { resumeId: data.resumeId, title: data.title } } }));
      toast.success("专项简历已保存");
      void sendMessage({ text: `${WORKFLOW_EVENT_START}${JSON.stringify({ type: "tailored_resume_created", resumeId: data.resumeId, title: data.title, instruction: "专项简历已保存，简洁告知用户可预览或编辑，不要再次生成。" })}${WORKFLOW_EVENT_END}` });
    } catch (error) {
      if (controller.signal.aborted) return;
      const message = error instanceof Error ? error.message : "专项简历生成失败";
      setLiveResume(current => current && ({ ...current, status: "error", message }));
      setGenerationStates(current => ({ ...current, [request.toolCallId]: { status: "error", error: message } }));
      toast.error(message);
    } finally { if (generationAbort.current === controller) generationAbort.current = null; }
  }, [sendMessage, saveLiveColor]);

  const handlePreviewResume = useCallback((generatedResumeId: string) => {
    router.push(`/editor/${generatedResumeId}`);
  }, [router]);

  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments((current) => current.filter((file) => file.id !== id));
  }, []);

  const handleAttachmentFiles = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return;

    setAttachmentUploading(true);
    try {
      const remainingSlots = Math.max(0, 4 - attachments.length);
      const selectedFiles = files.slice(0, remainingSlots);

      if (files.length > remainingSlots) {
        toast.error("最多同时添加 4 个附件");
      }

      const nextAttachments = await Promise.all(
        selectedFiles.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);

          let content: string | undefined;
          let error: string | undefined;

          try {
            const response = await fetch("/api/ai/attachments/parse", {
              method: "POST",
              headers: {},
              body: formData,
            });
            const data = (await response.json()) as { content?: string; error?: string };
            if (!response.ok) {
              error = data.error || "文件解析失败";
            } else {
              content = data.content;
            }
          } catch {
            error = "文件解析请求失败";
          }

          return {
            content,
            contentType: file.type || "application/octet-stream",
            error,
            id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
            name: file.name,
            size: file.size,
          } satisfies LocalAttachment;
        }),
      );

      if (nextAttachments.length > 0) {
        setAttachments((current) => [...current, ...nextAttachments]);
        const failedCount = nextAttachments.filter((file) => file.error).length;
        if (failedCount > 0) {
          toast.error(`${failedCount} 个附件解析失败`);
        } else {
          toast.success(`已解析 ${nextAttachments.length} 个附件`);
        }
      }
    } catch {
      toast.error("文件读取失败，请重新选择");
    } finally {
      setAttachmentUploading(false);
    }
  }, [attachments.length]);

  const inputNode = (
    <ChatInput
      approvalMode={approvalMode}
      attachments={attachments}
      attachmentUploading={attachmentUploading}
      fileInputRef={fileInputRef}
      input={input}
      isLoading={isLoading}
      modelId={modelId}
      providerId={providerId}
      onAttachment={handleAttachment}
      onAttachmentFiles={handleAttachmentFiles}
      onJobDescription={() => setJobDescriptionOpen(true)}
      onApprovalModeChange={handleApprovalModeChange}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onRemoveAttachment={handleRemoveAttachment}
      onScrollToBottom={scrollToBottom}
      onSend={handleSend}
      onToggleWebSearch={handleToggleWebSearch}
      placement={showCenteredWelcome ? "center" : "bottom"}
      composerRef={composerRef}
      placeholder={`${suggestedQuestion}（Tab 填入）`}
      suggestions={questions.slice(0, 3)}
      onUseSuggestion={(question) => { setInput(question); textareaRef.current?.focus(); window.requestAnimationFrame(resizeTextarea); }}
      showScrollToBottom={!showCenteredWelcome && isAwayFromBottom}
      showApprovalControl={isEditorChat}
      showJobDescriptionControl
      textareaRef={textareaRef}
      webSearchEnabled={webSearchEnabled}
      thinkingEnabled={thinkingEnabled}
      thinkingSupported={thinkingSupported}
      thinkingHint={thinkingHint}
      onToggleThinking={() => setThinkingEnabled(value => !value)}
    />
  );

  return (
    <div className="chat-panel-bg relative flex h-full min-h-0 w-full flex-col overflow-hidden">
      {liveResume && <LiveResumePreview value={liveResume} closing={previewClosing} onDismiss={() => setPreviewClosing(true)} onColorChange={handleLiveColor} />}
      <div className={previewStyles.chatColumn} data-preview={Boolean(liveResume) && !previewClosing}>
      <div
        className={cn(
          previewStyles.messagesViewport,
          "chat-solid-scrollbar min-h-0 flex-1 overflow-y-auto px-3 md:px-8",
          showCenteredWelcome ? "flex items-center justify-center pb-16" : "pb-4 pt-8",
        )}
        onScroll={handleMessagesScroll}
        ref={messagesScrollRef}
      >
        {showCenteredWelcome ? (
          <WelcomePanel>{inputNode}</WelcomePanel>
        ) : (
          <div className="mx-auto flex w-full max-w-[840px] flex-col gap-9">
            <div className="mb-1 flex items-center gap-2 rounded-full text-xs text-gray-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{isEditorChat ? "简历修改助手" : "简历与求职对话"}</span>
            </div>
            {chatMessages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                modelId={modelId}
                providerId={providerId}
                onCopy={handleCopy}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onMenuUnavailable={handleMenuUnavailable}
                onApplyProposal={handleApplyProposal}
                onGenerateResume={handleGenerateResume}
                onPreviewResume={handlePreviewResume}
                onRegenerate={message.role === "assistant" ? handleRegenerate : undefined}
                onRejectProposal={handleRejectProposal}
                proposalStatuses={proposalStatuses}
                generationStates={generationStates}
              />
            ))}
            {error && (
              <div className="ml-10 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>消息发送失败：{error.message || "模型服务未返回有效响应，请重试。"}</span>
              </div>
            )}
            <div
              aria-hidden="true"
              ref={messagesEndRef}
              style={{ height: Math.max(176, composerHeight + 64) }}
            />
          </div>
        )}
      </div>

      {!showCenteredWelcome && (
        <div className={previewStyles.composerColumn}>{inputNode}</div>
      )}
      </div>
      <Toaster
        position="top-center"
        toastOptions={{
          className:
            "border border-gray-200 bg-white text-sm text-gray-900 shadow-[0_12px_36px_rgba(0,0,0,0.14)] dark:border-white/10 dark:bg-gray-900 dark:text-gray-100",
          duration: 1800,
        }}
      />
      <JobDescriptionDialog
        mode={isEditorChat ? "edit" : "generate"}
        open={jobDescriptionOpen}
        onClose={() => setJobDescriptionOpen(false)}
        onSubmit={handleJobDescriptionSubmit}
      />
    </div>
  );
}
