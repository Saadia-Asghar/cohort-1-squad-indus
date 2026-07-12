import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, X, MessageCircle, Check, Sparkles, ShoppingBag } from 'lucide-react';
import { AgentApi } from '@/api/agentApi';

function generateSessionId() {
  return 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function AgentChat({ onOrderCreated }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Assalam-o-Alaikum! 🎂 I'm Sweet Tooth's assistant. Ask me about our menu, prices, delivery — or I can take your order!" }
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [sessionId] = useState(generateSessionId);
  const [newOrder, setNewOrder] = useState(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const send = async () => {
    const text = input.trim();
    if (!text || typing) return;
    setInput('');

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setTyping(true);

    // Streaming assistant message — history is now read from DB server-side
    let assistantText = '';
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);

    try {
      const result = await AgentApi.chat({
        sessionId,
        message: text,
        onChunk: (chunk) => {
          assistantText += chunk;
          // Strip ORDER_JSON line from displayed text
          const displayText = assistantText.replace(/ORDER_JSON:\{.+\}/, '').trim();
          setMessages(prev => {
            const next = [...prev];
            next[next.length - 1] = { role: 'assistant', content: displayText, streaming: true };
            return next;
          });
        },
      });

      // Finalize message
      const finalText = assistantText.replace(/ORDER_JSON:\{.+\}/, '').trim();
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', content: finalText };
        return next;
      });

      if (result?.order) {
        setNewOrder(result.order);
        onOrderCreated?.(result.order);
        setTimeout(() => setNewOrder(null), 6000);
      }
    } catch (e) {
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', content: 'Sorry, I ran into an issue. Please try again.' };
        return next;
      });
    }
    setTyping(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lift flex items-center justify-center lg:bottom-8 lg:right-8"
          >
            <Bot className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-success border-2 border-card" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-5 z-50 w-[calc(100vw-40px)] max-w-sm lg:bottom-8 lg:right-8 bg-card rounded-3xl shadow-2xl border border-border/50 flex flex-col overflow-hidden"
            style={{ height: '520px' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/50 bg-primary text-primary-foreground">
              <div className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold text-sm">Sweet Tooth Agent</p>
                <p className="text-[11px] opacity-80 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" /> Online
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-muted text-foreground rounded-tl-sm'
                  }`}>
                    {msg.content || (msg.streaming && (
                      <span className="flex gap-1 items-center h-4">
                        <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }} className="w-1.5 h-1.5 rounded-full bg-current" />
                        <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-current" />
                        <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-current" />
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}

              {/* Order created notification */}
              <AnimatePresence>
                {newOrder && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="bg-success/10 border border-success/30 rounded-xl p-3 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-success flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 text-success-foreground" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-success">Order Created!</p>
                      <p className="text-[11px] text-muted-foreground">{newOrder.customer_name || newOrder.customerName} — {newOrder.cake_type || newOrder.cakeType}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border/50">
              <div className="flex items-center gap-2 bg-input rounded-2xl px-4 py-2.5">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask about our menu or place an order..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                  disabled={typing}
                />
                <motion.button whileTap={{ scale: 0.9 }} onClick={send} disabled={!input.trim() || typing}
                  className="w-8 h-8 rounded-full bg-primary flex items-center justify-center disabled:opacity-40 flex-shrink-0">
                  <Send className="w-3.5 h-3.5 text-primary-foreground" />
                </motion.button>
              </div>
              <p className="text-[10px] text-center text-muted-foreground/50 mt-1.5">Powered by Sweet Tooth AI</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
