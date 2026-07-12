import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Cake, Clock, MapPin, CreditCard, Phone, ChevronRight, Leaf } from 'lucide-react';

const BASE = '/api/public';

function generateSessionId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Persist session ID in sessionStorage so history survives page refresh
function getOrCreateSession(bakerId) {
  const key = `menu_session_${bakerId}`;
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = generateSessionId();
    sessionStorage.setItem(key, id);
  }
  return id;
}

export default function MenuPage() {
  const { userId: bakerId } = useParams();
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    fetch(`${BASE}/menu/${bakerId}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then(data => { if (data) { setMenu(data); setLoading(false); } })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [bakerId]);

  const openChatWithItem = (item) => {
    setSelectedItem(item);
    setChatOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Cake className="w-12 h-12 text-purple-300 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-800 mb-1">Menu not found</h2>
          <p className="text-sm text-gray-500">This bakery link may have expired or doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-violet-50">
      {/* Header */}
      <div className="bg-white border-b border-purple-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-md">
            <Cake className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 text-lg leading-tight truncate">{menu.businessName}</h1>
            <p className="text-xs text-gray-500">by {menu.bakerName}</p>
          </div>
          {menu.whatsappNumber && (
            <a href={`https://wa.me/${menu.whatsappNumber.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 bg-green-500 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-sm">
              <Phone className="w-3.5 h-3.5" />
              WhatsApp
            </a>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
        {/* Info chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {menu.businessHours && (
            <div className="flex items-center gap-1.5 bg-white border border-purple-100 rounded-full px-3 py-1.5 text-xs text-gray-600 shadow-sm">
              <Clock className="w-3 h-3 text-purple-400" />
              {menu.businessHours}
            </div>
          )}
          {menu.deliveryArea && (
            <div className="flex items-center gap-1.5 bg-white border border-purple-100 rounded-full px-3 py-1.5 text-xs text-gray-600 shadow-sm">
              <MapPin className="w-3 h-3 text-purple-400" />
              {menu.deliveryArea}
            </div>
          )}
          {menu.paymentMethods && (
            <div className="flex items-center gap-1.5 bg-white border border-purple-100 rounded-full px-3 py-1.5 text-xs text-gray-600 shadow-sm">
              <CreditCard className="w-3 h-3 text-purple-400" />
              {menu.paymentMethods}
            </div>
          )}
          {menu.deliveryFee && (
            <div className="flex items-center gap-1.5 bg-white border border-purple-100 rounded-full px-3 py-1.5 text-xs text-gray-600 shadow-sm">
              🛵 Delivery: {menu.deliveryFee}
            </div>
          )}
          {menu.minimumOrder && (
            <div className="flex items-center gap-1.5 bg-white border border-purple-100 rounded-full px-3 py-1.5 text-xs text-gray-600 shadow-sm">
              🛒 Min: {menu.minimumOrder}
            </div>
          )}
        </div>

        {/* Menu section header */}
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-bold text-gray-900 text-xl">Our Menu</h2>
          <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full">
            {menu.menu.length} items
          </span>
        </div>

        {/* Menu items */}
        {menu.menu.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Cake className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Menu coming soon</p>
          </div>
        ) : (
          <div className="space-y-3">
            {menu.menu.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-white rounded-2xl p-4 border border-purple-50 shadow-sm hover:shadow-md hover:border-purple-200 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      {item.eggless && (
                        <span className="flex items-center gap-0.5 text-[10px] font-medium text-green-700 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-full">
                          <Leaf className="w-2.5 h-2.5" /> Eggless
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-3">
                      <span className="text-base font-bold text-purple-700">PKR {item.price}</span>
                      <span className="text-xs text-gray-400">{item.unit || 'per piece'}</span>
                    </div>
                  </div>
                  <button onClick={() => openChatWithItem(item)}
                    className="flex-shrink-0 flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors shadow-sm">
                    Inquire
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-8 bg-gradient-to-r from-purple-600 to-violet-600 rounded-2xl p-5 text-white text-center shadow-lg">
          <p className="font-semibold mb-1">Want to place an order? 🎂</p>
          <p className="text-sm text-purple-100 mb-3">Chat with our AI assistant — it takes your order and saves it directly to our system.</p>
          <button onClick={() => setChatOpen(true)}
            className="bg-white text-purple-700 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-purple-50 transition-colors shadow-sm">
            Start a conversation
          </button>
        </div>
      </div>

      {/* Floating chat button */}
      <AnimatePresence>
        {!chatOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            onClick={() => setChatOpen(true)}
            className="fixed bottom-6 right-4 w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-xl flex items-center justify-center z-40 transition-colors">
            <MessageCircle className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {chatOpen && (
          <ChatPanel bakerId={bakerId} menu={menu} initialItem={selectedItem}
            onClose={() => { setChatOpen(false); setSelectedItem(null); }} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Chat panel ────────────────────────────────────────────────────────────────
function ChatPanel({ bakerId, menu, initialItem, onClose }) {
  const sessionId = getOrCreateSession(bakerId);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(null);
  const bottomRef = useRef(null);

  // Greet or pre-fill with selected item
  useEffect(() => {
    if (initialItem) {
      setInput(`I'm interested in ${initialItem.name} (PKR ${initialItem.price} ${initialItem.unit || 'per piece'}). Can you tell me more?`);
    } else {
      setMessages([{
        role: 'assistant',
        content: `Salam! 👋 Welcome to ${menu.businessName}. I'm here to help you browse our menu, answer questions, or place an order. What can I help you with today?`,
      }]);
    }
  }, [initialItem, menu.businessName]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg || streaming) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setStreaming(true);
    let assistantText = '';
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch(`${BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bakerId, sessionId, message: userMsg }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                assistantText += data.content;
                setMessages(prev => {
                  const msgs = [...prev];
                  msgs[msgs.length - 1] = { role: 'assistant', content: assistantText };
                  return msgs;
                });
              }
              if (data.done && data.order) setOrderPlaced(data.order);
            } catch { /* skip */ }
          }
        }
      }
    } catch { /* ignore */ }
    setStreaming(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // Strip ORDER_JSON lines from visible text
  const cleanText = (text) => text.replace(/ORDER_JSON:\{.+\}/g, '').trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-white rounded-t-3xl shadow-2xl border-t border-purple-100"
      style={{ maxHeight: '85dvh' }}>
      {/* Chat header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-purple-50">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
          <MessageCircle className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 text-sm">{menu.businessName}</p>
          <p className="text-[11px] text-gray-400">AI assistant · replies instantly</p>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ minHeight: 0 }}>
        {messages.map((msg, i) => {
          const display = cleanText(msg.content);
          if (!display && msg.role === 'assistant' && i === messages.length - 1 && streaming) {
            return (
              <div key={i} className="flex gap-2">
                <div className="w-7 h-7 flex-shrink-0 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                  <MessageCircle className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-purple-50 rounded-2xl rounded-tl-sm px-3 py-2.5">
                  <div className="flex gap-1 items-center h-5">
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '120ms' }} />
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '240ms' }} />
                  </div>
                </div>
              </div>
            );
          }
          if (!display) return null;
          return (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 flex-shrink-0 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                  <MessageCircle className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div className={`max-w-[82%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-purple-600 text-white rounded-tr-sm'
                  : 'bg-purple-50 text-gray-800 rounded-tl-sm'
              }`}>
                {display}
              </div>
            </div>
          );
        })}

        {/* Order placed confirmation */}
        {orderPlaced && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-green-50 border border-green-200 rounded-2xl p-3 text-center">
            <p className="text-green-700 font-semibold text-sm">🎉 Order received!</p>
            <p className="text-xs text-green-600 mt-0.5">{menu.bakerName} will confirm shortly. Check your WhatsApp!</p>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-none">
          {['What cakes do you have?', 'What are your prices?', 'Do you deliver?', 'How do I order?'].map(q => (
            <button key={q} onClick={() => send(q)}
              className="flex-shrink-0 bg-purple-50 text-purple-700 text-xs font-medium px-3 py-2 rounded-full border border-purple-100 hover:bg-purple-100 transition-colors">
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-3 pb-4 pt-2 border-t border-purple-50">
        <div className="flex gap-2 bg-gray-50 rounded-2xl border border-gray-200 px-3 py-2 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about our menu or place an order…"
            rows={1}
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none resize-none leading-relaxed"
            style={{ maxHeight: 80 }}
          />
          <button onClick={() => send()} disabled={!input.trim() || streaming}
            className="w-8 h-8 flex-shrink-0 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[10px] text-center text-gray-400 mt-1.5">Powered by Sweet Tooth AI</p>
      </div>
    </motion.div>
  );
}
