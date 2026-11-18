"use client";

import { useChat, type Message } from "ai/react";
import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { InfoPanel } from "@/components/dashboard/InfoPanel";
import { createClient } from "@/utils/supabase/client";
import { extractCitationIds } from "@/lib/citation-markers";
import Loading from "./loading";

const legacyChatKey = "careflow_chat_messages";
const maxStoredMessages = 20;
const appointmentTools = new Set([
  "checkAvailability", "bookAppointment", "getAppointments", "rescheduleAppointment", "cancelAppointment",
]);

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

type AvailabilitySlot = { slotId: string; doctor: string; time: string; specialty: string };
type UpcomingAppointment = { id: string; date: string; time: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readCachedMessages(storageKey: string): Message[] {
  try {
    const saved = localStorage.getItem(storageKey);
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((message: unknown): message is Message =>
      isRecord(message) &&
      typeof message.id === "string" &&
      typeof message.content === "string" &&
      (message.role === "user" || message.role === "assistant") &&
      (message.toolInvocations === undefined || Array.isArray(message.toolInvocations))
    ).slice(-maxStoredMessages);
  } catch {
    return [];
  }
}

function MessageSources({ message }: { message: Message }) {
  if (message.role !== "assistant" || !Array.isArray(message.annotations)) return null;

  const references = extractCitationIds(message.content);
  if (references.size === 0) return null;

  const sources = new Map<string, { title: string; href: string; internal: boolean }>();
  for (const annotation of message.annotations) {
    if (!isRecord(annotation) || annotation.type !== "clinic-sources" || !Array.isArray(annotation.sources)) continue;

    for (const source of annotation.sources) {
      if (!isRecord(source) || typeof source.id !== "string" || !references.has(source.id) ||
          typeof source.title !== "string" || !source.title.trim() || typeof source.url !== "string" ||
          sources.has(source.id)) continue;

      const internalHref = /^\/knowledge\/(demo-[a-z0-9]+(?:-[a-z0-9]+)*)$/.test(source.url);
      if (internalHref) {
        sources.set(source.id, { title: source.title.trim(), href: source.url, internal: true });
        continue;
      }

      try {
        const url = new URL(source.url);
        if (url.protocol === "https:" && !url.username && !url.password) {
          sources.set(source.id, { title: source.title.trim(), href: url.href, internal: false });
        }
      } catch {
        // Skip malformed source URLs.
      }
    }
  }

  if (sources.size === 0) return null;

  return (
    <section aria-label="Sources" className="mt-3 border-t border-outline-variant/40 pt-3 text-sm">
      <p className="font-medium text-on-surface">Sources</p>
      <ul className="mt-1 space-y-1">
        {Array.from(sources, ([id, source]) => (
          <li key={id}>
            <a href={source.href} target={source.internal ? undefined : "_blank"} rel={source.internal ? undefined : "noreferrer"} className="text-primary underline underline-offset-2">
              [{id}] {source.title}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user.id ?? null;
      if (sessionUserId === nextUserId) return;
      sessionUserId = nextUserId;

      clearTimeout(verification);
      const version = ++authVersion;
      setSession(nextUserId ? undefined : null);
      if (!nextUserId) return;

      // Verify the identity outside the auth callback, which can hold an auth lock.
      verification = setTimeout(async () => {
        const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
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

  if (session === undefined) return <Loading />;
  if (!session) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6">
        <Link href="/login" className="text-primary underline underline-offset-2">Sign in to CareFlow</Link>
      </main>
    );
  }

  return <Receptionist key={session.userId} session={session} />;
}

function Receptionist({ session }: { session: ChatSession }) {
  const { messages, input, setInput, handleInputChange, handleSubmit, append, isLoading, error, stop } = useChat({
    api: "/api/chat",
    initialMessages: session.initialMessages,
    experimental_prepareRequestBody: ({ messages }) => ({
      expectedUserId: session.userId,
      messages: messages.slice(-maxStoredMessages).map(({ role, content }) => ({ role, content })),
    }),
    fetch: (input, init) => {
      if (!session.isCurrent()) return Promise.reject(new DOMException("Chat session changed.", "AbortError"));
      return fetch(input, init);
    },
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const stopRef = useRef(stop);

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

  useEffect(() => () => {
    stopRef.current();
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

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
      alert("Your browser doesn't support voice input.");
      return;
    }

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

  return (
    <div className="bg-background md:overflow-hidden font-body-md">
      <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Canvas */}
      <main className={`${isSidebarOpen ? 'md:pl-72' : ''} pt-16 pb-20 md:pb-0 h-auto md:h-screen flex flex-col md:flex-row transition-all duration-300 ease-in-out`}>
        
        {/* Left: Digital Receptionist Center Stage */}
        <div className="w-full h-[calc(100dvh-144px)] md:h-auto md:flex-1 flex flex-col p-margin-mobile md:p-margin-desktop overflow-hidden">
          


          {/* Chat Interface */}
          <div className="flex-1 flex flex-col bg-surface-container-lowest card-shadow rounded-[2rem] overflow-hidden relative">
            
            {/* Chat Header */}
            <div className="px-8 py-6 flex items-center justify-between border-b border-outline-variant/20 bg-surface/50 glass-effect">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/20">
                  <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                </div>
                <div>
                  <h1 className="font-headline-md text-headline-md text-on-surface">Digital Receptionist</h1>
                  <p className="text-label-sm font-label-sm text-primary flex items-center gap-1">
                    <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                    AI Assistant Online
                  </p>
                </div>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]">
              
              {messages.length === 0 && (
                <>
                  {/* Default Receptionist Message */}
                  <div className="flex items-start gap-4 max-w-2xl">
                    <div className="w-10 h-10 bg-surface-container-high rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-primary">support_agent</span>
                    </div>
                    <div className="bg-surface-container-low p-5 rounded-2xl rounded-tl-none shadow-sm">
                      <p className="font-body-md text-body-md text-on-surface leading-relaxed">
                        Good morning! How can I assist with your healthcare needs today? 
                        <br/><br/>
                        I can help you manage appointments and answer questions about the clinic.
                      </p>
                    </div>
                  </div>

                  {/* Suggested Replies */}
                  <div className="flex flex-wrap gap-3 ml-14">
                    <button onClick={() => setInput('Schedule physical exam')} className="px-4 py-2 border border-primary text-primary rounded-full font-label-md text-label-md hover:bg-primary hover:text-white transition-colors">Schedule physical exam</button>
                    <button onClick={() => setInput('What should I bring to my appointment?')} className="px-4 py-2 border border-primary text-primary rounded-full font-label-md text-label-md hover:bg-primary hover:text-white transition-colors">What should I bring?</button>
                    <button onClick={() => setInput('What are your clinic hours?')} className="px-4 py-2 border border-primary text-primary rounded-full font-label-md text-label-md hover:bg-primary hover:text-white transition-colors">Clinic hours</button>
                  </div>
                </>
              )}

              {/* Dynamic Messages */}
              {messages.map((message: Message) => (
                <div key={message.id} className={`flex gap-4 max-w-2xl ${message.role === 'user' ? 'ml-auto flex-row-reverse' : 'items-start'}`}>
                  <div className={`w-10 h-10 rounded-full flex flex-shrink-0 items-center justify-center ${
                    message.role === 'user' 
                      ? 'bg-primary-container text-on-primary' 
                      : 'bg-surface-container-high'
                  }`}>
                    <span className="material-symbols-outlined text-primary">
                      {message.role === 'user' ? 'person' : 'support_agent'}
                    </span>
                  </div>
                  
                  <div className={`p-5 rounded-2xl shadow-sm leading-relaxed text-[16px] ${
                    message.role === 'user' 
                      ? 'bg-primary text-on-primary rounded-tr-none' 
                      : 'bg-surface-container-low text-on-surface rounded-tl-none'
                  }`}>
                    {message.content && <div className="whitespace-pre-wrap">{message.content}</div>}
                    <MessageSources message={message} />
                    
                    {message.toolInvocations?.filter(tool => tool && appointmentTools.has(tool.toolName)).map(tool => (
                      <div key={tool.toolCallId} className="mt-3">
                        {tool.state !== 'result' ? (
                          <span className="italic text-on-surface-variant flex items-center gap-2">
                            <span className="material-symbols-outlined animate-spin text-[16px]">sync</span> 
                            {tool.toolName === 'checkAvailability' ? 'Checking schedule...' : 'Processing request...'}
                          </span>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {/* Book Appointment Result UI */}
                            {tool.toolName === 'bookAppointment' && tool.result?.success && (
                              <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex items-start gap-3">
                                <span className="material-symbols-outlined text-primary text-[28px]">check_circle</span>
                                <div>
                                  <p className="font-bold text-on-surface">Appointment Confirmed</p>
                                  <p className="text-sm text-on-surface-variant mt-1">ID: <span className="font-mono text-primary bg-primary/10 px-1 py-0.5 rounded">{tool.result.appointmentId}</span></p>
                                  <p className="text-sm text-on-surface-variant mt-1">{tool.result.message}</p>
                                </div>
                              </div>
                            )}

                            {/* Check Availability Result UI */}
                            {tool.toolName === 'checkAvailability' && (
                               <div className="bg-surface p-4 rounded-xl border border-outline-variant/30">
                                 <p className="font-bold text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-tertiary">calendar_today</span> Available Slots</p>
                                 <div className="flex flex-wrap gap-2 mt-3">
                                    {tool.result?.availableSlots?.map((slot: AvailabilitySlot) => (
                                      <button key={slot.slotId} type="button" disabled={isLoading} onClick={() => sendAppointmentAction(`Book slot ${slot.slotId} with ${slot.doctor} at ${slot.time}`)} className="px-3 py-1.5 bg-surface-container-low hover:bg-primary hover:text-white text-on-surface rounded-lg text-sm border border-outline-variant/20 transition-all active:scale-95 text-left flex flex-col items-start gap-0.5 disabled:opacity-50">
                                        <span className="font-semibold">{slot.time}</span>
                                        <span className="text-xs opacity-90">{slot.doctor}</span>
                                        <span className="text-[10px] opacity-75 uppercase tracking-wider">{slot.specialty}</span>
                                      </button>
                                    ))}
                                   {tool.result?.availableSlots?.length === 0 && <span className="text-sm text-error">No slots available for this date.</span>}
                                 </div>
                               </div>
                            )}

                            {/* Get Appointments Result UI */}
                            {tool.toolName === 'getAppointments' && tool.result?.success && (
                              <div className="bg-surface p-4 rounded-xl border border-outline-variant/30">
                                 <p className="font-bold text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-primary">list_alt</span> Your Appointments</p>
                                 <div className="flex flex-col gap-2 mt-3">
                                   {tool.result.appointments?.length > 0 ? tool.result.appointments.map((appt: UpcomingAppointment) => (
                                     <div key={appt.id} className="p-3 bg-surface-container-lowest rounded-lg border border-outline-variant/20 flex justify-between items-center">
                                       <div>
                                         <p className="font-medium text-sm">{appt.date} at {appt.time}</p>
                                         <p className="text-xs text-on-surface-variant">ID: <span className="font-mono">{appt.id.split('-')[0]}</span></p>
                                       </div>
                                       <button type="button" disabled={isLoading} onClick={() => sendAppointmentAction(`Cancel appointment ${appt.id}`)} className="text-error text-xs hover:underline disabled:opacity-50">Cancel</button>
                                     </div>
                                   )) : (
                                     <p className="text-sm text-on-surface-variant">No upcoming appointments found.</p>
                                   )}
                                 </div>
                              </div>
                            )}

                            {/* Reschedule/Cancel UI */}
                            {(tool.toolName === 'rescheduleAppointment' || tool.toolName === 'cancelAppointment') && tool.result?.success && (
                              <div className="bg-secondary-container/20 border border-secondary/30 p-3 rounded-xl flex items-center gap-3">
                                <span className="material-symbols-outlined text-secondary">update</span>
                                <span className="text-sm font-medium text-on-surface">{tool.result.message}</span>
                              </div>
                            )}

                            {/* Error State */}
                            {tool.result && tool.result.success === false && (
                              <div className="bg-error/10 border border-error/30 p-3 rounded-xl flex items-center gap-3">
                                <span className="material-symbols-outlined text-error">error</span>
                                <span className="text-sm font-medium text-error">{tool.result.message}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start gap-4 max-w-2xl">
                  <div className="w-10 h-10 bg-surface-container-high rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-primary">support_agent</span>
                  </div>
                  <div className="bg-surface-container-low p-5 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="bg-error/10 border border-error/30 p-4 rounded-xl flex items-center gap-3 max-w-2xl mx-auto my-4 text-error">
                  <span className="material-symbols-outlined">error</span>
                  <span>Chat couldn&apos;t complete your request. Please try again.</span>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Area */}
            <div className="p-6 bg-surface-container-low border-t border-outline-variant/20">
              <form onSubmit={handleSubmit} className="relative flex items-center focus-within:scale-[1.01] transition-transform">
                <input 
                  className="w-full bg-surface-container-lowest border-none rounded-2xl py-4 pl-6 pr-24 font-body-md text-body-md card-shadow focus:ring-2 focus:ring-primary focus:outline-none transition-all" 
                  placeholder="Type your request here..." 
                  aria-label="Message"
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
                <div className="absolute right-3 flex items-center gap-2">
                  <button type="button" aria-label="Use microphone" disabled={isListening || isLoading} onClick={handleVoiceInput} className={`material-symbols-outlined p-2 rounded-lg transition-colors ${isListening ? 'text-error bg-error/10 animate-pulse' : 'text-outline hover:bg-surface-container-high'}`}>mic</button>
                  <button 
                    type="submit" 
                    aria-label="Send message"
                    disabled={isLoading || !input.trim()}
                    className="bg-primary text-on-primary p-2 rounded-xl shadow-md active:scale-95 transition-transform disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined">send</span>
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>

        <InfoPanel onAction={setInput} refreshTrigger={messages.length} />
      </main>

      {/* Bottom Navigation Bar (Mobile) */}
      <footer className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-20 px-4 bg-surface shadow-[0_-4px_20px_rgba(0,0,0,0.04)] md:hidden">
        <Link href="/" className="flex flex-col items-center justify-center text-primary font-bold active:scale-95 transition-all">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
          <span className="font-label-sm text-label-sm">Home</span>
        </Link>
        <Link href="/appointments" className="flex flex-col items-center justify-center text-secondary active:scale-95 transition-all">
          <span className="material-symbols-outlined">calendar_today</span>
          <span className="font-label-sm text-label-sm">Schedule</span>
        </Link>
      </footer>
    </div>
  );
}
