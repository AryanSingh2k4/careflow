"use client";

import { useChat, type Message } from "ai/react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  Check,
  Copy,
  Leaf,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  User,
  Mic,
} from "lucide-react";
import { InfoPanel } from "@/components/dashboard/InfoPanel";
import { Markdown } from "@/components/chat/Markdown";
import { ToolResultCard, appointmentToolNames } from "@/components/chat/ToolResultCard";
import { CompanionIllustration } from "@/components/brand/Illustrations";
import { LogoMark } from "@/components/brand/Logo";
import { Badge } from "@/components/ui/Badge";
import { buttonStyles } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/cn";

const legacyChatKey = "careflow_chat_messages";
const maxStoredMessages = 20;

type ChatSession = {
  userId: string;
  storageKey: string;
  initialMessages: Message[];
  isCurrent: () => boolean;
};

type SpeechRecognition = {
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readCachedMessages(storageKey: string): Message[] {
  try {
    const saved = localStorage.getItem(storageKey);
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (message: unknown): message is Message =>
          isRecord(message) &&
          typeof message.id === "string" &&
          typeof message.content === "string" &&
          (message.role === "user" || message.role === "assistant") &&
          (message.toolInvocations === undefined || Array.isArray(message.toolInvocations))
      )
      .slice(-maxStoredMessages);
  } catch {
    return [];
  }
}

const suggestions = [
  {
    label: "Schedule a physical exam",
    value: "Schedule physical exam",
    description: "Find a time that works for you",
    icon: Sparkles,
  },
  {
    label: "What should I bring?",
    value: "What should I bring to my appointment?",
    description: "Preparation, documents and more",
    icon: ShieldCheck,
  },
  {
    label: "Clinic hours",
    value: "What are your clinic hours?",
    description: "Opening times and visit details",
    icon: Leaf,
  },
];

export default function Home() {
  const [session, setSession] = useState<ChatSession | null>();

  useEffect(() => {
    try {
      localStorage.removeItem(legacyChatKey);
    } catch {
      // Chat can run while browser storage is unavailable.
    }

    const supabase = createClient();
    let authVersion = 0;
    let sessionUserId: string | null | undefined;
    let verification: ReturnType<typeof setTimeout> | undefined;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const nextUserId = nextSession?.user.id ?? null;
      if (sessionUserId === nextUserId) return;
      sessionUserId = nextUserId;

      clearTimeout(verification);
      const version = ++authVersion;
      setSession(nextUserId ? undefined : null);
      if (!nextUserId) return;

      // Verify the identity outside the auth callback, which can hold an auth lock.
      verification = setTimeout(async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
        if (version !== authVersion) return;
        if (user?.id !== nextUserId) {
          // Let a later auth event retry transient verification failures. Retries remain
          // event-driven, so a persistent outage cannot create a polling loop.
          sessionUserId = undefined;
          setSession(null);
          return;
        }

        const storageKey = `${legacyChatKey}:${user.id}`;
        setSession({
          userId: user.id,
          storageKey,
          initialMessages: readCachedMessages(storageKey),
          isCurrent: () => version === authVersion,
        });
      }, 0);
    });

    return () => {
      authVersion++;
      clearTimeout(verification);
      subscription.unsubscribe();
    };
  }, []);

  if (session === undefined) return <LoadingScreen label="Getting your care space ready…" />;

  if (!session) {
    return (
      <main className="warm-bloom flex min-h-[calc(100dvh-4rem)] items-center justify-center px-5 py-16">
        <div className="w-full max-w-md rounded-panel border border-outline-variant/80 bg-surface-container-lowest p-8 text-center shadow-card">
          <LogoMark className="mx-auto h-14 w-14" />
          <h1 className="mt-5 font-headline-md text-headline-md text-on-surface">
            Welcome to CareFlow
          </h1>
          <p className="mt-2 text-body-md text-on-surface-variant">
            Sign in to pick up your conversations and appointments where you left off.
          </p>
          <Link href="/login" className={buttonStyles({ className: "mt-6 w-full" })}>
            Sign in to CareFlow
          </Link>
        </div>
      </main>
    );
  }

  return <Receptionist key={session.userId} session={session} />;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access can be blocked; the message stays readable.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-on-surface-variant/80 transition-colors hover:bg-surface-container hover:text-on-surface"
    >
      {copied ? <Check className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function Receptionist({ session }: { session: ChatSession }) {
  const {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    append,
    isLoading,
    error,
    stop,
    reload,
  } = useChat({
    api: "/api/chat",
    initialMessages: session.initialMessages,
    experimental_prepareRequestBody: ({ messages }) => ({
      expectedUserId: session.userId,
      messages: messages.slice(-maxStoredMessages).map(({ role, content }) => ({ role, content })),
    }),
    fetch: (input, init) => {
      if (!session.isCurrent())
        return Promise.reject(new DOMException("Chat session changed.", "AbortError"));
      return fetch(input, init);
    },
  });

  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState("");
  const [showJump, setShowJump] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const stopRef = useRef(stop);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  useEffect(() => {
    if (!session.isCurrent() || isLoading || messages.length === 0) return;

    try {
      localStorage.setItem(session.storageKey, JSON.stringify(messages.slice(-maxStoredMessages)));
    } catch {
      // Chat remains usable when browser storage is blocked or full.
    }
  }, [isLoading, messages, session]);

  useEffect(
    () => () => {
      stopRef.current();
      const recognition = recognitionRef.current;
      if (recognition) {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.abort();
      }
    },
    []
  );

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    const element = composerRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
  }, [input]);

  const sendAppointmentAction = (content: string) => {
    setInput("");
    void append({ role: "user", content });
  };

  const handleVoiceInput = () => {
    const browser = window as Window & {
      SpeechRecognition?: new () => SpeechRecognition;
      webkitSpeechRecognition?: new () => SpeechRecognition;
    };
    const Recognition = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceNotice("Voice input isn't available in this browser. You can type your request instead.");
      return;
    }

    setVoiceNotice("");
    const recognition = new Recognition();
    recognitionRef.current = recognition;
    setIsListening(true);

    const finish = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };

    recognition.onresult = (event) => setInput(event.results[0][0].transcript);
    recognition.onerror = finish;
    recognition.onend = finish;

    try {
      recognition.start();
    } catch {
      finish();
    }
  };

  const scrollToBottom = () => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
    setShowJump(false);
  };

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    setShowJump(element.scrollHeight - element.scrollTop - element.clientHeight > 220);
  };

  const focusComposer = () => {
    requestAnimationFrame(() => composerRef.current?.focus());
  };

  const applySuggestion = (value: string) => {
    setInput(value);
    focusComposer();
  };

  const applyQuickAction = (action: string) => {
    setInput(action);
    focusComposer();
  };

  return (
    <div className="flex h-[calc(100dvh-8.5rem-env(safe-area-inset-bottom))] flex-col overflow-hidden md:h-[calc(100dvh-4rem)] md:flex-row">
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col px-2 pb-2 pt-2 sm:px-3 sm:pb-3 md:p-5 lg:p-7">
          <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-panel border border-outline-variant/80 bg-surface-container-lowest shadow-card">
            {/* Conversation header */}
            <div className="flex flex-none items-center justify-between gap-3 border-b border-outline-variant/60 bg-surface/60 px-3.5 py-2 backdrop-blur-md sm:px-4 sm:py-2.5 md:px-5 md:py-3">
              <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                <div className="relative flex-shrink-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container text-primary sm:h-10 sm:w-10">
                    <Leaf className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={1.9} aria-hidden />
                  </div>
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface-container-lowest bg-success sm:h-3 sm:w-3"
                    aria-hidden
                  />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate font-headline-sm text-[19px] leading-6 text-on-surface sm:text-headline-sm">
                    Mira
                  </h1>
                  <p className="truncate text-[11px] text-on-surface-variant sm:text-[12px]">
                    CareFlow receptionist ·{" "}
                    <span className="font-semibold text-primary">here for you</span>
                  </p>
                </div>
              </div>
              <Badge tone="sage" dot className="hidden shrink-0 xl:inline-flex">
                Private to your account
              </Badge>
            </div>

            {/* Conversation */}
            <div className="relative flex min-h-0 flex-1 flex-col">
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="paper-texture custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain [background-color:var(--color-surface-container-lowest)]"
              >
                <div className="mx-auto w-full max-w-3xl px-3.5 py-4 sm:px-5 sm:py-6 md:px-8 md:py-8">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center pb-4 pt-1 text-center sm:pt-2 md:pt-8">
                      <CompanionIllustration className="h-32 w-40 sm:h-40 sm:w-52" />
                      <p className="mt-1 text-label-sm uppercase tracking-[0.18em] text-primary/75">
                        Your digital receptionist
                      </p>
                      <h2 className="mt-2 max-w-md font-headline-lg text-[26px] leading-8 text-on-surface sm:text-headline-lg">
                        Hello, I&apos;m Mira.
                      </h2>
                      <p className="mt-2 max-w-md text-[14px] leading-6 text-on-surface-variant sm:text-body-md">
                        I can help you find a time, change a visit, or answer questions using
                        clinic-approved information. What would you like to do today?
                      </p>

                      <div className="mt-6 grid w-full max-w-xl gap-2.5 sm:grid-cols-3">
                        {suggestions.map((suggestion) => {
                          const Icon = suggestion.icon;
                          return (
                            <button
                              key={suggestion.value}
                              type="button"
                              onClick={() => applySuggestion(suggestion.value)}
                              className="group flex items-start gap-2.5 rounded-2xl border border-outline-variant/80 bg-surface-container-lowest/80 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary-container/35 hover:shadow-soft active:translate-y-0 sm:flex-col sm:gap-2 sm:p-3.5"
                            >
                              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-container text-primary transition-transform group-hover:scale-105 sm:h-8 sm:w-8">
                                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                              </span>
                              <span className="min-w-0">
                                <span className="block text-[12.5px] font-semibold leading-5 text-on-surface sm:text-[13px]">
                                  {suggestion.label}
                                </span>
                                <span className="mt-0.5 block text-[11px] leading-4 text-on-surface-variant">
                                  {suggestion.description}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-4 text-[11px] text-on-surface-variant/75">
                        Tap a card to start, then press send.
                      </p>
                    </div>
                  ) : null}

                  <div className="space-y-4 sm:space-y-6">
                    {messages.map((message: Message, index) => {
                      const isAssistant = message.role === "assistant";
                      const displayContent = isAssistant
                        ? message.content.replace(/(?<!\[)\[(?:S[1-9]\d*)(?:\s*,\s*S[1-9]\d*)*\](?!\])/g, "")
                        : message.content;
                      const isLast = index === messages.length - 1;
                      const streaming = isLoading && isLast && isAssistant;

                      return (
                        <div
                          key={message.id}
                          className={cn(
                            "flex items-start gap-2 sm:gap-2.5",
                            isAssistant ? "justify-start" : "justify-end"
                          )}
                        >
                          {isAssistant ? (
                            <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-container text-primary sm:h-8 sm:w-8">
                              <Leaf className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={1.9} aria-hidden />
                            </span>
                          ) : null}

                          <div
                            className={cn(
                              "min-w-0",
                              isAssistant
                                ? "max-w-[calc(100%-2.25rem)] sm:max-w-[85%] md:max-w-[78%]"
                                : "max-w-[calc(100%-2.25rem)] sm:max-w-[85%] md:max-w-[70%]"
                            )}
                          >
                            <p
                              className={cn(
                                "mb-1 px-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                                isAssistant
                                  ? "text-left text-on-surface-variant/60"
                                  : "text-right text-primary/70"
                              )}
                            >
                              {isAssistant ? "Mira" : "You"}
                            </p>

                            {isAssistant ? (
                              <>
                                {message.content ? (
                                  <div className="rounded-2xl rounded-tl-md border border-outline-variant/60 bg-surface-container-low px-3.5 py-3 text-on-surface shadow-soft sm:px-4 sm:py-3.5">
                                    <Markdown content={displayContent} />
                                    {streaming ? (
                                      <span
                                        className="ml-0.5 inline-block h-4 w-[2px] animate-pulse rounded-full bg-primary align-[-0.15em]"
                                        aria-hidden
                                      />
                                    ) : null}
                                  </div>
                                ) : null}

                                {message.toolInvocations
                                  ?.filter(
                                    (tool) =>
                                      tool && appointmentToolNames.has(tool.toolName)
                                  )
                                  .map((tool) => (
                                    <div key={tool.toolCallId} className="mt-2">
                                      <ToolResultCard
                                        tool={tool}
                                        isLoading={isLoading}
                                        onAction={sendAppointmentAction}
                                      />
                                    </div>
                                  ))}

                                {message.content ? (
                                  <div className="mt-1 pl-1">
                                    <CopyButton text={displayContent} />
                                  </div>
                                ) : null}
                              </>
                            ) : (
                              <div className="rounded-2xl rounded-tr-md bg-primary px-3.5 py-3 text-on-primary shadow-[0_12px_28px_-18px_rgba(63,99,80,0.9)] sm:px-4 sm:py-3.5">
                                <p className="whitespace-pre-wrap text-[14.5px] leading-6 sm:text-[15.5px] sm:leading-7">
                                  {message.content}
                                </p>
                              </div>
                            )}
                          </div>

                          {isAssistant ? null : (
                            <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-secondary-container text-secondary sm:h-8 sm:w-8">
                              <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={1.9} aria-hidden />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {isLoading &&
                  (messages.length === 0 ||
                    messages[messages.length - 1]?.role === "user" ||
                    !messages[messages.length - 1]?.content) ? (
                    <div className="mt-5 flex items-start gap-2 sm:mt-6 sm:gap-2.5">
                      <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-container text-primary sm:h-8 sm:w-8">
                        <Leaf className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={1.9} aria-hidden />
                      </span>
                      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-outline-variant/60 bg-surface-container-low px-4 py-3.5 shadow-soft">
                        <span className="sr-only">Mira is typing</span>
                        <span className="h-2 w-2 animate-bounce rounded-full bg-primary/70 [animation-delay:0ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-primary/70 [animation-delay:140ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-primary/70 [animation-delay:280ms]" />
                      </div>
                    </div>
                  ) : null}

                  {error ? (
                    <div
                      role="alert"
                      className="mx-auto mt-6 flex max-w-md flex-col items-center gap-3 rounded-2xl border border-error/25 bg-error-container/55 px-5 py-4 text-center"
                    >
                      <p className="text-[13px] leading-5 text-on-error-container">
                        Chat couldn&apos;t complete your request. Please try again.
                      </p>
                      <button
                        type="button"
                        onClick={() => void reload()}
                        className="rounded-full bg-error px-4 py-1.5 text-[12px] font-semibold text-on-error transition-colors hover:bg-error/90"
                      >
                        Try again
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              {showJump ? (
                <button
                  type="button"
                  onClick={scrollToBottom}
                  className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-lowest/95 px-3.5 py-1.5 text-[11px] font-semibold text-on-surface shadow-soft backdrop-blur transition-colors hover:border-primary/35"
                >
                  <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                  New messages
                </button>
              ) : null}
            </div>

            {/* Composer */}
            <div className="flex-none border-t border-outline-variant/60 bg-surface-container-low/55 px-2.5 pb-2.5 pt-2 md:px-5 md:pb-3">
              <form
                ref={formRef}
                onSubmit={(event) => {
                  setVoiceNotice("");
                  handleSubmit(event);
                }}
                className="mx-auto max-w-3xl"
              >
                <div className="flex items-end gap-1.5 rounded-[1.3rem] border border-outline-variant bg-surface-container-lowest py-1 pl-3.5 pr-1 shadow-soft transition-colors focus-within:border-primary/45 sm:gap-2 sm:rounded-[1.4rem] sm:py-1.5 sm:pl-4">
                  <textarea
                    ref={composerRef}
                    rows={1}
                    aria-label="Message"
                    placeholder="Message Mira…"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.shiftKey &&
                        !event.nativeEvent.isComposing
                      ) {
                        event.preventDefault();
                        if (!isLoading && input.trim()) formRef.current?.requestSubmit();
                      }
                    }}
                    disabled={isLoading}
                    className="max-h-32 min-h-11 flex-1 resize-none bg-transparent py-2.5 text-[15px] leading-6 text-on-surface outline-none placeholder:text-on-surface-variant/60 disabled:opacity-60 sm:min-h-10 sm:text-body-md"
                  />
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <button
                      type="button"
                      aria-label="Use microphone"
                      disabled={isListening || isLoading}
                      onClick={handleVoiceInput}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full transition-colors disabled:opacity-50 sm:h-10 sm:w-10",
                        isListening
                          ? "animate-pulse bg-error-container text-error"
                          : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                      )}
                    >
                      <Mic className="h-[18px] w-[18px]" aria-hidden />
                    </button>

                    {isLoading ? (
                      <button
                        type="button"
                        aria-label="Stop generating"
                        onClick={stop}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-high text-on-surface transition-colors hover:bg-surface-container-highest sm:h-10 sm:w-10"
                      >
                        <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        aria-label="Send message"
                        disabled={!input.trim()}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary shadow-[0_10px_22px_-12px_rgba(63,99,80,0.95)] transition-all hover:bg-primary/92 active:scale-95 disabled:opacity-40 sm:h-10 sm:w-10"
                      >
                        <Send className="h-[17px] w-[17px]" aria-hidden />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-1 flex items-center justify-between gap-3 px-1 sm:mt-1.5">
                  <p className="hidden text-[10.5px] text-on-surface-variant/75 lg:block">
                    Enter to send · Shift + Enter for a new line
                  </p>
                  <p className="ml-auto flex items-center gap-1.5 text-[10px] text-on-surface-variant/70 sm:text-[10.5px]">
                    <ShieldCheck className="h-3 w-3 flex-shrink-0" aria-hidden />
                    For emergencies, call local services.
                  </p>
                </div>

                {voiceNotice ? (
                  <p role="status" className="mt-2 px-1 text-[11px] text-on-surface-variant">
                    {voiceNotice}
                  </p>
                ) : null}
              </form>
            </div>
          </div>
        </section>

        <InfoPanel onAction={applyQuickAction} refreshTrigger={messages.length} />
      </div>
    </div>
  );
}
