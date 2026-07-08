const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Clock, Bell, Moon, ChevronRight, LogOut, HelpCircle, Sparkles, MessageCircle, Shield, Check, FileText, Globe, Truck } from 'lucide-react';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [orderConfirmations, setOrderConfirmations] = useState(true);
  const [paymentAlerts, setPaymentAlerts] = useState(true);
  const [deliveryReminders, setDeliveryReminders] = useState(true);

  useEffect(() => {
    db.auth.me().then(setUser).catch(() => setUser({ full_name: 'Zara Ahmed', email: 'zara@bakery.com' }));
  }, []);

  return (
    <div className="p-5 pb-24 lg:p-8 lg:pb-8 max-w-5xl">
      <h1 className="font-heading text-3xl font-bold text-foreground mb-6">Profile</h1>

      {/* Profile Card */}
      <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/50 mb-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <User className="w-8 h-8 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-heading text-lg font-semibold text-foreground truncate">
            {user?.full_name || 'Zara Ahmed'}
          </h2>
          <p className="text-sm text-muted-foreground truncate">{user?.email || 'zara@bakery.com'}</p>
          <button className="text-xs text-primary font-medium mt-1">Edit profile</button>
        </div>
      </div>

      {/* WhatsApp Status */}
      <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50 mb-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-success" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">WhatsApp Connected</p>
          <p className="text-xs text-muted-foreground">+92 300 1234567 · Syncing</p>
        </div>
        <span className="w-2.5 h-2.5 rounded-full bg-success" />
      </div>

      <div className="lg:grid lg:grid-cols-2 gap-5">
      {/* Business Hours */}
      <SectionLabel>Business Hours</SectionLabel>
      <div className="bg-card rounded-2xl shadow-soft border border-border/50 mb-5 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/50">
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">Opening time</span>
          </div>
          <span className="text-sm text-muted-foreground font-medium">9:00 AM</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">Closing time</span>
          </div>
          <span className="text-sm text-muted-foreground font-medium">10:00 PM</span>
        </div>
      </div>

      {/* Notifications */}
      <SectionLabel>Notifications</SectionLabel>
      <div className="bg-card rounded-2xl shadow-soft border border-border/50 mb-5 overflow-hidden">
        <ToggleRow icon={<Bell className="w-4 h-4" />} label="Push notifications" value={notifications} onChange={setNotifications} />
        <ToggleRow icon={<Check className="w-4 h-4" />} label="Order confirmations" value={orderConfirmations} onChange={setOrderConfirmations} />
        <ToggleRow icon={<span className="text-sm">💰</span>} label="Payment alerts" value={paymentAlerts} onChange={setPaymentAlerts} />
        <ToggleRow icon={<Truck className="w-4 h-4" />} label="Delivery reminders" value={deliveryReminders} onChange={setDeliveryReminders} last />
      </div>

      {/* Automation */}
      <SectionLabel>Automation</SectionLabel>
      <div className="bg-card rounded-2xl shadow-soft border border-border/50 mb-5 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/50">
          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm text-foreground">Auto-import frequency</span>
          </div>
          <span className="text-sm text-muted-foreground font-medium">Every 24h</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">AI confidence threshold</span>
          </div>
          <span className="text-sm text-muted-foreground font-medium">70%</span>
        </div>
      </div>

      {/* Preferences */}
      <SectionLabel>Preferences</SectionLabel>
      <div className="bg-card rounded-2xl shadow-soft border border-border/50 mb-5 overflow-hidden">
        <ToggleRow icon={<Moon className="w-4 h-4" />} label="Dark mode" value={darkMode} onChange={setDarkMode} />
        <div className="flex items-center justify-between px-4 py-3.5 border-t border-border/50">
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">Language</span>
          </div>
          <span className="text-sm text-muted-foreground font-medium">English</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3.5 border-t border-border/50">
          <div className="flex items-center gap-3">
            <span className="text-sm">💰</span>
            <span className="text-sm text-foreground">Currency</span>
          </div>
          <span className="text-sm text-muted-foreground font-medium">PKR</span>
        </div>
      </div>

      {/* About */}
      <SectionLabel>About</SectionLabel>
      <div className="bg-card rounded-2xl shadow-soft border border-border/50 mb-5 overflow-hidden">
        <LinkRow icon={<HelpCircle className="w-4 h-4" />} label="Help & Support" />
        <LinkRow icon={<Shield className="w-4 h-4" />} label="Privacy Policy" />
        <LinkRow icon={<FileText className="w-4 h-4" />} label="Terms of Service" last />
      </div>
      </div>

      <div className="text-center text-xs text-muted-foreground mb-4">Sweet Tooth v2.0</div>

      {/* Logout */}
      <button
        onClick={() => db.auth.logout()}
        className="w-full bg-card border border-danger/20 rounded-2xl py-3.5 font-medium text-sm text-danger flex items-center justify-center gap-2 shadow-soft"
      >
        <LogOut className="w-4 h-4" /> Log Out
      </button>
    </div>
  );
}

function SectionLabel({ children }) {
  return <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-1">{children}</p>;
}

function ToggleRow({ icon, label, value, onChange, last }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3.5 ${!last ? 'border-b border-border/50' : ''}`}>
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full transition-colors relative ${value ? 'bg-primary' : 'bg-muted'}`}
      >
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-card shadow-sm ${value ? 'left-[22px]' : 'left-0.5'}`}
        />
      </button>
    </div>
  );
}

function LinkRow({ icon, label, last }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3.5 ${!last ? 'border-b border-border/50' : ''}`}>
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </div>
  );
}