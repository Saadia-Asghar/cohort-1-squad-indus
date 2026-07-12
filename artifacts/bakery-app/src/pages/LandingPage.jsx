import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Cake, Bot, Sparkles, CalendarDays, Users, BarChart3,
  MessageCircle, Check, ArrowRight, Star, Zap, Shield,
} from 'lucide-react';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

const FEATURES = [
  {
    icon: Sparkles,
    color: 'bg-amber-100 text-amber-600',
    title: 'AI Auto-Import',
    desc: 'Paste a WhatsApp order message and let AI extract all details — customer name, flavour, delivery date — instantly.',
  },
  {
    icon: Bot,
    color: 'bg-violet-100 text-violet-600',
    title: 'AI Order Agent',
    desc: 'Share a link with customers. They browse your menu and place orders through an AI chatbot — while you sleep.',
  },
  {
    icon: CalendarDays,
    color: 'bg-blue-100 text-blue-600',
    title: 'Delivery Calendar',
    desc: 'See every upcoming delivery in a visual calendar. Never double-book or miss a deadline again.',
  },
  {
    icon: BarChart3,
    color: 'bg-green-100 text-green-600',
    title: 'Revenue Dashboard',
    desc: 'Track orders, earnings, and payment status in real time. Know exactly what\'s pending and what\'s paid.',
  },
  {
    icon: Users,
    color: 'bg-pink-100 text-pink-600',
    title: 'Customer Profiles',
    desc: 'Every customer\'s order history in one place. Perfect for repeat orders and personalised follow-ups.',
  },
  {
    icon: MessageCircle,
    color: 'bg-green-100 text-green-600',
    title: 'WhatsApp Messages',
    desc: 'Generate ready-to-send delivery confirmation messages in one tap — warm, Urdu-friendly, and on-brand.',
  },
];

const PLANS = [
  {
    name: 'Free',
    price: 0,
    priceNote: 'forever',
    badge: null,
    color: 'border-gray-200',
    btnClass: 'bg-gray-900 hover:bg-gray-800 text-white',
    features: [
      '30 orders / month',
      'Manual order entry',
      'Basic dashboard',
      'Delivery calendar',
      'Customer list',
    ],
    missing: ['AI auto-import', 'AI order agent', 'Public menu page', 'WhatsApp messages'],
  },
  {
    name: 'Baker',
    price: 1499,
    priceNote: '/ month',
    badge: null,
    color: 'border-purple-200',
    btnClass: 'bg-purple-600 hover:bg-purple-700 text-white',
    features: [
      '200 orders / month',
      'AI auto-import (WhatsApp)',
      'Public customer menu page',
      'AI WhatsApp messages',
      'Basic analytics',
    ],
    missing: ['Unlimited AI agent chat', 'Priority support'],
  },
  {
    name: 'Pro',
    price: 2999,
    priceNote: '/ month',
    badge: 'Most Popular',
    color: 'border-purple-500 ring-2 ring-purple-400 ring-offset-2',
    btnClass: 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg',
    features: [
      'Unlimited orders',
      'AI auto-import (WhatsApp)',
      'AI order agent with chat history',
      'Public customer menu page',
      'AI WhatsApp messages',
      'Advanced analytics',
      'Priority support',
    ],
    missing: [],
  },
];

const TESTIMONIALS = [
  {
    name: 'Sana K.',
    city: 'Lahore',
    text: 'Pehle WhatsApp pe orders manage karna bohot mushkil tha. Ab sab kuch ek jagah hai — orders, calendar, payments. Bohot helpful!',
    stars: 5,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&q=80',
  },
  {
    name: 'Fatima R.',
    city: 'Karachi',
    text: 'The AI chat feature is amazing. My customers place orders at midnight and everything shows up in my dashboard by morning.',
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

function FadeUp({ children, delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }} viewport={{ once: true }}>
      {children}
    </motion.div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
              <Cake className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">Sweet Tooth</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to={`${basePath}/sign-in`}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
              Sign In
            </Link>
            <Link to={`${basePath}/sign-up`}
              className="text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition-colors shadow-sm">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-purple-50 via-white to-white pt-20 pb-24 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-100/60 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative">
          <FadeUp>
            <span className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-purple-200">
              <Zap className="w-3 h-3" /> Built for Pakistan home bakers
            </span>
          </FadeUp>
          <FadeUp delay={0.05}>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight tracking-tight mb-5">
              Run your home bakery<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-violet-600">without the chaos</span>
            </h1>
          </FadeUp>
          <FadeUp delay={0.1}>
            <p className="text-lg text-gray-500 max-w-xl mx-auto mb-8 leading-relaxed">
              Sweet Tooth is the AI-powered order dashboard for home bakers. Import WhatsApp orders in seconds, share a menu link with customers, and let AI take orders for you.
            </p>
          </FadeUp>
          <FadeUp delay={0.15}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to={`${basePath}/sign-up`}
                className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3.5 rounded-2xl shadow-md transition-colors text-base">
                Start for free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="https://wa.me/923001234567?text=Hi%2C%20I%27d%20like%20to%20book%20a%20demo%20of%20Sweet%20Tooth"
                target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold px-6 py-3.5 rounded-2xl shadow-sm transition-colors text-base">
                <MessageCircle className="w-4 h-4 text-green-500" />
                Book a demo
              </a>
            </div>
            <p className="text-xs text-gray-400 mt-3">No credit card required · Free plan available</p>
          </FadeUp>
        </div>

        {/* Hero image + dashboard mockup split */}
        <FadeUp delay={0.25}>
          <div className="max-w-5xl mx-auto mt-14 grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            {/* Real bakery photo */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/3] lg:aspect-auto lg:h-80">
              <img
                src="https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=800&q=80"
                alt="Home baker decorating a cake"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-white/90 backdrop-blur rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg">
                  <div className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900">New order via AI chat</p>
                    <p className="text-[11px] text-gray-500 truncate">Aisha: "1 chocolate cake, 18 July, Gulberg"</p>
                  </div>
                  <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex-shrink-0">Saved ✓</span>
                </div>
              </div>
            </div>

            {/* Dashboard mockup */}
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-300" />
                <div className="w-3 h-3 rounded-full bg-yellow-300" />
                <div className="w-3 h-3 rounded-full bg-green-300" />
                <div className="ml-3 text-xs text-gray-400 font-medium">Sweet Tooth Dashboard</div>
              </div>
              <div className="p-4 grid grid-cols-2 gap-2.5">
                {[
                  { label: 'Total Orders', val: '147', color: 'bg-purple-50 text-purple-700' },
                  { label: 'This Week', val: '23', color: 'bg-blue-50 text-blue-700' },
                  { label: 'Delivery Rate', val: '94%', color: 'bg-green-50 text-green-700' },
                  { label: 'Pending Pay', val: 'PKR 12.4k', color: 'bg-amber-50 text-amber-700' },
                ].map(c => (
                  <div key={c.label} className={`${c.color} rounded-xl p-3`}>
                    <p className="text-[11px] font-medium opacity-70 mb-1">{c.label}</p>
                    <p className="text-lg font-bold">{c.val}</p>
                  </div>
                ))}
              </div>
              <div className="px-4 pb-4 space-y-2">
                {[
                  { name: 'Aisha Khan', item: 'Chocolate Cake', date: '18 Jul', status: 'Paid', color: 'bg-green-100 text-green-700' },
                  { name: 'Sara Ahmed', item: 'Red Velvet', date: '19 Jul', status: 'Pending', color: 'bg-amber-100 text-amber-700' },
                  { name: 'Fatima R', item: 'Cupcakes ×2 doz', date: '20 Jul', status: 'Confirmed', color: 'bg-purple-100 text-purple-700' },
                ].map((o, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{o.name}</p>
                      <p className="text-[11px] text-gray-400">{o.item} · {o.date}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${o.color}`}>{o.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <FadeUp>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Everything your bakery needs</h2>
              <p className="text-gray-500 max-w-md mx-auto">From WhatsApp order chaos to a fully managed dashboard — in minutes.</p>
            </div>
          </FadeUp>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <FadeUp key={f.title} delay={i * 0.05}>
                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all">
                    <div className={`w-10 h-10 rounded-xl ${f.color} flex items-center justify-center mb-3`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                  </div>
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4 bg-gradient-to-b from-purple-50 to-white">
        <div className="max-w-5xl mx-auto">
          <FadeUp>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Simple, honest pricing</h2>
              <p className="text-gray-500 max-w-sm mx-auto">Start free. Upgrade when you're ready. Cancel anytime.</p>
            </div>
          </FadeUp>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-stretch">
            {PLANS.map((plan, i) => (
              <FadeUp key={plan.name} delay={i * 0.07}>
                <div className={`relative bg-white rounded-2xl border ${plan.color} p-6 h-full flex flex-col`}>
                  {plan.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                      {plan.badge}
                    </span>
                  )}
                  <div className="mb-5">
                    <p className="font-bold text-gray-900 text-lg mb-1">{plan.name}</p>
                    <div className="flex items-baseline gap-1">
                      {plan.price === 0
                        ? <span className="text-3xl font-extrabold text-gray-900">Free</span>
                        : <>
                            <span className="text-3xl font-extrabold text-gray-900">PKR {plan.price.toLocaleString()}</span>
                            <span className="text-sm text-gray-400">{plan.priceNote}</span>
                          </>}
                    </div>
                    {plan.price > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">≈ ${(plan.price / 280).toFixed(0)} USD / month</p>
                    )}
                  </div>
                  <ul className="space-y-2 flex-1 mb-6">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                    {plan.missing.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-400 line-through">
                        <div className="w-4 h-4 flex-shrink-0 mt-0.5 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to={`${basePath}/sign-up`}
                    className={`block w-full text-center font-semibold py-3 rounded-xl text-sm transition-colors ${plan.btnClass}`}>
                    {plan.price === 0 ? 'Get started free' : `Start ${plan.name} plan`}
                  </Link>
                </div>
              </FadeUp>
            ))}
          </div>
          <FadeUp delay={0.2}>
            <p className="text-center text-sm text-gray-400 mt-6">
              All plans include a 14-day free trial · No credit card required
            </p>
          </FadeUp>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <FadeUp>
            <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-10">Bakers love Sweet Tooth</h2>
          </FadeUp>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <FadeUp key={t.name} delay={i * 0.07}>
                <div className="bg-purple-50 rounded-2xl p-5 border border-purple-100">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: t.stars }).map((_, j) => (
                      <Star key={j} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed mb-4">"{t.text}"</p>
                  <div className="flex items-center gap-2">
                    <img src={t.avatar} alt={t.name} className="w-8 h-8 rounded-full object-cover border-2 border-purple-200" />
                    <div>
                      <p className="text-xs font-semibold text-gray-900">{t.name}</p>
                      <p className="text-[10px] text-gray-400">{t.city}</p>
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-purple-600 to-violet-700">
        <FadeUp>
          <div className="max-w-xl mx-auto text-center">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Cake className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-3xl font-extrabold text-white mb-4">Ready to take control?</h2>
            <p className="text-purple-200 mb-8 leading-relaxed">
              Join home bakers across Pakistan who manage their orders smarter with Sweet Tooth.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to={`${basePath}/sign-up`}
                className="flex items-center justify-center gap-2 bg-white text-purple-700 font-bold px-6 py-3.5 rounded-2xl shadow-lg hover:bg-purple-50 transition-colors text-base">
                Start for free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="https://wa.me/923001234567?text=Hi%2C%20I%27d%20like%20to%20book%20a%20demo%20of%20Sweet%20Tooth"
                target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-6 py-3.5 rounded-2xl hover:bg-white/20 transition-colors text-base">
                <MessageCircle className="w-4 h-4" />
                Book a WhatsApp demo
              </a>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-950 text-gray-400">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
              <Cake className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-white">Sweet Tooth</span>
            <span>— Built for Pakistan home bakers</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-green-400" />
            <span>Secure · Private · Your data stays yours</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
