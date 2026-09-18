'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { SkipForward, Lightbulb, Bookmark, BookmarkCheck, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInterviewStore } from '@/stores/interview-store';
import { getAIHeaders } from '@/stores/settings-store';

interface ControlBarProps {
  sessionId: string;
  roundId: string;
  lastAssistantMessageId?: string;
  isLoading: boolean;
  onTriggerAI: (text: string) => void;
  onEndRound: () => void;
}

export function useInterviewControls({ sessionId, roundId, lastAssistantMessageId, isLoading, onTriggerAI, onEndRound }: ControlBarProps) {
  const locale = 'zh';
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const { markedMessages, toggleMark, addHinted, addSkipped } = useInterviewStore();
  const isMarked = lastAssistantMessageId ? markedMessages.has(lastAssistantMessageId) : false;

  const sendControl = async (action: string) => {

    const response = await fetch(`/api/interview/${sessionId}/control`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',

        ...getAIHeaders(),
      },
      body: JSON.stringify({ action, roundId, locale }),
    });
    if (!response.ok) throw new Error('操作未成功，请重试');
  };

  const perform = async (action: () => Promise<void>) => {
    if (busy || isLoading) return;
    setBusy(true);
    try { await action(); } catch { toast.error('操作未成功，请重试'); } finally { setBusy(false); }
  };

  const handleSkip = async () => {
    if (lastAssistantMessageId) addSkipped(lastAssistantMessageId);
    await sendControl('skip');
    onTriggerAI('这个问题我暂时没有太好的思路，能换一个问题吗？');
  };

  const handleHint = async () => {
    if (lastAssistantMessageId) addHinted(lastAssistantMessageId);
    await sendControl('hint');
    onTriggerAI('这个问题我不太确定方向，能给我一些思路上的引导吗？');
  };

  const handleEndRound = async () => {
    await sendControl('end_interview');
    onEndRound();
  };

  const handlePause = async () => {
    await sendControl('pause');
    router.push('/interview');
  };

  const handleMark = async () => {
    if (!lastAssistantMessageId) return;


    const response = await fetch(`/api/interview/${sessionId}/mark`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',

      },
      body: JSON.stringify({ messageId: lastAssistantMessageId, marked: !isMarked }),
    });
    if (!response.ok) throw new Error("mark failed");
    toggleMark(lastAssistantMessageId);
  };

  const controls = <>
    <Button variant="outline" onClick={() => void perform(handleHint)} disabled={isLoading || busy || !lastAssistantMessageId}><Lightbulb size={16}/>获取提示</Button>
    <Button variant="outline" onClick={() => void perform(handleSkip)} disabled={isLoading || busy || !lastAssistantMessageId}><SkipForward size={16}/>跳过本题</Button>
    <Button variant="outline" size="icon" title={isMarked ? '取消收藏此题' : '收藏此题'} onClick={() => void perform(handleMark)} disabled={isLoading || busy || !lastAssistantMessageId}>{isMarked ? <BookmarkCheck size={16}/> : <Bookmark size={16}/>}</Button>
  </>;
  const endButton = <><Button variant="ghost" size="icon" title="暂停并返回" onClick={() => void perform(handlePause)} disabled={isLoading || busy}><Pause size={17}/></Button><Button className="min-w-28 bg-black text-white hover:bg-zinc-800" onClick={() => setEndOpen(true)} disabled={isLoading || busy}>结束面试</Button><AlertDialog open={endOpen} onOpenChange={setEndOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>结束本次面试？</AlertDialogTitle><AlertDialogDescription>已完成的回答将保留，接下来可以查看面试报告。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>继续面试</AlertDialogCancel><AlertDialogAction onClick={() => void perform(handleEndRound)}>结束并查看报告</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
  return { controls, endButton };
}
