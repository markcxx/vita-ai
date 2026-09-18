'use client';
import Image from 'next/image';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getCopy } from '@/lib/copy';
import { isTextUIPart, type UIMessage } from 'ai';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getInterviewerAvatar } from '@/lib/interview/avatar';
import s from './interview.module.css';
import { useInterviewStore } from '@/stores/interview-store';
import { useInterviewChat } from '@/hooks/use-interview-chat';
import { INIT_TRIGGER } from '@/lib/interview/constants';
import { isRoundViewOnly } from '@/lib/interview/round-status';
import { ProgressBar } from './progress-bar';
import { InterviewerBanner } from './interviewer-banner';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { useInterviewControls } from './control-bar';
import { RoundTransition } from './round-transition';
import { ThinkingIndicator } from './thinking-indicator';
import { VoiceInterviewRoom } from './voice-interview-room';
import type { InterviewMessage, InterviewRound, InterviewerConfig } from '@/types/interview';

/** Convert DB messages to UIMessage format */
function dbMessagesToUIMessages(dbMessages: InterviewMessage[]): UIMessage[] {
  return dbMessages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      id: m.id,
      role: m.role === 'interviewer' ? ('assistant' as const) : ('user' as const),
      parts: [{ type: 'text' as const, text: m.content }],
      metadata: m.metadata,
    }));
}

interface InterviewRoomProps {
  sessionId: string;
  initialMessages?: UIMessage[];
}

export function InterviewRoom({ sessionId, initialMessages }: InterviewRoomProps) {
  const t = getCopy('interview.room');
  const router = useRouter();
  const { currentSession, rounds, currentRoundIndex, setCurrentRoundIndex, advanceToNextRound, setIsGeneratingReport, status: sessionStatus } =
    useInterviewStore();
  const [showTransition, setShowTransition] = useState(false);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);

  const currentRound = rounds[currentRoundIndex];
  const panel = currentRound?.interviewerConfig.panelInterviewers;
  const isRoundDone = isRoundViewOnly(currentRound?.status, sessionStatus);
  const isVoiceMode = currentSession?.interactionMode === 'voice';

  const { messages, activeSpeaker, error, input, handleInputChange, handleSubmit, isLoading, resetMessages, regenerate, sendMessage, setMessages } =
    useInterviewChat({
      sessionId,
      roundId: currentRound?.id || '',
    });

  const previousSpeaker = [...messages].reverse().find(m => m.role === 'assistant' && (m.metadata as {speaker?: InterviewerConfig})?.speaker)?.metadata as {speaker?: InterviewerConfig} | undefined;
  const interviewerConfig = (panel ? activeSpeaker || previousSpeaker?.speaker : null) || currentRound?.interviewerConfig;


  // Load initial messages from DB on first render
  const loadedRef = useRef(false);
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0 && !loadedRef.current) {
      loadedRef.current = true;
      setMessages(initialMessages);
    }
  }, [initialMessages, setMessages]);

  // Auto-send trigger to start interview (only if no history and round is active)
  const sentInitRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      currentRound &&
      messages.length === 0 &&
      !isLoading &&
      !loadedRef.current &&
      !isViewingHistory &&
      !isRoundDone &&
      (!isVoiceMode || voiceReady) &&
      sentInitRef.current !== currentRound.id
    ) {
      sentInitRef.current = currentRound.id;
      sendMessage({ text: INIT_TRIGGER });
    }
  }, [currentRound?.id, isVoiceMode, voiceReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-set viewing history if round is already done
  useEffect(() => {
    if (currentRound && isRoundDone) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsViewingHistory(true);
      setShowTransition(false);
      loadedRef.current = true;
    }
  }, [currentRound?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Detect round completion
  useEffect(() => {
    if (!messages.length || isLoading || isViewingHistory) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== 'assistant') return;
    const text = lastMsg.parts?.find(isTextUIPart);
    if (text?.text.includes('[ROUND_COMPLETE]')) {
      if (currentRoundIndex >= rounds.length - 1) {
        setIsGeneratingReport(true);
        router.push(`/interview/${sessionId}/report`);
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowTransition(true);
      }
    }
  }, [messages, isLoading, isViewingHistory, currentRoundIndex, rounds.length, router, sessionId, setIsGeneratingReport]);

  // Switch round: load messages from API
  const handleSwitchRound = useCallback(async (index: number) => {
    const targetRound = rounds[index];
    if (!targetRound) return;

    setShowTransition(false);
    setCurrentRoundIndex(index);

    // Fetch messages for this round

    try {
      const res = await fetch(`/api/interview/${sessionId}`, {
        headers: {},
      });
      const { rounds: roundsWithMessages } = await res.json() as { rounds: InterviewRound[] };
      const roundData = roundsWithMessages.find((round) => round.id === targetRound.id);

      const roundMessages = roundData?.messages;
      if (roundMessages && roundMessages.length > 0) {
        setMessages(dbMessagesToUIMessages(roundMessages));
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to load round messages:', err);
      setMessages([]);
    }

    const isDone = isRoundViewOnly(targetRound.status, sessionStatus);
    setIsViewingHistory(isDone);
    if (isDone) setShowTransition(false);

    // Reset init refs
    loadedRef.current = true;
    sentInitRef.current = targetRound.id;
  }, [rounds, sessionId, sessionStatus, setCurrentRoundIndex, setMessages]);

  const handleNextRound = useCallback(() => {
    setShowTransition(false);
    setIsViewingHistory(false);
    advanceToNextRound();
    resetMessages();
    loadedRef.current = false;
    sentInitRef.current = null;
  }, [advanceToNextRound, resetMessages]);

  const handleGenerateReport = useCallback(async () => {
    setIsGeneratingReport(true);
    router.push(`/interview/${sessionId}/report`);
  }, [sessionId, router, setIsGeneratingReport]);

  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');

  const handleTriggerAI = useCallback((text: string) => {
    sendMessage({ text });
  }, [sendMessage]);

  const handleEndRound = useCallback(() => {
    void handleGenerateReport();
  }, [handleGenerateReport]);

  const { controls, endButton } = useInterviewControls({
    sessionId,
    roundId: currentRound?.id ?? '',
    lastAssistantMessageId: lastAssistantMsg?.id,
    isLoading,
    onTriggerAI: handleTriggerAI,
    onEndRound: handleEndRound,
  });

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (isRoundDone || isViewingHistory || (isVoiceMode && !voiceReady)) return;
    const timer = setInterval(() => setElapsed(value => value + 1), 1000);
    return () => clearInterval(timer);
  }, [isRoundDone, isViewingHistory, isVoiceMode, voiceReady]);
  const panelHeader = <><header className={s.roomHeader}><Link href="/interview"><ArrowLeft size={17}/>返回</Link><h1>{currentSession?.jobTitle}</h1><span className={s.roomMode}>{isVoiceMode ? '语音面试' : '文字面试'}</span><span className={s.roomClock}><Clock size={17}/>{String(Math.floor(elapsed / 60)).padStart(2,'0')}:{String(elapsed % 60).padStart(2,'0')}</span>{!isViewingHistory && endButton}</header>{panel && panel.length > 1 && <div className={s.panelStrip}>{panel.map(p => <div key={p.type} className={s.speakerChip} data-active={interviewerConfig?.type === p.type}><Image width={512} height={512} src={getInterviewerAvatar(p.avatar,p.type)} alt=""/>{p.name} · {p.title}</div>)}</div>}{error && <div role="alert" className="mx-6 my-2 flex items-center gap-3 text-sm text-red-600">暂未收到面试官回复，请重试。<Button variant="outline" disabled={isLoading} onClick={() => void regenerate()}>重试</Button></div>}</>;

  if (!currentRound) return null;

  const isLastRound = currentRoundIndex >= rounds.length - 1;

  if (showTransition && !isViewingHistory) {
    const nextRound = rounds[currentRoundIndex + 1];
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        {!panel && <ProgressBar onSwitchRound={handleSwitchRound} />}
        <RoundTransition
          nextInterviewer={(nextRound?.interviewerConfig as InterviewerConfig) || interviewerConfig}
          onContinue={isLastRound ? handleGenerateReport : handleNextRound}
          isLastRound={isLastRound}
        />
      </div>
    );
  }

  if (isVoiceMode && !isViewingHistory) {
    return (
      <div className={s.room}>
        <VoiceInterviewRoom
          sessionId={sessionId}
          sessionTitle={currentSession?.jobTitle || '语音面试'}
          elapsed={elapsed}
          sessionControls={endButton}
          participants={panel || [interviewerConfig]}
          errorNotice={error ? <div role="alert" className="flex items-center justify-center gap-3 text-sm text-destructive">暂未收到面试官回复，请重试。<Button variant="outline" disabled={isLoading} onClick={() => void regenerate()}>重试</Button></div> : null}
          interviewer={interviewerConfig}
          messages={messages}
          isLoading={isLoading}
          ready={voiceReady}
          onReady={() => setVoiceReady(true)}
          onAnswer={(text) => sendMessage({ text })}
          controls={controls}
          questionCount={messages.filter(message => message.role === 'assistant' && !(message.metadata as {hinted?: boolean})?.hinted).length}
          maxQuestions={currentRound.maxQuestions}
          input={input}
          onInputChange={handleInputChange}
          onInputSubmit={handleSubmit}
        />
      </div>
    );
  }

  return (
    <div className={s.room}>
      {panelHeader}
      {!panel && <ProgressBar onSwitchRound={handleSwitchRound} />}
      <InterviewerBanner config={interviewerConfig} questionCount={messages.filter((m) => m.role === 'assistant').length} />
      <MessageList messages={messages} />
      {isLoading && (
        <div className="px-4">
          <ThinkingIndicator config={interviewerConfig} />
        </div>
      )}
      {isViewingHistory ? (
        <div className="border-t border-zinc-100 px-4 py-3 text-center text-sm text-zinc-400 dark:border-zinc-800">
          {t('roundComplete')}
        </div>
      ) : (
        <div className="space-y-2 border-t border-zinc-100 pt-2 pb-2 dark:border-zinc-800">
          {controls}
          <MessageInput
            input={input}
            isLoading={isLoading}
            onChange={handleInputChange}
            onSubmit={handleSubmit}
          />
        </div>
      )}
    </div>
  );
}
