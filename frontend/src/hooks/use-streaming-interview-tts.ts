'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  subscribeInterviewAudio,
  type InterviewAudioEvent,
} from '@/lib/interview/realtime-audio';

async function appendBuffer(sourceBuffer: SourceBuffer, chunk: Uint8Array) {
  if (sourceBuffer.updating) {
    await new Promise<void>((resolve) => sourceBuffer.addEventListener('updateend', () => resolve(), { once: true }));
  }
  sourceBuffer.appendBuffer(chunk as BufferSource);
  await new Promise<void>((resolve, reject) => {
    sourceBuffer.addEventListener('updateend', () => resolve(), { once: true });
    sourceBuffer.addEventListener('error', () => reject(new Error('Unable to append streaming audio')), { once: true });
  });
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function useStreamingInterviewTts({
  enabled,
  sessionId,
}: {
  enabled: boolean;
  sessionId: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const sourceBufferReadyRef = useRef<Promise<SourceBuffer> | null>(null);
  const appendChainRef = useRef<Promise<void>>(Promise.resolve());
  const fallbackChunksRef = useRef<Uint8Array[]>([]);
  const receivedAudioRef = useRef(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const releasePlayer = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    audioRef.current = null;
    mediaSourceRef.current = null;
    objectUrlRef.current = null;
    sourceBufferReadyRef.current = null;
    appendChainRef.current = Promise.resolve();
    fallbackChunksRef.current = [];
    receivedAudioRef.current = false;
  }, []);

  const stop = useCallback(() => {
    releasePlayer();
    setIsSpeaking(false);
  }, [releasePlayer]);

  const startStream = useCallback((mimeType = 'audio/mpeg') => {
    releasePlayer();
    setError(null);
    const audio = new Audio();
    audioRef.current = audio;

    if (!('MediaSource' in window) || !MediaSource.isTypeSupported(mimeType)) return;
    const mediaSource = new MediaSource();
    mediaSourceRef.current = mediaSource;
    const objectUrl = URL.createObjectURL(mediaSource);
    objectUrlRef.current = objectUrl;
    audio.src = objectUrl;
    sourceBufferReadyRef.current = new Promise<SourceBuffer>((resolve, reject) => {
      mediaSource.addEventListener('sourceopen', () => {
        try {
          resolve(mediaSource.addSourceBuffer(mimeType));
        } catch (sourceError) {
          reject(sourceError);
        }
      }, { once: true });
    });
  }, [releasePlayer]);

  const pushChunk = useCallback((encodedAudio: string) => {
    const chunk = decodeBase64(encodedAudio);
    if (!chunk.byteLength) return;
    receivedAudioRef.current = true;
    setIsSpeaking(true);

    const sourceBufferReady = sourceBufferReadyRef.current;
    if (!sourceBufferReady) {
      fallbackChunksRef.current.push(chunk);
      return;
    }
    appendChainRef.current = appendChainRef.current.then(async () => {
      const sourceBuffer = await sourceBufferReady;
      await appendBuffer(sourceBuffer, chunk);
      const audio = audioRef.current;
      if (audio?.paused) await audio.play();
    });
  }, []);

  const finishStream = useCallback(() => {
    void (async () => {
      try {
        await appendChainRef.current;
        const audio = audioRef.current;
        if (!audio || !receivedAudioRef.current) {
          setIsSpeaking(false);
          return;
        }

        if (!sourceBufferReadyRef.current) {
          const blob = new Blob(fallbackChunksRef.current as BlobPart[], { type: 'audio/mpeg' });
          const objectUrl = URL.createObjectURL(blob);
          objectUrlRef.current = objectUrl;
          audio.src = objectUrl;
          await audio.play();
        } else if (mediaSourceRef.current?.readyState === 'open') {
          mediaSourceRef.current.endOfStream();
        }

        if (!audio.ended) {
          await new Promise<void>((resolve) => audio.addEventListener('ended', () => resolve(), { once: true }));
        }
      } catch (streamError) {
        setError(streamError instanceof Error ? streamError.message : 'Unable to play streaming audio');
      } finally {
        setIsSpeaking(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!enabled) {
      stop();
      return;
    }
    return subscribeInterviewAudio(sessionId, (event: InterviewAudioEvent) => {
      if (event.event === 'start') startStream(event.mimeType);
      else if (event.event === 'chunk' && event.audio) pushChunk(event.audio);
      else if (event.event === 'end') finishStream();
      else if (event.event === 'error') {
        setError(event.message || 'Streaming speech synthesis failed');
        stop();
      }
    });
  }, [enabled, finishStream, pushChunk, sessionId, startStream, stop]);

  useEffect(() => stop, [stop]);

  return { isSpeaking, error, stop };
}
