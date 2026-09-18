'use client';
import Image from 'next/image';
import Link from 'next/link';
import { cleanInterviewerText } from '@/lib/interview/text';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getCopy } from '@/lib/copy';
import { isTextUIPart, type UIMessage } from 'ai';
import { Captions, Keyboard, Mic, MicOff, Check, Volume2, VolumeX, ArrowLeft, Clock, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InterviewArt } from './interview-art';
import { InterviewTranscript } from './interview-transcript';
import s from './interview.module.css';
import { HIDDEN_MESSAGES } from '@/lib/interview/constants';
import { getInterviewerAvatar } from '@/lib/interview/avatar';
import { useBrowserSpeechRecognition } from '@/hooks/use-browser-speech-recognition';
import { useStreamingInterviewTts } from '@/hooks/use-streaming-interview-tts';
import { Textarea } from '@/components/ui/textarea';
import type { InterviewerConfig } from '@/types/interview';

interface VoiceInterviewRoomProps {
  sessionId: string;
  sessionTitle: string;
  elapsed: number;
  sessionControls: ReactNode;
  errorNotice: ReactNode;
  participants: InterviewerConfig[];
  interviewer: InterviewerConfig;
  messages: UIMessage[];
  isLoading: boolean;
  ready: boolean;
  onReady: () => void;
  onAnswer: (text: string) => void;
  controls: ReactNode;
  questionCount: number;
  maxQuestions: number;
  input: string;
  onInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onInputSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

function messageText(message?: UIMessage) {
  const text = message?.parts?.filter(isTextUIPart).map(part => part.text).join('') ?? '';
  return message?.role === 'assistant' ? cleanInterviewerText(text, (message.metadata as { speaker?: InterviewerConfig })?.speaker) : text;
}

function isEditableTarget(target: EventTarget | null) {
  return target instanceof HTMLElement
    && Boolean(target.closest('input, textarea, select, button, [contenteditable="true"]'));
}

export function VoiceInterviewRoom({
  sessionId,
  sessionTitle, elapsed, sessionControls, errorNotice, participants,
  interviewer,
  messages,
  isLoading,
  ready,
  onReady,
  onAnswer,
  controls,
  questionCount,
  maxQuestions,
  input,
  onInputChange,
  onInputSubmit,
}: VoiceInterviewRoomProps) {
  const t = getCopy('interview.room');
  const locale = 'zh';
  const [speakerOn, setSpeakerOn] = useState(true);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const transcriptToggleRef = useRef<HTMLButtonElement>(null);
  const spaceHeldRef = useRef(false);

  const lastAssistant = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'assistant'),
    [messages],
  );
  const assistantText = messageText(lastAssistant);
  const lastCandidate = useMemo(
    () => [...messages].reverse().find((message) => {
      if (message.role !== 'user') return false;
      const value = messageText(message);
      return value && !HIDDEN_MESSAGES.has(value);
    }),
    [messages],
  );

  const tts = useStreamingInterviewTts({
    enabled: ready && speakerOn,
    sessionId,
  });

  const recognition = useBrowserSpeechRecognition({
    locale,
    disabled: !ready || isLoading || tts.isSpeaking,
    onAnswer,
  });
  const stopRecognition = recognition.stop;
  const startRecognition = recognition.start;

  useEffect(() => {
    if (isLoading || tts.isSpeaking) stopRecognition(false);
  }, [isLoading, stopRecognition, tts.isSpeaking]);

  useEffect(() => {
    if (!ready) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.code !== 'Space'
        || event.repeat
        || spaceHeldRef.current
        || isEditableTarget(event.target)
        || isLoading
        || tts.isSpeaking
        || !recognition.supported
      ) return;
      event.preventDefault();
      spaceHeldRef.current = true;
      void startRecognition({ pushToTalk: true });
    };
    const releaseSpace = (event?: KeyboardEvent) => {
      if (event && event.code !== 'Space') return;
      if (!spaceHeldRef.current) return;
      event?.preventDefault();
      spaceHeldRef.current = false;
      stopRecognition(true);
    };
    const handleBlur = () => releaseSpace();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', releaseSpace);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', releaseSpace);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isLoading, ready, recognition.supported, startRecognition, stopRecognition, tts.isSpeaking]);

  const waitingLabel = lastCandidate ? '面试官正在结合你的回答继续交流…' : '面试官正在准备开场提问…';
  const awaitingReply = isLoading && (messages.at(-1)?.role !== 'assistant' || !assistantText);
  const state = tts.isSpeaking ? 'speaking' : isLoading ? 'thinking' : recognition.isListening ? 'listening' : 'idle';
  const stateLabel = state === 'speaking'
    ? t('voiceSpeaking')
    : state === 'thinking'
      ? waitingLabel
      : state === 'listening'
        ? t('voiceListening')
        : t('voiceTapToStart');
  const liveTranscript = [recognition.transcript, recognition.interimTranscript].filter(Boolean).join(' ')
    || messageText(lastCandidate);
  const voiceError = recognition.error === 'permission'
    ? t('voicePermissionDenied')
    : recognition.error === 'insecure'
      ? t('voiceInsecureContext')
      : recognition.error === 'no-device'
        ? t('voiceNoMicrophone')
    : !recognition.supported
      ? t('voiceUnsupported')
      : tts.error
        ? t('voiceServiceUnavailable')
        : null;

  const toggleMic = () => {
    if (recognition.isListening) recognition.stop(true);
    else void recognition.start({ pushToTalk: true });
  };

  const prepareVoiceInterview = async () => {
    await recognition.prepare();
    onReady();
  };

  return <div className={s.immersiveLayout} data-transcript-open={transcriptOpen}>
    <section className={s.voiceMain}>
      <div className={s.voiceStage}>
        <div className={s.voiceBackdrop}><InterviewArt/></div>
        <div className={s.avatarHalo} data-speaking={tts.isSpeaking}><Image width={512} height={512} key={interviewer.type} src={getInterviewerAvatar(interviewer.avatar,interviewer.type)} alt={interviewer.name} className={s.face}/></div>
        <p className={s.speakerName}>{interviewer.name} · {interviewer.title}</p>
        <div className={s.subtitleArea} data-visible={captionsOn} tabIndex={captionsOn ? 0 : -1} aria-label="面试官问题字幕">
          {captionsOn ? (awaitingReply ? waitingLabel : assistantText || (ready ? (errorNotice ? '暂未收到回复，请点击下方重试。' : '等待面试官开始交流…') : '准备好后，点击开始面试。')) : <span className={s.hint}>字幕已隐藏，专注听取面试官提问</span>}
        </div>
        <p className={s.listeningStatus} role="status"><Mic size={14}/>{ready ? stateLabel : '准备好后开始交流'}</p>
        <div className={s.wave} data-active={state === 'listening' || state === 'speaking'} aria-hidden="true">{Array.from({length:55},(_,i)=><i key={i} style={{height:4+Math.sin(i*.8)**2*(28-Math.abs(i-27)*.8),animationDelay:`${i*43}ms`}}/>)}</div>
      </div>
      <div className={s.immersiveBottom}>
        {errorNotice}
        {voiceError && <p role="alert" className={s.voiceError}>{voiceError}，可使用文字回答。</p>}
        <div className={s.immersiveComposer}>
          <label htmlFor="interview-answer">{showKeyboard ? '我的回答' : '实时转写'}</label>
          <form onSubmit={onInputSubmit} id="interview-text-answer">
            <Textarea id="interview-answer" rows={2} value={showKeyboard ? input : liveTranscript}
              readOnly={!showKeyboard} maxLength={10000} onChange={showKeyboard ? onInputChange : undefined}
              placeholder={showKeyboard ? '写下你的回答…' : '点击麦克风或按住空格说话，回答会显示在这里'}
              disabled={showKeyboard && (!ready || isLoading)} className="min-h-20 max-h-36 resize-none"/>
          </form>
        </div>
        {!ready ? <div className={s.startVoice}><Button onClick={() => void prepareVoiceInterview()}><Mic size={16}/>开始语音面试</Button><Button variant="outline" onClick={() => { setShowKeyboard(true); onReady(); }}>使用文字回答</Button></div> : <div className={s.voiceDock}>
          <div className={s.micGroup}><button className={s.bigMic} aria-label={recognition.isListening ? '完成并发送回答' : '开始录音'} data-listening={recognition.isListening} onClick={toggleMic} disabled={isLoading || tts.isSpeaking || !recognition.supported}>{recognition.isListening ? <MicOff/> : <Mic/>}</button><small>按住空格说话，松开发送</small></div>
          <div className={s.dockButtons}><Button variant="outline" onClick={() => setCaptionsOn(v => !v)}><Captions size={16}/>{captionsOn ? '隐藏字幕' : '开启字幕'}</Button><Button variant="outline" onClick={() => { recognition.stop(false); setShowKeyboard(v => !v); }}><Keyboard size={16}/>{showKeyboard ? '切换语音' : '切换文字'}</Button><Button variant="outline" size="icon" title={speakerOn ? '关闭声音' : '开启声音'} onClick={() => setSpeakerOn(v => !v)}>{speakerOn ? <Volume2 size={16}/> : <VolumeX size={16}/>}</Button>{controls}<Button className={s.finishAnswer} type={showKeyboard ? 'submit' : 'button'} form={showKeyboard ? 'interview-text-answer' : undefined} onClick={showKeyboard ? undefined : () => recognition.stop(true)} disabled={isLoading || tts.isSpeaking || (showKeyboard ? !input.trim() : !recognition.isListening)}><Check size={16}/>完成回答</Button></div>
        </div>}
        <footer className={s.immersiveFooter}>
          <Link href="/interview" aria-label="返回模拟面试"><ArrowLeft size={16}/>返回</Link>
          <span className={s.immersiveTitle} title={sessionTitle}>{sessionTitle}</span>
          <div className={s.immersiveParticipants} aria-label="本次面试官">{participants.map(person => <Image key={person.type} width={32} height={32} src={getInterviewerAvatar(person.avatar, person.type)} alt={`${person.name} · ${person.title}`} title={`${person.name} · ${person.title}`} data-active={person.type === interviewer.type}/>)}</div>
          <span>第 {Math.min(questionCount, maxQuestions)} / {maxQuestions} 题</span>
          <span><Clock size={14}/>{String(Math.floor(elapsed / 60)).padStart(2,'0')}:{String(elapsed % 60).padStart(2,'0')}</span>
          <Button ref={transcriptToggleRef} variant="ghost" size="sm" aria-expanded={transcriptOpen} aria-controls="interview-transcript" onClick={() => setTranscriptOpen(value => !value)}>{transcriptOpen ? <PanelRightClose size={16}/> : <PanelRightOpen size={16}/>}记录</Button>
          {sessionControls}
        </footer>
      </div>
    </section>
    <div id="interview-transcript" className={s.immersiveTranscript} inert={!transcriptOpen} aria-hidden={!transcriptOpen}>
      <InterviewTranscript messages={messages} interviewer={interviewer} open={transcriptOpen} onCollapse={() => { setTranscriptOpen(false); transcriptToggleRef.current?.focus(); }}/>
    </div>
  </div>;
}
