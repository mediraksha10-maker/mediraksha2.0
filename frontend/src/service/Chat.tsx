// pages/Chat.tsx
import React, { useState, useEffect, useRef, type ChangeEvent } from "react";
import { Bot, ArrowLeft, Send, Sparkles, User, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router";
import api from '../api/Api'; 
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import MicButton from '../components/MicButton';

/* ---------------- TYPES ---------------- */
interface Message {
  id: string;
  sender: "bot" | "user";
  text: string;
  timestamp: Date;
}

/* ---------------- INITIAL SYSTEM PROMPTS ---------------- */
const INITIAL_BOT_MESSAGES: Omit<Message, "id" | "timestamp">[] = [
  {
    sender: "bot",
    text: "Hello! I am your HealthAI Virtual Diagnostic Assistant. 🩺"
  },
  {
    sender: "bot",
    text: "To help provide an accurate screening, please describe how you are feeling, including any symptoms, when they started, or relevant health background."
  }
];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const welcomeTimeoutRef = useRef<number[]>([]); // 🌟 Tracks welcome timers to prevent memory leaks
  const navigate = useNavigate();

  /* ── Speech recognition ── */
  const {
    transcript,
    isListening,
    isSupported: isMicSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  /* Syncs live voice inputs directly into the chat text input box */
  useEffect(() => {
    if (transcript) {
      setInputValue(transcript);
    }
  }, [transcript]);

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      setInputValue(""); 
      resetTranscript();
      startListening();
    }
  };

  // Load initial welcome script safely with unmount tracking
  useEffect(() => {
    initiateWelcomeChat();
    
    return () => {
      // 🌟 Clears active timers if the component unmounts or restarts in Strict Mode
      welcomeTimeoutRef.current.forEach(clearTimeout);
    };
  }, []);

  // Smooth scroll tracking container rule
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const initiateWelcomeChat = () => {
    // 🌟 Cancel any pending welcome execution jobs running in the background background
    welcomeTimeoutRef.current.forEach(clearTimeout);
    welcomeTimeoutRef.current = [];

    setMessages([]);
    setIsTyping(true);
    
    const timer1 = window.setTimeout(() => {
      const msg1: Message = {
        id: `welcome-1-${Date.now()}`, // 🌟 Dynamically stamped unique keys
        sender: "bot",
        text: INITIAL_BOT_MESSAGES[0].text,
        timestamp: new Date()
      };
      setMessages([msg1]);
      
      const timer2 = window.setTimeout(() => {
        const msg2: Message = {
          id: `welcome-2-${Date.now()}`, // 🌟 Dynamically stamped unique keys
          sender: "bot",
          text: INITIAL_BOT_MESSAGES[1].text,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, msg2]);
        setIsTyping(false);
      }, 1000);

      welcomeTimeoutRef.current.push(timer2);
    }, 500);

    welcomeTimeoutRef.current.push(timer1);
  };

  const handleSendMessage = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const cleanInput = inputValue.trim();
    if (!cleanInput) return;

    // 1. Construct and append user message element to the chat thread
    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      sender: "user",
      text: cleanInput,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    resetTranscript(); // 🌟 Clear out audio tracking hook cache safely on form submission
    setIsTyping(true);

    try {
      // 2. Perform POST request to your backend API route
      const response = await api.post("/chat", { message: cleanInput });
      
      const aiResponseText = response.data?.response || "I could not process that request. Please try rephrasing your symptoms.";

      const botMessage: Message = {
        id: `msg-${Date.now()}-bot`,
        sender: "bot",
        text: aiResponseText,
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      console.error("AI Chat Assistant Endpoint Error:", err);
      
      // Inject a user-friendly diagnostic message inside the thread if server drops
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        sender: "bot",
        text: "⚠️ Connection error: Failed to reach the diagnostics server. Please check your network and try re-submitting.",
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      
      {/* ── Top Bar Header ── */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm shadow-indigo-200">
              <Bot size={20} />
            </div>
            <div>
              <h1 className="text-base font-black text-slate-800 tracking-tight leading-none mb-0.5">
                HealthAI Diagnostic
              </h1>
              <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Virtual Medical Assistant
              </span>
            </div>
          </div>
        </div>

        <button 
          onClick={initiateWelcomeChat}
          className="p-2 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-colors"
          title="Reset Conversation"
        >
          <RefreshCw size={14} /> Clear
        </button>
      </nav>

      {/* ── Main Scrollable Thread ── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:p-8 space-y-6 max-w-4xl w-full mx-auto">
        {messages.map((msg) => {
          const isBot = msg.sender === "bot";
          const isErrorMessage = msg.text.startsWith("⚠️");
          return (
            <div 
              key={msg.id} 
              className={`flex gap-3 md:gap-4 max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-200 ${
                isBot ? "mr-auto" : "ml-auto flex-row-reverse"
              }`}
            >
              {/* Avatar Indicator Column */}
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs text-xs font-bold ${
                isBot ? "bg-white border border-slate-100 text-indigo-600" : "bg-indigo-600 text-white"
              }`}>
                {isBot ? <Bot size={16} /> : <User size={16} />}
              </div>

              {/* Chat Text Blocks */}
              <div className="space-y-1">
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs border ${
                  isBot 
                    ? isErrorMessage 
                      ? "bg-rose-50 text-rose-800 border-rose-100 rounded-tl-none font-medium" 
                      : "bg-white text-slate-800 border-slate-100 rounded-tl-none" 
                    : "bg-indigo-600 text-white border-transparent rounded-tr-none font-medium"
                }`}>
                  {msg.text}
                </div>
                <p className={`text-[9px] text-slate-400 px-1 font-semibold ${!isBot && "text-right"}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}

        {/* Typing Loader Automation Element */}
        {isTyping && (
          <div className="flex gap-3 md:gap-4 max-w-lg mr-auto">
            <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Bot size={16} />
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-5 py-3.5 flex items-center justify-center shadow-xs">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}
        
        <div ref={chatEndRef} />
      </div>

      {/* ── Input Action Bar Form Footer ── */}
      <div className="bg-white border-t border-slate-200 p-4 md:p-6 shrink-0 z-10">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSendMessage} className="relative flex items-center">
            <input
              type="text"
              value={inputValue}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
              placeholder="Describe your symptoms or ask a health inquiry..."
              className={`w-full bg-slate-50 border border-slate-200 rounded-2xl pl-4 py-3.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner placeholder-slate-400 ${isMicSupported ? 'pr-24' : 'pr-14'}`}
              disabled={isTyping}
            />

            {/* Microphone button */}
            {isMicSupported && (
              <div className="absolute right-12 flex items-center">
                <MicButton
                  onClick={handleMicClick}
                  isListening={isListening}
                  disabled={isTyping}
                />
              </div>
            )}

            {/* Unsupported browser notice */}
            {!isMicSupported && (
              <span
                title="Your browser does not support voice input. Please use Chrome or Edge."
                className="absolute right-14 text-[10px] text-slate-400 hidden sm:block select-none"
              >
                🎤 N/A
              </span>
            )}

            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="absolute right-2 p-2 bg-indigo-600 disabled:bg-slate-100 text-white disabled:text-slate-300 rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="Send Message"
            >
              <Send size={16} />
            </button>
          </form>
          <div className="flex items-center gap-1 mt-2.5 px-1 justify-center sm:justify-start text-slate-400">
            <Sparkles size={12} className="text-indigo-500" />
            <p className="text-[10px] font-medium tracking-tight">
              AI insights are for educational purposes. Always cross-reference with medical experts.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}