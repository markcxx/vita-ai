'use client';

import { isToolUIPart, type UIMessage } from 'ai';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useResumeStore } from '@/stores/resume-store';
import { getAIHeaders } from '@/stores/settings-store';

interface UseAIChatOptions {
  resumeId: string;
  sessionId?: string;
  initialMessages?: UIMessage[];
}

class AITransportState {
  constructor(public sessionId: string | undefined) {}

  update(sessionId: string | undefined) {
    this.sessionId = sessionId;
  }
}

export function useAIChat({ resumeId, sessionId, initialMessages }: UseAIChatOptions) {
  const [input, setInput] = useState('');

  const [transportState] = useState(() => new AITransportState(sessionId));

  useEffect(() => {
    transportState.update(sessionId);
  }, [sessionId, transportState]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/ai/chat',
        body: () => ({ resumeId, sessionId: transportState.sessionId, thinkingEnabled: false }),
        // headers must be a function — useChat never updates the transport ref,
        // so a static object would freeze stale values from before store hydration.
        headers: () => {

          return {  ...getAIHeaders() };
        },
      }),
    [resumeId, transportState]
  );

  const { messages, sendMessage, status, error, setMessages } = useChat({
    id: sessionId,
    transport,
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Track completed tool call count to detect new tool results
  const completedToolCountRef = useRef(0);

  const reloadResume = useCallback(async () => {
    if (!resumeId) return;
    try {
      const store = useResumeStore.getState();
      // Cancel any pending autosave to prevent overwriting server data
      if (store._saveTimeout) clearTimeout(store._saveTimeout);


      const res = await fetch(`/api/resume/${resumeId}`, {
        headers: {},
      });
      if (res.ok) {
        const resume = await res.json();
        useResumeStore.getState().setResume(resume);
      }
    } catch (err) {
      console.error('Failed to reload resume after tool call:', err);
    }
  }, [resumeId]);

  // Reload resume data when new tool results appear during streaming
  useEffect(() => {
    const completedToolCount = messages.reduce((count, m) => {
      if (m.role !== 'assistant' || !m.parts) return count;
      return count + m.parts.filter((p) =>
        isToolUIPart(p) && p.state === 'output-available'
      ).length;
    }, 0);

    if (completedToolCount > completedToolCountRef.current) {
      completedToolCountRef.current = completedToolCount;
      reloadResume();
    }
  }, [messages, reloadResume]);

  // Load initial messages when session changes; sync tool count ref to avoid false reload
  useEffect(() => {
    if (initialMessages) {
      // Pre-calculate tool count from initial messages to avoid triggering a redundant reload
      const initialToolCount = initialMessages.reduce((count, m) => {
        if (m.role !== 'assistant' || !m.parts) return count;
        return count + m.parts.filter((p) =>
          isToolUIPart(p) && p.state === 'output-available'
        ).length;
      }, 0);
      completedToolCountRef.current = initialToolCount;
      setMessages(initialMessages);
    }
  }, [initialMessages, setMessages]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    sendMessage({ text: input });
    setInput('');
  }, [input, sendMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    status,
    error,
    clearMessages,
    sendMessage,
  };
}
