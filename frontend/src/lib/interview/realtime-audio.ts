export type InterviewAudioEvent = {
  event: 'start' | 'chunk' | 'end' | 'error';
  audio?: string;
  message?: string;
  mimeType?: string;
};

type Listener = (event: InterviewAudioEvent) => void;

const listeners = new Map<string, Set<Listener>>();

export function publishInterviewAudio(sessionId: string, event: InterviewAudioEvent) {
  listeners.get(sessionId)?.forEach((listener) => listener(event));
}

export function subscribeInterviewAudio(sessionId: string, listener: Listener) {
  const sessionListeners = listeners.get(sessionId) ?? new Set<Listener>();
  sessionListeners.add(listener);
  listeners.set(sessionId, sessionListeners);
  return () => {
    sessionListeners.delete(listener);
    if (sessionListeners.size === 0) listeners.delete(sessionId);
  };
}
