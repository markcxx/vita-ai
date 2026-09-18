'use client';
import Image from 'next/image';
import { cleanInterviewerText } from '@/lib/interview/text';
import { useEffect, useRef } from 'react';
import { isTextUIPart, type UIMessage } from 'ai';
import { PanelRightClose, UserRound } from 'lucide-react';
import { HIDDEN_MESSAGES } from '@/lib/interview/constants';
import { getInterviewerAvatar } from '@/lib/interview/avatar';
import type { InterviewerConfig } from '@/types/interview';
import s from './interview.module.css';
import { Button } from '@/components/ui/button';

export function InterviewTranscript({ messages, interviewer, open, onCollapse }: { messages: UIMessage[]; interviewer: InterviewerConfig; open: boolean; onCollapse: () => void }) {
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open && list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [messages, open]);
  const visible = messages.map(m => ({...m, text:m.parts.filter(isTextUIPart).map(p=>p.text).join('').replace(/\[ROUND_COMPLETE\]/g,'').trim()})).filter(m=>m.text && !HIDDEN_MESSAGES.has(m.text));
  return <aside className={s.transcriptPanel}><header><h2>对话记录</h2><Button variant="ghost" size="sm" title="收起对话记录" onClick={onCollapse}><PanelRightClose size={16}/>收起</Button></header><div ref={list} className={s.transcriptMessages}>{visible.length ? visible.map(m=>{
    const speaker = (m.metadata as {speaker?:InterviewerConfig})?.speaker || interviewer;
    const ai = m.role === 'assistant';
    return <article key={m.id} data-assistant={ai}><div className={s.recordAvatar}>{ai ? <Image width={512} height={512} src={getInterviewerAvatar(speaker.avatar,speaker.type)} alt=""/> : <UserRound size={21}/>}</div><div><p>{ai ? `${speaker.name} · ${speaker.title}` : '我'}</p><div>{ai ? cleanInterviewerText(m.text, speaker) : m.text}</div></div></article>;
  }) : <p className={s.transcriptEmpty}>开始交流后，对话会记录在这里</p>}</div></aside>;
}
