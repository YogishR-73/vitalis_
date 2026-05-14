"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Send, Brain, Mic, Sparkles, Loader2, Square } from "lucide-react";
import { sendTriageMessage, TriageApiError } from "@/lib/api";

interface SpeechRecAlternative {
  transcript: string;
}

interface SpeechRecResult {
  readonly length: number;
  0: SpeechRecAlternative;
  isFinal: boolean;
}

interface SpeechResultEvent {
  resultIndex: number;
  results: SpeechRecResult[];
}

interface SpeechErrorEvent {
  error: string;
  message: string;
}

/**
 * Web Speech API surface (SpeechRecognition + webkit prefix) with the methods we need.
 * Chrome/Edge implement this; Safari support varies; Firefox often lacks it.
 */
interface AnySpeechRecognition extends EventTarget {
  maxAlternatives: number;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onresult: ((event: SpeechResultEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
}

type MicPhase = "idle" | "preparing" | "listening";

const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-sm leading-relaxed font-light mb-2 last:mb-0">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc pl-4 mb-2 space-y-1 text-sm font-light">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal pl-4 mb-2 space-y-1 text-sm font-light">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-v-text">{children}</strong>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="rounded bg-black/40 px-1 py-0.5 text-[11px] font-mono text-v-cyan/90">
      {children}
    </code>
  ),
};

function speechErrorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
      return "Microphone permission denied. Allow access in the browser address bar, then try again.";
    case "no-speech":
      return "No speech detected. Speak closer to the mic or check input levels.";
    case "audio-capture":
      return "No microphone found or it is in use by another application.";
    case "network":
      return "Voice recognition network error. Check your connection.";
    case "service-not-allowed":
      return "Speech service is not allowed in this context (HTTPS may be required).";
    default:
      return `Voice capture stopped (${code}).`;
  }
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "ai",
      text: "VITALIS_CORE online. Neural synchronization complete. How can I assist with your physiological optimization today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | null>(null);

  const recognitionRef = useRef<AnySpeechRecognition | null>(null);
  const intentionalStopRef = useRef(false);
  /** Text in the input when dictation started; finals append so the user can edit before Send. */
  const dictationBaseRef = useRef("");

  const [micPhase, setMicPhase] = useState<MicPhase>("idle");
  const [speechHint, setSpeechHint] = useState<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const stopRecognition = useCallback(() => {
    intentionalStopRef.current = true;
    const r = recognitionRef.current;
    recognitionRef.current = null;
    if (r) {
      try {
        r.abort();
      } catch {
        try {
          r.stop();
        } catch {
          /* ignore */
        }
      }
    }
    setMicPhase("idle");
  }, []);

  useEffect(() => () => stopRecognition(), [stopRecognition]);

  const getSpeechRecognitionCtor = (): (new () => AnySpeechRecognition) | null => {
    if (typeof window === "undefined") return null;
    const w = window as unknown as {
      SpeechRecognition?: new () => AnySpeechRecognition;
      webkitSpeechRecognition?: new () => AnySpeechRecognition;
    };
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
  };

  /**
   * Mic control: optional getUserMedia warms OS-level permission; SpeechRecognition handles the rest.
   * Transcript updates only the input field — the user confirms with Send to avoid duplicate chat lines.
   * Second press while listening/preparing aborts capture (stop/listen toggle).
   */
  const toggleMic = useCallback(async () => {
    setSpeechHint(null);

    if (micPhase === "listening" || micPhase === "preparing") {
      stopRecognition();
      return;
    }

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSpeechHint("Voice typing is not supported in this browser. Try Chrome or Edge on desktop.");
      return;
    }

    dictationBaseRef.current = input.trim();
    setMicPhase("preparing");

    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        setSpeechHint(
          "Microphone access was denied or unavailable. Allow the microphone for this site, then tap the mic again."
        );
        setMicPhase("idle");
        return;
      }
    }

    intentionalStopRef.current = false;
    const recognition = new Ctor();
    recognitionRef.current = recognition;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setMicPhase("listening");
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setMicPhase("idle");
    };

    recognition.onerror = (ev: SpeechErrorEvent) => {
      if (intentionalStopRef.current) return;
      setSpeechHint(speechErrorMessage(ev.error));
      recognitionRef.current = null;
      setMicPhase("idle");
    };

    recognition.onresult = (event: SpeechResultEvent) => {
      let spoken = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        spoken += event.results[i][0]?.transcript ?? "";
      }
      const base = dictationBaseRef.current;
      const next = [base, spoken.trim()].filter(Boolean).join(" ").trim();
      setInput(next);
    };

    try {
      recognition.start();
    } catch {
      setSpeechHint("Could not start the speech recognizer. Wait a moment and try again.");
      recognitionRef.current = null;
      setMicPhase("idle");
    }
  }, [input, micPhase, stopRecognition]);

  /**
   * Chat flow: append user bubble → call FastAPI /api/triage (OpenRouter on server) → append AI reply.
   * session_id is stored in a ref so follow-up turns keep server-side conversation memory.
   * Failures are caught so the UI never throws; users see a calm fallback message instead.
   */
  const handleSend = async (textOverride?: string) => {
    const textToSend = (textOverride ?? input).trim();
    if (!textToSend || isTyping) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    if (!textOverride) setInput("");
    setIsTyping(true);

    try {
      const data = await sendTriageMessage(textToSend, sessionIdRef.current ?? undefined);
      sessionIdRef.current = data.session_id;
      const body = [data.ai_message, data.follow_up_question].filter(Boolean).join("\n\n");
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: body,
      };
      setMessages((prev) => [...prev, aiMsg]);

      if ("speechSynthesis" in window && !textOverride) {
        const utterance = new SpeechSynthesisUtterance(data.ai_message.substring(0, 100) + "...");
        utterance.rate = 1.1;
        utterance.pitch = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      let note =
        "Neural link unstable. I've noted your symptoms and I'm analyzing the telemetry. Please try again in a moment.";
      if (err instanceof TriageApiError) {
        if (err.status === 408) note = "Request timed out waiting for the neural core. Please try again.";
        else if (err.status === 503) note = "The triage core is not fully configured. Check server environment keys.";
        else if (err.status >= 500) note = "Upstream triage service error. Please retry shortly.";
      }
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "ai",
          text: note,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="glass rounded-[40px] flex flex-col h-[600px] w-full max-w-2xl mx-auto overflow-hidden shadow-2xl relative">
      {/* Header */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-v-cyan/10 flex items-center justify-center relative group">
            <Brain className="text-v-cyan group-hover:scale-110 transition-transform" size={24} />
            <div className="absolute inset-0 bg-v-cyan blur-xl opacity-20" />
          </div>
          <div>
            <h3 className="font-bold tracking-tight">VITALIS_CORE_AI</h3>
            <span className="text-[9px] font-mono text-v-emerald uppercase tracking-widest">Active_Neural_Link</span>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-v-emerald animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-v-cyan animate-pulse delay-75" />
          <div className="w-2 h-2 rounded-full bg-v-blue animate-pulse delay-150" />
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-6 scrollbar-hide">
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] p-5 rounded-[24px] ${
                  msg.role === "user"
                    ? "bg-v-cyan/10 border border-v-cyan/20 text-v-text rounded-tr-none shadow-[0_0_20px_rgba(0,212,255,0.05)]"
                    : "bg-white/[0.03] border border-white/5 text-v-text rounded-tl-none"
                }`}
              >
                {msg.role === "user" ? (
                  <p className="text-sm leading-relaxed font-light">{msg.text}</p>
                ) : (
                  <div className="text-sm leading-relaxed font-light prose-invert">
                    <ReactMarkdown components={mdComponents}>{msg.text}</ReactMarkdown>
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[8px] font-mono text-v-muted uppercase">
                    {msg.role === "user" ? "Auth_Patient" : "Core_Intelligence"}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}

          {isTyping && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex justify-start"
            >
              <div className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl rounded-tl-none">
                <Loader2 className="text-v-cyan animate-spin" size={16} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="p-6 bg-white/[0.02] border-t border-white/5">
        <div className="relative flex items-center gap-3">
          <button
            type="button"
            onClick={() => void toggleMic()}
            disabled={isTyping}
            aria-pressed={micPhase === "listening"}
            aria-label={
              micPhase === "listening"
                ? "Stop listening"
                : micPhase === "preparing"
                  ? "Preparing microphone"
                  : "Start voice input"
            }
            className={`p-3 rounded-2xl transition-all shrink-0 ${
              micPhase === "listening"
                ? "bg-v-red text-v-bg animate-pulse shadow-[0_0_20px_rgba(255,34,68,0.4)]"
                : micPhase === "preparing"
                  ? "bg-v-cyan/20 text-v-cyan border border-v-cyan/30"
                  : "glass hover:bg-v-cyan/10 text-v-cyan"
            } disabled:opacity-40`}
          >
            {micPhase === "preparing" ? (
              <Loader2 className="animate-spin" size={20} />
            ) : micPhase === "listening" ? (
              <Square size={18} className="fill-current" />
            ) : (
              <Mic size={20} />
            )}
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSend();
            }}
            placeholder="Describe your physiological state…"
            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-v-cyan/40 transition-all font-light placeholder:text-v-muted/50"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={isTyping}
            className="p-4 rounded-2xl bg-v-cyan text-v-bg hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:scale-100 shrink-0"
          >
            <Send size={20} />
          </button>
        </div>
        {micPhase === "listening" && (
          <p className="mt-2 text-[10px] font-mono text-v-cyan uppercase tracking-widest">Listening… speak now</p>
        )}
        {micPhase === "preparing" && (
          <p className="mt-2 text-[10px] font-mono text-v-muted uppercase tracking-widest">
            Preparing microphone…
          </p>
        )}
        {speechHint && (
          <p className="mt-2 text-[11px] text-v-red/90 font-light leading-snug" role="status">
            {speechHint}
          </p>
        )}

        <div className="mt-6 flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { label: "Analyze Pulse", key: "pulse" },
            { label: "Risk Prediction", key: "risk" },
            { label: "Clinical Sync", key: "sync" },
            { label: "Nutrient Check", key: "nutrient" },
          ].map((tag) => (
            <button
              type="button"
              key={tag.key}
              onClick={() => void handleSend(tag.label)}
              disabled={isTyping}
              className="flex-shrink-0 px-4 py-2 rounded-xl glass border-white/5 text-[10px] font-mono text-v-muted hover:text-v-cyan hover:border-v-cyan/30 transition-all uppercase tracking-widest flex items-center gap-2 group disabled:opacity-30"
            >
              <Sparkles size={12} className="group-hover:rotate-12 transition-transform" />
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 right-0 w-full h-px bg-gradient-to-r from-transparent via-v-cyan/20 to-transparent shadow-[0_0_20px_rgba(0,212,255,0.2)]" />
    </div>
  );
}
