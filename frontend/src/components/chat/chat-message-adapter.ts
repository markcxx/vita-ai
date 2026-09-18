import {
  getToolName,
  isReasoningUIPart,
  isToolUIPart,
  type UIMessage,
} from 'ai';

import type { LocalAttachment } from './ChatInput';
import type { ChatMessage, ChatMessageBlock } from './MessageItem';
import type { ResumeEditProposal } from './ResumeEditApprovalDialog';
import type { ResumeGenerationRequest } from './ResumeGenerationToolCard';

export const ATTACHMENTS_META_START = '[[VITAAI_ATTACHMENTS_JSON]]';
export const ATTACHMENTS_META_END = '[[/VITAAI_ATTACHMENTS_JSON]]';
export const ATTACHMENTS_CONTEXT_START = '[[VITAAI_ATTACHMENTS_CONTEXT]]';
export const ATTACHMENTS_CONTEXT_END = '[[/VITAAI_ATTACHMENTS_CONTEXT]]';
export const PROPOSAL_EVENT_START = '[[VITAAI_PROPOSAL_EVENT]]';
export const PROPOSAL_EVENT_END = '[[/VITAAI_PROPOSAL_EVENT]]';
export const WORKFLOW_EVENT_START = '[[VITAAI_WORKFLOW_EVENT]]';
export const WORKFLOW_EVENT_END = '[[/VITAAI_WORKFLOW_EVENT]]';

const LEGACY_ATTACHMENT_MARKER = '\n\n以下是我上传的附件内容或附件信息：\n';

function getTextFromUIMessage(message: UIMessage) {
  return (message.parts || [])
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

type TextReasoningSegment = {
  content: string;
  thinking?: boolean;
  type: 'text' | 'reasoning';
};

function splitEmbeddedReasoning(text: string): TextReasoningSegment[] {
  const segments: TextReasoningSegment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const openIndex = text.indexOf('<think>', cursor);
    if (openIndex < 0) {
      const content = text.slice(cursor);
      if (content) segments.push({ content, type: 'text' });
      break;
    }

    const before = text.slice(cursor, openIndex);
    if (before) segments.push({ content: before, type: 'text' });
    const reasoningStart = openIndex + '<think>'.length;
    const closeIndex = text.indexOf('</think>', reasoningStart);
    if (closeIndex < 0) {
      segments.push({ content: text.slice(reasoningStart), thinking: true, type: 'reasoning' });
      break;
    }

    segments.push({ content: text.slice(reasoningStart, closeIndex), type: 'reasoning' });
    cursor = closeIndex + '</think>'.length;
  }

  return segments;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toResumeEditProposal(message: UIMessage): ResumeEditProposal[] {
  return (message.parts || [])
    .map((part) => {
      if (!isToolUIPart(part) || part.state !== 'output-available') return null;
      const output = part.output;
      if (!isRecord(output) || output.requiresApproval !== true) return null;

      return {
        ...(output as Omit<ResumeEditProposal, 'toolCallId' | 'toolName' | 'requiresApproval'>),
        requiresApproval: true,
        toolCallId: part.toolCallId || `${message.id}-${getToolName(part)}`,
        toolName: getToolName(part),
      } satisfies ResumeEditProposal;
    })
    .filter(Boolean) as ResumeEditProposal[];
}

function toResumeGenerationRequests(message: UIMessage): ResumeGenerationRequest[] {
  return (message.parts || [])
    .map((part) => {
      if (!isToolUIPart(part) || part.state !== 'output-available') return null;
      const output = part.output;
      if (!isRecord(output) || output.requiresTemplateSelection !== true) return null;
      return {
        ...(output as Omit<ResumeGenerationRequest, 'toolCallId' | 'toolName'>),
        toolCallId: part.toolCallId || `${message.id}-${getToolName(part)}`,
        toolName: getToolName(part),
      } satisfies ResumeGenerationRequest;
    })
    .filter(Boolean) as ResumeGenerationRequest[];
}

export function toAttachmentMetadata({
  contentType,
  error,
  id,
  name,
  size,
}: LocalAttachment): LocalAttachment {
  return { contentType, error, id, name, size };
}

function parseAttachmentPayload(content: string) {
  const metaStart = content.indexOf(ATTACHMENTS_META_START);
  const metaEnd = content.indexOf(ATTACHMENTS_META_END);

  if (metaStart >= 0 && metaEnd > metaStart) {
    const visibleContent = content.slice(0, metaStart).trimEnd();
    const rawMeta = content.slice(metaStart + ATTACHMENTS_META_START.length, metaEnd);

    try {
      const attachments = JSON.parse(rawMeta) as LocalAttachment[];
      return { attachments: attachments.map(toAttachmentMetadata), content: visibleContent };
    } catch {
      return { attachments: [], content: visibleContent };
    }
  }

  const legacyMarkerIndex = content.indexOf(LEGACY_ATTACHMENT_MARKER);
  if (legacyMarkerIndex >= 0) {
    const visibleContent = content.slice(0, legacyMarkerIndex).trimEnd();
    const legacyAttachmentText = content.slice(legacyMarkerIndex + LEGACY_ATTACHMENT_MARKER.length);
    const attachments = legacyAttachmentText
      .split(/\n(?=\d+\.\s)/)
      .map((line, index) => {
        const match = line.match(/^\d+\.\s(.+?)（(.+?)，(\d+)\sKB/);
        if (!match) return null;
        return {
          contentType: match[2],
          id: `legacy-${index}-${match[1]}`,
          name: match[1],
          size: Number(match[3]) * 1024,
        };
      })
      .filter(Boolean) as LocalAttachment[];

    return { attachments, content: visibleContent };
  }

  return { attachments: [], content };
}

function toAssistantBlocks(message: UIMessage): ChatMessageBlock[] {
  const proposals = new Map(
    toResumeEditProposal(message).map((proposal) => [proposal.toolCallId, proposal]),
  );
  const generations = new Map(
    toResumeGenerationRequests(message).map((request) => [request.toolCallId, request]),
  );

  const blocks = (message.parts || []).flatMap((part, index): ChatMessageBlock[] => {
    if (part.type === 'text') {
      return splitEmbeddedReasoning(part.text).flatMap((segment, segmentIndex) =>
        segment.content.trim()
          ? [{ key: `${message.id}-${segment.type}-${index}-${segmentIndex}`, ...segment } as ChatMessageBlock]
          : [],
      );
    }
    if (isReasoningUIPart(part)) {
      return part.text.trim()
        ? [{
            content: part.text,
            key: `${message.id}-reasoning-${index}`,
            thinking: part.state === 'streaming',
            type: 'reasoning',
          }]
        : [];
    }
    if (!isToolUIPart(part)) return [];

    const toolCallId = part.toolCallId || `${message.id}-${getToolName(part)}`;
    if (getToolName(part) === 'analyzeStudentStrengths' && part.state === 'output-available') {
      const output = part.output;
      if (isRecord(output) && output.success === true && typeof output.requestId === 'string') {
        return [{ key: `${message.id}-strengths-${toolCallId}`, type: 'student-strengths', requestId: output.requestId, createdAt: typeof output.createdAt === 'string' ? output.createdAt : undefined }];
      }
    }
    const proposal = proposals.get(toolCallId);
    if (proposal) {
      return [{ key: `${message.id}-proposal-${toolCallId}`, type: 'resume-edit', proposal }];
    }
    const request = generations.get(toolCallId);
    return request
      ? [{ key: `${message.id}-generation-${toolCallId}`, type: 'resume-generation', request }]
      : [];
  });

  return blocks.reduce<ChatMessageBlock[]>((merged, block) => {
    const previous = merged[merged.length - 1];
    if (block.type === 'reasoning' && previous?.type === 'reasoning') {
      previous.content = [previous.content, block.content].filter(Boolean).join('\n\n');
      previous.thinking = block.thinking;
      return merged;
    }
    merged.push(block);
    return merged;
  }, []);
}

function toChatMessage(message: UIMessage, isStreaming = false): ChatMessage | null {
  if (message.role !== 'user' && message.role !== 'assistant') return null;

  const rawText = getTextFromUIMessage(message);
  if (
    message.role === 'user'
    && (rawText.startsWith(PROPOSAL_EVENT_START) || rawText.startsWith(WORKFLOW_EVENT_START))
  ) return null;

  const visibleText = message.role === 'assistant'
    ? splitEmbeddedReasoning(rawText)
        .filter((segment) => segment.type === 'text')
        .map((segment) => segment.content)
        .join('')
    : rawText;
  const parsed = parseAttachmentPayload(visibleText);

  return {
    attachments: parsed.attachments,
    blocks: message.role === 'assistant' ? toAssistantBlocks(message) : undefined,
    content: parsed.content,
    createdAt: message.metadata && typeof message.metadata === 'object' && 'createdAt' in message.metadata
      ? new Date(String(message.metadata.createdAt))
      : undefined,
    id: message.id,
    isStreaming: message.role === 'assistant' && isStreaming,
    resumeEditProposals: message.role === 'assistant' ? toResumeEditProposal(message) : [],
    resumeGenerationRequests: message.role === 'assistant' ? toResumeGenerationRequests(message) : [],
    role: message.role,
    sourceMessageIds: [message.id],
  };
}

export function buildChatMessages(messages: UIMessage[], status: string): ChatMessage[] {
  const result: ChatMessage[] = [];
  let mergeNextAssistant = false;

  messages.forEach((message, index) => {
    const rawText = getTextFromUIMessage(message);
    const isWorkflowEvent = message.role === 'user'
      && (rawText.startsWith(PROPOSAL_EVENT_START) || rawText.startsWith(WORKFLOW_EVENT_START));
    if (isWorkflowEvent) {
      const previous = result[result.length - 1];
      if (previous?.role === 'assistant') {
        previous.sourceMessageIds = [...(previous.sourceMessageIds || [previous.id]), message.id];
      }
      mergeNextAssistant = true;
      return;
    }

    const converted = toChatMessage(
      message,
      message.role === 'assistant' && index === messages.length - 1 && status === 'streaming',
    );
    if (!converted) return;

    const previous = result[result.length - 1];
    if (mergeNextAssistant && converted.role === 'assistant' && previous?.role === 'assistant') {
      previous.blocks = [...(previous.blocks || []), ...(converted.blocks || [])];
      previous.content = [previous.content, converted.content].filter(Boolean).join('\n\n');
      previous.isStreaming = converted.isStreaming;
      previous.resumeEditProposals = [
        ...(previous.resumeEditProposals || []),
        ...(converted.resumeEditProposals || []),
      ];
      previous.resumeGenerationRequests = [
        ...(previous.resumeGenerationRequests || []),
        ...(converted.resumeGenerationRequests || []),
      ];
      previous.sourceMessageIds = [...(previous.sourceMessageIds || [previous.id]), message.id];
      mergeNextAssistant = false;
      return;
    }

    mergeNextAssistant = false;
    result.push(converted);
  });

  if (mergeNextAssistant && (status === 'submitted' || status === 'streaming')) {
    const previous = result[result.length - 1];
    if (previous?.role === 'assistant') previous.isStreaming = true;
  }

  return result;
}
