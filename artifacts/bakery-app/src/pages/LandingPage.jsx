import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Cake, Bot, Sparkles, CalendarDays, Users, BarChart3,
  MessageCircle, Check, ArrowRight, Star, Shield,
} from 'lucide-react';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI Auto-Import',
    desc: 'Paste a WhatsApp order message — AI pulls out the customer name, item, flavour, and delivery date instantly.',
  },
  {
    icon: Bot,
    title: 'AI Order Agent',
    desc: 'Share your menu link. Customers browse and place orders through a chatbot. Orders appear in your dashboard automatically.',
  },
  {
    icon: CalendarDays,
    title: 'Delivery Calendar',
    desc: 'Every upcoming order on one calendar view. No more missed deadlines or double-bookings.',
  },
  {
    icon: BarChart3,
    title: 'Revenue Dashboard',
    desc: "Track what you've made, what's pending, and what's overdue — all in real time.",
  },
  {
    icon: Users,
    title: 'Customer Profiles',
    desc: 'Full order history for every customer. Great for repeat orders and remembering special preferences.',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp Messages',
    desc: 'One-tap delivery confirmations in warm, Urdu-friendly language. Ready to copy and send.',
  },
];

const PLANS = [
  {
    name: 'Free',
    price: 0,
    btnClass: 'border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white',
    features: ['30 orders / month', 'Manual order entry', 'Dashboard & calendar', 'Customer list'],
    missing: ['AI auto-import', 'AI order agent', 'Public menu page', 'WhatsApp messages'],
  },
  {
    name: 'Baker',
    price: 1499,
    btnClass: 'bg-[#7C3AED] text-white hover:bg-[#6D28D9]',
    features: ['200 orders / month', 'AI auto-import (WhatsApp)', 'Public customer menu page', 'AI WhatsApp messages', 'Basic analytics'],
    missing: ['Unlimited AI agent chat', 'Priority support'],
  },
  {
    name: 'Pro',
    price: 2999,
    badge: 'Most popular',
    btnClass: 'bg-[#C2440E] text-white hover:bg-[#A83A0C]',
    features: ['Unlimited orders', 'AI auto-import', 'AI order agent + chat history', 'Public menu page', 'WhatsApp messages', 'Advanced analytics', 'Priority support'],
    missing: [],
  },
];

const TESTIMONIALS = [
  {
    name: 'Sana K.',
    city: 'Lahore',
    text: 'Pehle WhatsApp pe orders manage karna bohot mushkil tha. Ab sab kuch ek jagah hai — orders, calendar, payments.',
    stars: 5,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&q=80',
  },
  {
    name: 'Fatima R.',
    city: 'Karachi',
    text: 'My customers place orders at midnight and everything shows up in my dashboard by morning. The AI chat is incredible.',
    stars: 5,
    avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=80&h=80&fit=crop&q=80',
  },
  {
    name: 'Maryam A.',
    city: 'Islamabad',
    text: 'Delivery messages generate karna ab 2 seconds ka kaam hai. Customers bhi bohat khush rehte hain.',
    stars: 5,
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&q=80',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: '#FDFAF6', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── Nav ───────────────────────────────────────────────────────── */}
      <nav style={{ background: '#FDFAF6', borderBottom: '1px solid #EDE8DF' }}
        className="sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#7C3AED' }}>
              <Cake className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">Sweet Tooth</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to={`${basePath}/sign-in`}
              className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
              Sign in
            </Link>
            <Link to={`${basePath}/sign-up`}
              className="text-sm font-semibold text-white px-4 py-2 rounded-lg transition-colors"
              style={{ background: '#7C3AED' }}>
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 lg:pt-20 lg:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Text */}
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="text-sm font-semibold tracking-widest uppercase mb-5" style={{ color: '#C2440E' }}>
              For Pakistan home bakers
            </p>
            <h1 className="text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight text-gray-900 mb-6"
              style={{ fontFamily: 'Georgia, serif' }}>
              Your orders,<br />
              <span style={{ color: '#7C3AED' }}>finally</span><br />
              under control.
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-md">
              Stop managing orders in WhatsApp notes and voice messages.
              Sweet Tooth gives you a real dashboard — with AI that reads orders for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to={`${basePath}/sign-up`}
                className="inline-flex items-center justify-center gap-2 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors text-base"
                style={{ background: '#7C3AED' }}>
                Start for free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="https://wa.me/923001234567?text=Hi%2C%20I%27d%20like%20to%20book%20a%20demo%20of%20Sweet%20Tooth"
                target="_blank" rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 font-semibold px-6 py-3.5 rounded-xl border text-gray-700 transition-colors text-base hover:bg-gray-50"
                style={{ borderColor: '#D6CFC4' }}>
                <MessageCircle className="w-4 h-4 text-green-500" />
                Book a demo
              </a>
            </div>
            <div className="flex items-center gap-6 mt-8 pt-8" style={{ borderTop: '1px solid #EDE8DF' }}>
              <div>
                <p className="text-2xl font-black text-gray-900">500+</p>
                <p className="text-xs text-gray-400 mt-0.5">Active bakers</p>
              </div>
              <div className="w-px h-8" style={{ background: '#EDE8DF' }} />
              <div>
                <p className="text-2xl font-black text-gray-900">24k+</p>
                <p className="text-xs text-gray-400 mt-0.5">Orders managed</p>
              </div>
              <div className="w-px h-8" style={{ background: '#EDE8DF' }} />
              <div>
                <p className="text-2xl font-black text-gray-900">4.9★</p>
                <p className="text-xs text-gray-400 mt-0.5">Average rating</p>
              </div>
            </div>
          </motion.div>

          {/* Photo stack */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="relative hidden lg:block">
            {/* Main photo */}
            <div className="rounded-3xl overflow-hidden shadow-2xl" style={{ height: 480 }}>
              <img
                src="https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=900&q=85"
                alt="Baker decorating a cake"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Floating notification card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="absolute -bottom-6 -left-8 bg-white rounded-2xl shadow-xl px-4 py-3.5 border flex items-center gap-3"
              style={{ borderColor: '#EDE8DF', maxWidth: 280 }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#DCFCE7' }}>
                <MessageCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">New order saved ✓</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Aisha · Chocolate cake · 18 Jul</p>
              </div>
            </motion.div>
            {/* Floating metric */}
            <motion.div
              initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="absolute -top-5 -right-6 bg-white rounded-2xl shadow-xl px-4 py-3.5 border"
              style={{ borderColor: '#EDE8DF' }}>
              <p className="text-[11px] text-gray-400 mb-0.5">This week</p>
              <p className="text-2xl font-black text-gray-900">23</p>
              <p className="text-[11px] text-green-600 font-semibold mt-0.5">↑ 4 orders</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── How it works (3 steps) ────────────────────────────────────── */}
      <section style={{ background: '#F5F0E8' }} className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-2">How it works</p>
          <h2 className="text-3xl font-black text-gray-900 mb-12" style={{ fontFamily: 'Georgia, serif' }}>
            Three steps. That's it.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { n: '01', title: 'Connect your bakery', desc: 'Add your menu, hours, and delivery area. Takes under 5 minutes.' },
              { n: '02', title: 'Share your AI link', desc: 'Customers open your shop page, browse, and chat with your AI to place orders.' },
              { n: '03', title: 'Wake up to orders', desc: 'Orders appear in your dashboard automatically. Confirm with one tap.' },
            ].map(s => (
              <div key={s.n} className="flex gap-5">
                <div className="text-4xl font-black flex-shrink-0" style={{ color: '#EDE8DF', fontFamily: 'Georgia, serif' }}>{s.n}</div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1">{s.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: '#FDFAF6' }}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-2">Features</p>
            <h2 className="text-3xl font-black text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>
              Everything your bakery needs
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: '#EDE8DF' }}>
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="p-7" style={{ background: '#FDFAF6' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-4" style={{ background: '#F0EBE3' }}>
                    <Icon className="w-4 h-4 text-gray-700" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 text-[15px]">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: '#F5F0E8' }}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-2">Bakers love it</p>
            <h2 className="text-3xl font-black text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>
              Don't take our word for it
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-6" style={{ border: '1px solid #EDE8DF' }}>
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <img src={t.avatar} alt={t.name} className="w-9 h-9 rounded-full object-cover" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: '#FDFAF6' }}>
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-2">Pricing</p>
            <h2 className="text-3xl font-black text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>
              Simple, honest pricing
            </h2>
            <p className="text-gray-500 mt-2">Start free. Upgrade when you're ready. No contracts.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div key={plan.name}
                className="rounded-2xl p-6 flex flex-col relative"
                style={{
                  background: plan.badge ? '#1A0E2E' : '#FDFAF6',
                  border: `1px solid ${plan.badge ? 'transparent' : '#EDE8DF'}`,
                }}>
                {plan.badge && (
                  <span className="absolute -top-3 left-6 text-[11px] font-bold px-3 py-1 rounded-full"
                    style={{ background: '#C2440E', color: 'white' }}>
                    {plan.badge}
                  </span>
                )}
                <div className="mb-6">
                  <p className={`font-bold text-base mb-2 ${plan.badge ? 'text-white' : 'text-gray-900'}`}>{plan.name}</p>
                  <div className="flex items-baseline gap-1">
                    {plan.price === 0
                      ? <span className={`text-4xl font-black ${plan.badge ? 'text-white' : 'text-gray-900'}`}>Free</span>
                      : <>
                          <span className={`text-4xl font-black ${plan.badge ? 'text-white' : 'text-gray-900'}`}>
                            {plan.price.toLocaleString()}
                          </span>
                          <span className={`text-sm ${plan.badge ? 'text-gray-400' : 'text-gray-400'}`}>PKR/mo</span>
                        </>
                    }
                  </div>
                  {plan.price > 0 && (
                    <p className="text-xs text-gray-500 mt-1">≈ ${(plan.price / 280).toFixed(0)} USD</p>
                  )}
                </div>
                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-500" />
                      <span className={plan.badge ? 'text-gray-300' : 'text-gray-700'}>{f}</span>
                    </li>
                  ))}
                  {plan.missing.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <div className="w-4 h-4 flex-shrink-0 mt-0.5 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                      </div>
                      <span className="text-gray-300 line-through">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to={`${basePath}/sign-up`}
                  className={`block w-full text-center font-semibold py-3 rounded-xl text-sm transition-colors ${plan.btnClass}`}>
                  {plan.price === 0 ? 'Get started free' : `Start ${plan.name}`}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400 mt-6">14-day free trial on all paid plans · No credit card required</p>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: '#1A0E2E' }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-black text-white mb-4 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
            Ready to run your bakery properly?
          </h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Join home bakers across Pakistan who've swapped WhatsApp chaos for a real system.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={`${basePath}/sign-up`}
              className="inline-flex items-center justify-center gap-2 font-bold px-7 py-4 rounded-xl text-base transition-colors"
              style={{ background: '#7C3AED', color: 'white' }}>
              Start for free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="https://wa.me/923001234567?text=Hi%2C%20I%27d%20like%20to%20book%20a%20demo%20of%20Sweet%20Tooth"
              target="_blank" rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 font-semibold px-7 py-4 rounded-xl text-base transition-colors border text-white hover:bg-white/5"
              style={{ borderColor: '#3D2560' }}>
              <MessageCircle className="w-4 h-4 text-green-400" />
              Book a demo on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="py-8 px-6" style={{ background: '#130A22', borderTop: '1px solid #2A1A40' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: '#7C3AED' }}>
              <Cake className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-gray-300">Sweet Tooth</span>
            <span>· Built for Pakistan home bakers</span>
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <Shield className="w-3.5 h-3.5 text-green-500" />
            <span>Secure · Your data stays yours</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
