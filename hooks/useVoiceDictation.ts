'use client';
import { useState, useRef, useCallback } from 'react';

export type DictationState = 'idle' | 'recording' | 'transcribing' | 'error';

export function useVoiceDictation(onTranscript: (text: string) => void) {
  const [state, setState] = useState<DictationState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = useCallback(async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setState('transcribing');
        try {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const res = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': mimeType },
            body: blob,
          });
          const data = await res.json() as { transcript?: string; error?: string };
          if (!res.ok || data.error) throw new Error(data.error ?? 'Transcription failed');
          if (data.transcript) onTranscript(data.transcript);
        } catch (err) {
          setErrorMsg(String(err));
          setState('error');
          return;
        }
        setState('idle');
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setState('recording');
    } catch (err) {
      setErrorMsg(String(err));
      setState('error');
    }
  }, [onTranscript]);

  const stop = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  }, []);

  const toggle = useCallback(() => {
    if (state === 'recording') stop();
    else if (state === 'idle' || state === 'error') start();
  }, [state, start, stop]);

  return { state, errorMsg, toggle };
}
