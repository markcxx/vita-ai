'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { InterviewerConfig } from '@/types/interview';

export function useInterviewerVoicePreview() {
  const [preview, setPreview] = useState<{ type: string; loading: boolean } | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const cache = useRef(new Map<string, string>());

  useEffect(() => () => {
    generation.current += 1;
    request.current?.abort();
    audio.current?.pause();
    for (const url of cache.current.values()) URL.revokeObjectURL(url);
    cache.current.clear();
  }, []);

  const togglePreview = async (person: InterviewerConfig) => {
    const token = ++generation.current;
    request.current?.abort();
    audio.current?.pause();
    audio.current = null;
    if (preview?.type === person.type) {
      setPreview(null);
      return;
    }
    setPreview({ type: person.type, loading: true });
    const controller = new AbortController();
    request.current = controller;
    try {
      const key = `${person.type}:${person.voiceType || ''}`;
      let url = cache.current.get(key);
      if (!url) {

        const response = await fetch('/api/interview/voice-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json',  },
          body: JSON.stringify({ type: person.type, voiceType: person.voiceType }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('试听暂不可用，请稍后重试');
        const blob = await response.blob();
        if (token !== generation.current) return;
        url = URL.createObjectURL(blob);
        cache.current.set(key, url);
      }
      if (token !== generation.current) return;
      const player = new Audio(url);
      audio.current = player;
      player.onended = () => { if (token === generation.current) setPreview(null); };
      player.onerror = () => {
        if (token === generation.current) { setPreview(null); toast.error('音色播放失败，请重新试听'); }
      };
      await player.play();
      if (token === generation.current) setPreview({ type: person.type, loading: false });
    } catch {
      if (token === generation.current && !controller.signal.aborted) {
        setPreview(null);
        toast.error('试听暂不可用，请稍后重试');
      }
    }
  };

  return { preview, togglePreview };
}
