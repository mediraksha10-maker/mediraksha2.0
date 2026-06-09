import { useState, useEffect, useRef, useCallback } from "react";

/* ─── Type augmentation for browser Speech Recognition API ─── */
interface SpeechRecognitionEvent extends Event {
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

/* ─── Hook return type ─── */
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
 *
 * Wraps the browser Web Speech API (SpeechRecognition / webkitSpeechRecognition).
 * Language is set to "hi-IN" so that Google's cloud recognizer automatically
 * handles mixed Hindi + English (Hinglish) speech without extra configuration.
 */
export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [transcript, setTranscript] = useState<string>("");
  const [isListening, setIsListening] = useState<boolean>(false);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  /* ── Detect API support once on mount ── */
  const SpeechRecognitionAPI =
    typeof window !== "undefined"
      ? window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
      : null;

  const isSupported = SpeechRecognitionAPI !== null;

  /* ── Build and configure the recognition instance ── */
  useEffect(() => {
    if (!isSupported || !SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();

    /*
     * "hi-IN" instructs Google Speech to use the Hindi (India) acoustic model.
     * Because Google's recognizer is bilingual-aware for hi-IN, it transparently
     * handles Hinglish (mixed Hindi + English) utterances without any extra flags.
     */
    recognition.lang = "hi-IN";
    recognition.continuous = false;      // single-utterance mode
    recognition.interimResults = false;  // only fire on final result
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const finalTranscript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ")
        .trim();

      setTranscript(finalTranscript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("[useSpeechRecognition] Recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    /* Cleanup: abort if the component unmounts while listening */
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported]);

  /* ── Public controls ── */
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
