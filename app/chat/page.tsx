'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME: Message = {
  role: 'assistant',
  content: 'שלום! אני כאן לעדכן את תיק ההשקעות שלך.\n\nאתה יכול לספר לי על:\n• קנייה או מכירה של מניות, מדדים, או קריפטו\n• הפקדה או משיכה מנכס\n• דוח רבעוני של קרן ההשתלמות — פשוט הדבק את הנתונים',
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    const history = [...messages.filter(m => m !== WELCOME), userMsg];
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      const reply = data.reply ?? data.error ?? 'שגיאה לא ידועה';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'שגיאה בחיבור לשרת, נסה שוב.' }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">עדכון תיק</h1>
        <button
          onClick={() => setMessages([WELCOME])}
          className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full"
        >
          נקה שיחה
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-2">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-end">
            <div className="bg-white shadow-sm px-4 py-3 rounded-2xl rounded-bl-sm">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-3 flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="כתוב כאן... (Enter לשליחה, Shift+Enter לשורה חדשה)"
          disabled={loading}
          className="flex-1 border border-gray-200 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50 max-h-32 overflow-y-auto"
          style={{ direction: 'rtl' }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="bg-indigo-600 text-white p-3 rounded-2xl disabled:opacity-40 flex-shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
