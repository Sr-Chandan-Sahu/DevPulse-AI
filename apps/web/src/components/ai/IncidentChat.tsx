import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, User as UserIcon, RefreshCw, HelpCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface IncidentChatProps {
  projectId: string;
}

const DEFAULT_SUGGESTIONS = [
  'Why did latency spike on checkout in the last hour?',
  'What caused the 500 errors during the last 30 minutes?',
  'Which database query is consuming the most execution time?',
  'Summarize overall platform health and active anomalies.',
];

export function IncidentChat({ projectId }: IncidentChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I am your **DevPulse AI Incident Assistant** powered by Google Gemini. I am continuously grounded in your project's live telemetry, distributed traces, database query latencies, and error rates.\n\nHow can I help you troubleshoot your system today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (questionText?: string) => {
    const query = (questionText || input).trim();
    if (!query || isLoading) return;

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const historyPayload = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await api.post<any>(`/api/v1/projects/${projectId}/ai/chat`, {
        question: query,
        conversation_history: historyPayload,
        time_window_minutes: 60,
      });

      const assistantMsg: Message = {
        id: `ast_${Date.now()}`,
        role: 'assistant',
        content: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (res.suggested_followups && res.suggested_followups.length > 0) {
        setSuggestions(res.suggested_followups);
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an issue analyzing telemetry: ${err.message || 'Unknown error'}. Please verify backend connection.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[700px] bg-[#111827] border border-[#1F2B3F] rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-[#151D2F] border-b border-[#1F2B3F] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">DevPulse AI Incident Assistant</h3>
            <p className="text-xs text-slate-400">Grounded with real-time telemetry from Google Gemini</p>
          </div>
        </div>

        <button
          onClick={() => {
            setMessages([
              {
                id: 'welcome',
                role: 'assistant',
                content: `Chat session reset. Ask me anything about your API latency, errors, or query bottlenecks.`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ]);
            setSuggestions(DEFAULT_SUGGESTIONS);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-[#0E1524] border border-[#1F2B3F] rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Clear Chat</span>
        </button>
      </div>

      {/* Messages Feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((m) => {
          const isAssistant = m.role === 'assistant';
          return (
            <div
              key={m.id}
              className={cn(
                'flex gap-3 max-w-3xl',
                isAssistant ? 'mr-auto' : 'ml-auto flex-row-reverse'
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border text-xs',
                  isAssistant
                    ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30'
                    : 'bg-brand-600 text-white border-brand-500'
                )}
              >
                {isAssistant ? <Bot className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
              </div>

              <div
                className={cn(
                  'p-4 rounded-2xl text-xs leading-relaxed',
                  isAssistant
                    ? 'bg-[#151D2F] border border-[#1F2B3F] text-slate-200'
                    : 'bg-brand-600 text-white rounded-tr-none shadow-md'
                )}
              >
                <div className="whitespace-pre-wrap font-sans">{m.content}</div>
                <div
                  className={cn(
                    'mt-2 text-[10px] text-right',
                    isAssistant ? 'text-slate-500' : 'text-brand-200'
                  )}
                >
                  {m.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 max-w-xl mr-auto">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-4 rounded-2xl bg-[#151D2F] border border-[#1F2B3F] text-xs text-slate-400 flex items-center gap-2">
              <span>Investigating recent telemetry with Gemini...</span>
            </div>
          </div>
        )}
      </div>

      {/* Prompt Suggestions */}
      {suggestions.length > 0 && (
        <div className="px-6 py-2 bg-[#0E1524] border-t border-[#1F2B3F] flex items-center gap-2 overflow-x-auto">
          <HelpCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="text-[11px] text-slate-500 shrink-0 font-medium">Suggestions:</span>
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(s)}
              className="text-[11px] px-2.5 py-1 rounded-md bg-[#151D2F] border border-[#1F2B3F] text-slate-300 hover:text-white hover:border-brand-500 whitespace-nowrap transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <div className="p-4 bg-[#151D2F] border-t border-[#1F2B3F]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about latency bottlenecks, error waves, or database queries..."
            className="flex-1 bg-[#0E1524] border border-[#1F2B3F] rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-brand-600/20 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Ask AI</span>
          </button>
        </form>
      </div>
    </div>
  );
}
