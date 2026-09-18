'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, isTextUIPart } from 'ai';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { InterviewerConfig } from '@/types/interview';
import { useInterviewStore } from '@/stores/interview-store';
import { getAIHeaders } from '@/stores/settings-store';

import { publishInterviewAudio, type InterviewAudioEvent } from '@/lib/interview/realtime-audio';

interface UseInterviewChatOptions {
  sessionId: string;
  roundId: string;
}

class InterviewTransportState {
  constructor(public roundId: string) {}

  update(roundId: string) {
    this.roundId = roundId;
  }
}

export function useInterviewChat({ sessionId, roundId }: UseInterviewChatOptions) {
  const [input, setInput] = useState('');
  const [activeSpeaker, setActiveSpeaker] = useState<InterviewerConfig | null>(null);
  const locale = 'zh';
  const [transportState] = useState(() => new InterviewTransportState(roundId));

  useEffect(() => {
    transportState.update(roundId);
  }, [roundId, transportState]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/interview/${sessionId}/chat`,
        body: () => ({
          roundId: transportState.roundId,
          locale,
          thinkingEnabled: false,
        }),
        headers: () => {

          return {  ...getAIHeaders() };
        },
      }),
    [sessionId, locale, transportState]
  );

  const { messages, sendMessage, regenerate, status, error, setMessages } = useChat({
    id: `interview-${sessionId}-${roundId}`,
    transport,
    onData: (part) => {
      if (part.type === 'data-interview-speaker') {
        const data = part.data as {speaker: InterviewerConfig};
        setActiveSpeaker(data.speaker);
        return;
      }
      if (part.type !== 'data-interview-audio') return;
      publishInterviewAudio(sessionId, part.data as InterviewAudioEvent);
    },
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (!lastAssistant) return;

    const textPart = lastAssistant.parts?.find(isTextUIPart);
    const text = textPart?.text || '';
    if (text.includes('[ROUND_COMPLETE]') && !isLoading) {
      const store = useInterviewStore.getState();
      store.updateRound(roundId, { status: 'completed' });
    }
  }, [messages, isLoading, roundId]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;
      sendMessage({ text: input });
      setInput('');
    },
    [input, sendMessage, isLoading]
  );

  const resetMessages = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  return {
    messages,
    activeSpeaker,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    status,
    error,
    resetMessages,
    regenerate,
    sendMessage,
    setMessages,
  };
}
