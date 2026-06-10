// useSpeechRecognition.ts
import { useState, useEffect, useRef, useCallback } from "react";

/* ─── Type augmentation for browser Speech Recognition API ─── */
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface ISpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: ISpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onstart: ((this: ISpeechRecognition, ev: Event) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

export interface UseSpeechRecognitionReturn {
  transcript: string;
  isListening: boolean;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

/**
 * useSpeechRecognition
 * Wraps the browser Web Speech API. Enabled with interim processing to 
 * catch quick utterances dynamically.
 */
export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [transcript, setTranscript] = useState<string>("");
  const [isListening, setIsListening] = useState<boolean>(false);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  const SpeechRecognitionAPI =
    typeof window !== "undefined"
      ? window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
      : null;

  const isSupported = SpeechRecognitionAPI !== null;

  useEffect(() => {
    if (!isSupported || !SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();

    recognition.lang = "hi-IN";
    recognition.continuous = false;      
    recognition.interimResults = true;  // Enabled to capture words instantly
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let currentResult = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentResult += event.results[i][0].transcript;
      }
      setTranscript(currentResult);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("[useSpeechRecognition] Recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, [isSupported, SpeechRecognitionAPI]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    setTranscript("");
    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error("[useSpeechRecognition] Failed to start recognition:", err);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return;
    recognitionRef.current.stop();
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
  }, []);

  return {
    transcript,
    isListening,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
}