'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { isTextUIPart, type UIMessage } from 'ai';
import { InterviewerMessage } from './interviewer-message';
import { CandidateMessage } from './candidate-message';
import type { InterviewerConfig } from '@/types/interview';
import { cleanInterviewerText } from '@/lib/interview/text';
import { getInterviewerAvatar } from '@/lib/interview/avatar';
import { HIDDEN_MESSAGES } from '@/lib/interview/constants';

interface MessageListProps {
  messages: UIMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      {messages.map((msg) => {
        const textPart = msg.parts?.find(isTextUIPart);
        const content = textPart?.text || '';
        if (!content) return null;

        // Hide system trigger messages
        if (msg.role === 'user' && HIDDEN_MESSAGES.has(content.trim())) {
          return null;
        }

        if (msg.role === 'assistant') {
          const speaker = (msg.metadata as {speaker?: InterviewerConfig})?.speaker;
          return <div key={msg.id}>{speaker && <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><Image width={56} height={56} src={getInterviewerAvatar(speaker.avatar,speaker.type)} alt="" className="h-7 w-7 rounded-full object-cover"/>{speaker.name} · {speaker.title}</div>}<InterviewerMessage content={cleanInterviewerText(content, speaker)}/></div>;
        }
        if (msg.role === 'user') {
          return <CandidateMessage key={msg.id} content={content} messageId={msg.id} />;
        }
        return null;
      })}
      <div ref={endRef} />
    </div>
  );
}
