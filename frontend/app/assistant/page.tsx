"use client";

import { useState, useRef, useEffect } from "react";
import { queryAssistant, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, User } from "lucide-react";
import toast from "react-hot-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const predefinedQuestions = [
    "Where is ETH00001 seated?",
    "Where is my seat? My email is eth00001@ethara.local",
    "Show available seats on Floor 3",
    "Where is Project Indigo seated?",
    "How many seats does Project Indigo have?",
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async (q: string = query) => {
    if (!q.trim()) return;
    
    const newMessages = [...messages, { role: "user", content: q } as Message];
    setMessages(newMessages);
    setQuery("");
    setLoading(true);

    try {
      const res = await queryAssistant({ query: q, email: email || undefined });
      setMessages([...newMessages, { role: "assistant", content: res.answer }]);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
      setMessages(newMessages);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-4 md:inset-8 bottom-24 md:bottom-8 flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
      <div className="bg-ethara-slate text-white p-4 flex items-center gap-3 shrink-0 z-10 shadow-sm">
        <div className="bg-white/20 p-2 rounded-lg">
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold leading-tight">Ethara Assistant</h1>
          <p className="text-xs text-gray-300">Powered by AI</p>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6 scrollbar-thin bg-ethara-bg/50"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
            <div className="bg-gray-100 p-4 rounded-full">
              <Bot className="w-12 h-12 text-gray-300" />
            </div>
            <p className="text-center max-w-sm font-medium">Ask me anything about seating, projects, or employees!</p>
            <div className="flex flex-col gap-2 w-full max-w-xs mt-4">
              {predefinedQuestions.map(q => (
                <button 
                  key={q} 
                  onClick={() => handleSend(q)}
                  className="text-sm bg-white border border-gray-200 hover:border-ethara-green hover:text-ethara-green text-ethara-slate px-4 py-3 rounded-xl transition-all shadow-sm text-left font-medium"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 max-w-[85%] md:max-w-[75%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
            <div className="shrink-0 mt-1">
              {msg.role === "user" ? (
                <div className="w-8 h-8 rounded-full bg-ethara-green flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-ethara-slate flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            
            <div className={`p-4 text-sm shadow-sm leading-relaxed ${
              msg.role === "user" 
                ? "bg-ethara-green text-white rounded-2xl rounded-tr-sm" 
                : "bg-white text-ethara-slate border border-gray-100 rounded-2xl rounded-tl-sm"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 max-w-[85%] md:max-w-[75%] mr-auto">
             <div className="shrink-0 mt-1">
                <div className="w-8 h-8 rounded-full bg-ethara-slate flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
            </div>
            <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-sm flex gap-1.5 items-center shadow-sm h-12">
              <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border-t border-gray-100 p-4 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] z-10">
        <div className="flex flex-col md:flex-row gap-2">
          <Input 
            placeholder="Your email (optional)..." 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full md:w-72 bg-gray-50 border-gray-200"
          />
          <Input 
            placeholder="Ask about seats, projects, teams, or utilization..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 bg-gray-50 border-gray-200"
          />
          <Button 
            onClick={() => handleSend()} 
            disabled={loading || !query.trim()} 
            className="bg-ethara-green hover:bg-ethara-green/90 text-white rounded-xl px-6"
          >
            <Send className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Send</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
