import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Cake, Clock, MapPin, CreditCard, Phone, Leaf, ShoppingBag, Star, ChevronDown } from 'lucide-react';

const BASE = '/api/public';

function generateSessionId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getOrCreateSession(bakerId) {
  const key = `menu_session_${bakerId}`;
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = generateSessionId();
    sessionStorage.setItem(key, id);
  }
  return id;
}

// Warm palette cycling for menu cards
const CARD_PALETTES = [
  { bg: 'bg-rose-50', border: 'border-rose-200', price: 'text-rose-700', badge: 'bg-rose-100 text-rose-700', dot: 'bg-rose-400' },
  { bg: 'bg-amber-50', border: 'border-amber-200', price: 'text-amber-700', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
  { bg: 'bg-orange-50', border: 'border-orange-200', price: 'text-orange-700', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
  { bg: 'bg-pink-50', border: 'border-pink-200', price: 'text-pink-700', badge: 'bg-pink-100 text-pink-700', dot: 'bg-pink-400' },
  { bg: 'bg-violet-50', border: 'border-violet-200', price: 'text-violet-700', badge: 'bg-violet-100 text-violet-700', dot: 'bg-violet-400' },
];

// Taglines per item type (keyword matching)
function getTagline(name = '', desc = '') {
  const n = name.toLowerCase();
  const d = desc.toLowerCase();
  if (n.includes('chocolate') || d.includes('chocolate')) return 'Rich & indulgent 🍫';
  if (n.includes('red velvet')) return 'Velvety smooth with cream cheese 🍰';
  if (n.includes('cupcake')) return 'Perfect for every celebration 🧁';
  if (n.includes('cookie') || n.includes('biscuit')) return 'Baked fresh, never frozen 🍪';
  if (n.includes('brownie')) return 'Fudgy, gooey perfection 🍫';
  if (n.includes('cheesecake')) return 'Creamy New York-style 🍮';
  if (n.includes('muffin')) return 'Soft, fluffy & freshly baked 🫐';
  if (n.includes('cake') || n.includes('tier')) return 'Made to order with love 🎂';
  if (n.includes('truffle') || n.includes('bonbon')) return 'Handcrafted, one by one 🍬';
  if (n.includes('macaron')) return 'Delicate & colourful 🌸';
  if (n.includes('bread') || n.includes('loaf')) return 'Baked every morning 🍞';
  if (n.includes('tart') || n.includes('pie')) return 'Buttery crust, fresh filling 🥧';
  return 'A Sweet Tooth favourite ✨';
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
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-rose-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🎂</div>
          <p className="text-sm text-amber-700 font-medium">Loading menu…</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-rose-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-5xl mb-4">🍰</div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Hmm, nothing here yet</h2>
          <p className="text-sm text-gray-500">This bakery link may have expired or doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #fff7ed 0%, #fdf2f8 50%, #faf5ff 100%)' }}>

      {/* Hero header */}
      <div className="relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-rose-200/30 pointer-events-none" />
        <div className="absolute -top-8 -left-8 w-40 h-40 rounded-full bg-amber-200/40 pointer-events-none" />

        <div className="relative max-w-2xl mx-auto px-4 pt-10 pb-8 text-center">
          {/* Logo circle */}
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }}
            className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center shadow-xl mx-auto mb-4">
            <Cake className="w-10 h-10 text-white" />
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-3xl font-extrabold text-gray-900 mb-1">
            {menu.businessName}
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="text-sm text-gray-500 mb-1">
            by <span className="font-semibold text-rose-600">{menu.bakerName}</span>
          </motion.p>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-base italic text-amber-700 font-medium mb-5">
            "Baked with love, delivered with care 🍰"
          </motion.p>

          {/* Info row */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
            className="flex flex-wrap justify-center gap-2 mb-5">
            {menu.businessHours && (
              <span className="flex items-center gap-1 bg-white/80 border border-amber-200 text-amber-800 text-xs font-medium px-3 py-1.5 rounded-full shadow-sm">
                <Clock className="w-3 h-3" /> {menu.businessHours}
              </span>
            )}
            {menu.deliveryArea && (
              <span className="flex items-center gap-1 bg-white/80 border border-rose-200 text-rose-800 text-xs font-medium px-3 py-1.5 rounded-full shadow-sm">
                <MapPin className="w-3 h-3" /> {menu.deliveryArea}
              </span>
            )}
            {menu.paymentMethods && (
              <span className="flex items-center gap-1 bg-white/80 border border-purple-200 text-purple-800 text-xs font-medium px-3 py-1.5 rounded-full shadow-sm">
                <CreditCard className="w-3 h-3" /> {menu.paymentMethods}
              </span>
            )}
            {menu.deliveryFee && (
              <span className="bg-white/80 border border-orange-200 text-orange-800 text-xs font-medium px-3 py-1.5 rounded-full shadow-sm">
                🛵 Delivery {menu.deliveryFee}
              </span>
            )}
            {menu.minimumOrder && (
              <span className="bg-white/80 border border-green-200 text-green-800 text-xs font-medium px-3 py-1.5 rounded-full shadow-sm">
                🛒 Min {menu.minimumOrder}
              </span>
            )}
          </motion.div>

          {/* WhatsApp + Chat buttons */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="flex gap-2 justify-center">
            <button onClick={() => setChatOpen(true)}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm px-5 py-2.5 rounded-2xl shadow-md transition-colors">
              <MessageCircle className="w-4 h-4" /> Chat & Order
            </button>
            {menu.whatsappNumber && (
              <a href={`https://wa.me/${menu.whatsappNumber.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold text-sm px-5 py-2.5 rounded-2xl shadow-md transition-colors">
                <Phone className="w-4 h-4" /> WhatsApp
              </a>
            )}
          </motion.div>

          {/* Scroll hint */}
          <motion.div animate={{ y: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.8 }}
            className="mt-6 flex justify-center text-gray-300">
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </div>
      </div>

      {/* Divider */}
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-rose-200 to-transparent" />
          <span className="flex items-center gap-1.5 text-rose-600 font-semibold text-sm">
            <Star className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
            Our Menu
            <Star className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-rose-200 to-transparent" />
        </div>
      </div>

      {/* Menu items */}
      <div className="max-w-2xl mx-auto px-4 pb-36">
        {menu.menu.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🧁</div>
            <p className="text-gray-500 font-medium">Menu coming soon — chat to ask!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {menu.menu.map((item, i) => {
              const pal = CARD_PALETTES[i % CARD_PALETTES.length];
              const tagline = item.description || getTagline(item.name);
              return (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, type: 'spring', stiffness: 180 }}
                  className={`${pal.bg} border ${pal.border} rounded-2xl p-4 shadow-sm`}>

                  <div className="flex items-start gap-3">
                    {/* Colour dot */}
                    <div className={`w-2.5 h-2.5 rounded-full ${pal.dot} flex-shrink-0 mt-1.5`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900 text-base">{item.name}</h3>
                        {item.eggless && (
                          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-green-700 bg-green-100 border border-green-200 px-1.5 py-0.5 rounded-full">
                            <Leaf className="w-2.5 h-2.5" /> Eggless
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 italic leading-snug">{tagline}</p>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className={`text-lg font-extrabold ${pal.price}`}>
                          PKR {item.price}
                        </span>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${pal.badge}`}>
                          {item.unit || 'per piece'}
                        </span>
                      </div>
                    </div>

                    {/* Order button */}
                    <button onClick={() => openChatWithItem(item)}
                      className="flex-shrink-0 flex flex-col items-center gap-1 bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-xs px-3 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md">
                      <ShoppingBag className="w-4 h-4" />
                      Order
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Bottom banner */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="mt-8 rounded-3xl overflow-hidden shadow-lg"
          style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #ec4899 50%, #a855f7 100%)' }}>
          <div className="p-6 text-center text-white">
            <div className="text-3xl mb-2">🎂</div>
            <h3 className="font-bold text-xl mb-1">Want something custom?</h3>
            <p className="text-white/80 text-sm mb-4">
              Chat with our AI — describe what you want, pick a date, and your order goes straight to {menu.bakerName}.
            </p>
            <button onClick={() => setChatOpen(true)}
              className="bg-white text-rose-600 font-bold text-sm px-6 py-3 rounded-2xl hover:bg-rose-50 transition-colors shadow-md">
              Start chatting 💬
            </button>
          </div>
        </motion.div>

        {/* Powered by footer */}
        <div className="mt-6 text-center">
          <p className="text-[11px] text-gray-400">
            Powered by <span className="font-semibold text-rose-400">Sweet Tooth</span> · AI order management for home bakers
          </p>
        </div>
      </div>

      {/* Floating chat button */}
      <AnimatePresence>
        {!chatOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            onClick={() => setChatOpen(true)}
            className="fixed bottom-6 right-4 flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm px-4 py-3 rounded-full shadow-xl z-40 transition-colors">
            <MessageCircle className="w-5 h-5" />
            Order Now
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

  useEffect(() => {
    if (initialItem) {
      setInput(`I'm interested in ${initialItem.name} (PKR ${initialItem.price} ${initialItem.unit || 'per piece'}). Can you tell me more?`);
    } else {
      setMessages([{
        role: 'assistant',
        content: `Salam! 🎂 Welcome to ${menu.businessName}!\n\nI'm your AI assistant — I can tell you about our menu, answer questions, or take your order right here. What would you like today?`,
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

  const cleanText = (text) => text.replace(/ORDER_JSON:\{.+\}/g, '').trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-white rounded-t-3xl shadow-2xl"
      style={{ maxHeight: '88dvh', borderTop: '3px solid #f43f5e' }}>

      {/* Chat header */}
      <div className="flex items-center gap-3 px-4 py-3.5" style={{ background: 'linear-gradient(135deg, #fff1f2 0%, #fdf2f8 100%)' }}>
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm text-xl">🎂</div>
        <div className="flex-1">
          <p className="font-bold text-gray-900 text-sm">{menu.businessName}</p>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <p className="text-[11px] text-gray-500">AI assistant · usually instant</p>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors shadow-sm">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ minHeight: 0, background: '#fafafa' }}>
        {messages.map((msg, i) => {
          const display = cleanText(msg.content);
          if (!display && msg.role === 'assistant' && i === messages.length - 1 && streaming) {
            return (
              <div key={i} className="flex gap-2">
                <div className="w-7 h-7 flex-shrink-0 rounded-full bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center text-sm">🎂</div>
                <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2.5 shadow-sm border border-rose-100">
                  <div className="flex gap-1 items-center h-5">
                    <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '120ms' }} />
                    <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '240ms' }} />
                  </div>
                </div>
              </div>
            );
          }
          if (!display) return null;
          return (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 flex-shrink-0 rounded-full bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center text-sm">🎂</div>
              )}
              <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-rose-600 text-white rounded-tr-sm shadow-sm'
                  : 'bg-white text-gray-800 rounded-tl-sm shadow-sm border border-rose-100'
              }`}>
                {display}
              </div>
            </div>
          );
        })}

        {orderPlaced && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <div className="text-2xl mb-1">🎉</div>
            <p className="text-green-700 font-bold text-sm">Order placed!</p>
            <p className="text-xs text-green-600 mt-0.5">{menu.bakerName} will confirm on WhatsApp shortly.</p>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-none bg-white border-t border-rose-50">
          {['What\'s on the menu?', 'Do you deliver?', 'Can I customise?', 'How do I order?'].map(q => (
            <button key={q} onClick={() => send(q)}
              className="flex-shrink-0 bg-rose-50 text-rose-700 text-xs font-semibold px-3 py-2 rounded-full border border-rose-200 hover:bg-rose-100 transition-colors whitespace-nowrap">
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-3 pb-4 pt-2 bg-white border-t border-rose-50">
        <div className="flex gap-2 bg-rose-50 rounded-2xl border border-rose-200 px-3 py-2 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about the menu or place an order…"
            rows={1}
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-rose-300 focus:outline-none resize-none leading-relaxed"
            style={{ maxHeight: 80 }}
          />
          <button onClick={() => send()} disabled={!input.trim() || streaming}
            className="w-8 h-8 flex-shrink-0 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[10px] text-center text-gray-300 mt-1.5">Powered by Sweet Tooth AI</p>
      </div>
    </motion.div>
  );
}
