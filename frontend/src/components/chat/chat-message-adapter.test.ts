import { describe, expect, it } from 'vitest';
import type { UIMessage } from 'ai';

import {
  ATTACHMENTS_META_END,
  ATTACHMENTS_META_START,
  PROPOSAL_EVENT_END,
  PROPOSAL_EVENT_START,
  buildChatMessages,
} from './chat-message-adapter';

function message(id: string, role: 'user' | 'assistant', text: string): UIMessage {
  return { id, role, parts: [{ type: 'text', text }] };
}

describe('buildChatMessages', () => {
  it('keeps embedded reasoning separate from visible assistant text', () => {
    const result = buildChatMessages([
      message('a1', 'assistant', '<think>internal reasoning</think>Final answer'),
    ], 'ready');

    expect(result[0].content).toBe('Final answer');
    expect(result[0].blocks).toEqual([
      expect.objectContaining({ content: 'internal reasoning', type: 'reasoning' }),
      expect.objectContaining({ content: 'Final answer', type: 'text' }),
    ]);
  });

  it('hides attachment metadata while preserving attachment details', () => {
    const metadata = JSON.stringify([
      { id: 'file-1', name: 'resume.pdf', size: 1024, contentType: 'application/pdf' },
    ]);
    const result = buildChatMessages([
      message('u1', 'user', `Please review\n${ATTACHMENTS_META_START}${metadata}${ATTACHMENTS_META_END}`),
    ], 'ready');

    expect(result[0].content).toBe('Please review');
    expect(result[0].attachments).toEqual([
      expect.objectContaining({ id: 'file-1', name: 'resume.pdf', size: 1024 }),
    ]);
  });

  it('merges an assistant continuation across an internal workflow event', () => {
    const event = `${PROPOSAL_EVENT_START}{"outcome":"approved"}${PROPOSAL_EVENT_END}`;
    const result = buildChatMessages([
      message('a1', 'assistant', 'First response'),
      message('u1', 'user', event),
      message('a2', 'assistant', 'Continuation'),
    ], 'ready');

    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('First response\n\nContinuation');
    expect(result[0].sourceMessageIds).toEqual(['a1', 'u1', 'a2']);
  });
});
