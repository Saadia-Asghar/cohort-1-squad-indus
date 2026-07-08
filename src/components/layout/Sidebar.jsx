const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { NavLink, useNavigate } from 'react-router-dom';
import { Home, ClipboardList, Calendar, User, Sparkles, LogOut, MessageCircle, Cake } from 'lucide-react';

const navItems = [
  { to: '/', icon: Home, label: 'Dashboard', end: true },
  { to: '/orders', icon: ClipboardList, label: 'Orders' },
  { to: '/auto-import', icon: Sparkles, label: 'Auto-Import' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/profile', icon: User, label: 'Profile' }
];

export default function Sidebar() {
  const navigate = useNavigate();

  return (
    <aside className="hidden lg:flex w-64 flex-col bg-sidebar border-r border-sidebar-border h-screen sticky top-0 flex-shrink-0">
      <div className="px-6 py-6 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center">
          <Cake className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        <span className="font-heading text-xl font-bold text-sidebar-foreground">Sweet Tooth</span>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {({ isActive }) => (
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}>
                  <Icon className="w-5 h-5" strokeWidth={2} />
                  {item.label}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="px-4 py-3 mx-3 mb-3 rounded-xl bg-sidebar-accent/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-4 h-4 text-success" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground">WhatsApp Connected</p>
            <p className="text-[10px] text-sidebar-foreground/50">+92 300 1234567</p>
          </div>
          <span className="w-2 h-2 rounded-full bg-success animate-pulse flex-shrink-0" />
        </div>
      </div>

      <div className="px-3 py-3 border-t border-sidebar-border">
        <button
          onClick={() => db.auth.logout()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-danger transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>
      </div>
    </aside>
  );
}