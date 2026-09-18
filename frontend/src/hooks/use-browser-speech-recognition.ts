'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechRecognitionAlternativeLike { transcript: string }
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionErrorEventLike { error: string }
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
}
interface SpeechRecognitionConstructor { new(): SpeechRecognitionLike }

type VoiceError = 'unsupported' | 'permission' | 'network' | 'insecure' | 'no-device' | null;

export function useBrowserSpeechRecognition({
  locale,
  disabled,
  onAnswer,
}: {
  locale: string;
  disabled: boolean;
  onAnswer: (text: string) => void;
}) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onAnswerRef = useRef(onAnswer);
  const disabledRef = useRef(disabled);
  const wantedRef = useRef(false);
  const runningRef = useRef(false);
  const generationRef = useRef(0);
  const finalBufferRef = useRef('');
  const interimBufferRef = useRef('');
  const permissionReadyRef = useRef(false);
  const pushToTalkRef = useRef(false);
  const submitOnEndRef = useRef(false);
  const submitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [supported, setSupported] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<VoiceError>(null);

  // Callback changes must never recreate or abort an active recognition session.
  useEffect(() => { onAnswerRef.current = onAnswer; }, [onAnswer]);
  const submitBufferedAnswer = useCallback(() => {
    wantedRef.current = false;
    submitOnEndRef.current = false;
    const answer = `${finalBufferRef.current} ${interimBufferRef.current}`.trim();
    finalBufferRef.current = '';
    interimBufferRef.current = '';
    setInterimTranscript('');
    if (!answer) return;
    setTranscript(answer);
    onAnswerRef.current(answer);
  }, []);

  const stop = useCallback((submit = false) => {
    generationRef.current++;
    wantedRef.current = false;
    if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    submitOnEndRef.current = submit;
    if (runningRef.current) recognitionRef.current?.stop();
    else { setIsListening(false); if (submit) submitBufferedAnswer(); }
    if (submit) {
      submitTimerRef.current = setTimeout(() => {
        if (submitOnEndRef.current) submitBufferedAnswer();
      }, 500);
    }
  }, [submitBufferedAnswer]);

  useEffect(() => {
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSupported(false);
      return;
    }
    const generationCounter = generationRef;
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = locale.startsWith('zh') ? 'zh-CN' : 'en-US';
    recognition.onstart = () => {
      runningRef.current = true;
      if (!wantedRef.current || disabledRef.current) { recognition.stop(); return; }
      setIsListening(true); setError(null);
    };
    recognition.onend = () => {
      runningRef.current = false;
      if (wantedRef.current && !disabledRef.current) {
        // Browsers can end a continuous session at silence boundaries. Keep the
        // same held-key recording alive without clearing or submitting its text.
        if (interimBufferRef.current) {
          finalBufferRef.current = `${finalBufferRef.current} ${interimBufferRef.current}`.trim();
          interimBufferRef.current = '';
          setTranscript(finalBufferRef.current); setInterimTranscript('');
        }
        restartTimerRef.current = setTimeout(() => {
          if (!wantedRef.current || disabledRef.current) return;
          try { recognition.start(); }
          catch { wantedRef.current = false; setIsListening(false); setError('network'); }
        }, 120);
        return;
      }
      setIsListening(false);
      if (submitOnEndRef.current) submitBufferedAnswer();
    };
    recognition.onerror = (event) => {
      if (event.error === 'no-speech') return;
      wantedRef.current = false;
      runningRef.current = false;
      submitOnEndRef.current = false;
      setIsListening(false);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') setError('permission');
      else if (event.error === 'audio-capture') setError('no-device');
      else if (event.error !== 'aborted') setError('network');
    };
    recognition.onresult = (event) => {
      if (!wantedRef.current && !submitOnEndRef.current) return;
      let interim = '';
      let finalDelta = '';
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index];
        const value = result[0]?.transcript ?? '';
        if (result.isFinal) finalDelta += value;
        else interim += value;
      }
      if (finalDelta) {
        finalBufferRef.current = `${finalBufferRef.current} ${finalDelta}`.trim();
        setTranscript(finalBufferRef.current);
        if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
        if (!pushToTalkRef.current && wantedRef.current) submitTimerRef.current = setTimeout(() => stop(true), 1400);
      }
      interimBufferRef.current = interim;
      setInterimTranscript(interim);
    };
    recognitionRef.current = recognition;
    return () => {
      // Invalidate the latest pending permission request, not the mount-time value.
      generationCounter.current++;
      wantedRef.current = false; runningRef.current = false;
      if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      recognition.onend = null; recognition.onstart = null;
      recognition.onresult = null; recognition.onerror = null;
      recognition.abort(); recognitionRef.current = null;
    };
  }, [locale, stop, submitBufferedAnswer]);

  useEffect(() => {
    disabledRef.current = disabled;
    if (disabled) stop(false);
  }, [disabled, stop]);

  const prepare = useCallback(async () => {
    if (!window.isSecureContext) { setError('insecure'); return false; }
    if (permissionReadyRef.current) return true;
    if (!navigator.mediaDevices?.getUserMedia) { setError('unsupported'); return false; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      permissionReadyRef.current = true; setError(null); return true;
    } catch (cause) {
      const name = cause instanceof DOMException ? cause.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') setError('permission');
      else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') setError('no-device');
      else setError('network');
      return false;
    }
  }, []);

  const start = useCallback(async ({ pushToTalk = false }: { pushToTalk?: boolean } = {}) => {
    if (!recognitionRef.current || disabledRef.current || wantedRef.current) return;
    const attempt = ++generationRef.current;
    wantedRef.current = true;
    finalBufferRef.current = ''; interimBufferRef.current = '';
    setTranscript(''); setInterimTranscript('');
    if (!(await prepare())) { if (attempt === generationRef.current) wantedRef.current = false; return; }
    // Releasing Space while the permission prompt is open cancels this attempt.
    if (attempt !== generationRef.current || !wantedRef.current || disabledRef.current) return;
    finalBufferRef.current = ''; interimBufferRef.current = '';
    pushToTalkRef.current = pushToTalk; submitOnEndRef.current = false;
    setTranscript(''); setInterimTranscript(''); setError(null);
    try { recognitionRef.current?.start(); }
    catch { wantedRef.current = false; setIsListening(false); setError('network'); }
  }, [prepare]);

  return { supported, isListening, transcript, interimTranscript, error, prepare, start, stop };
}
