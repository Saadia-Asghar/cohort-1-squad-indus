import { NavLink } from 'react-router-dom';
import { Home, ClipboardList, Users, Sparkles, User } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/orders', icon: ClipboardList, label: 'Orders' },
  { to: '/auto-import', icon: Sparkles, label: 'Import', isCenter: true },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border shadow-nav safe-bottom lg:hidden">
      <div className="mx-auto max-w-md flex items-center justify-around px-2 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          if (item.isCenter) {
            return (
              <NavLink key={item.to} to={item.to} className="flex flex-col items-center -mt-6">
                {({ isActive }) => (
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lift transition-colors ${
                      isActive ? 'bg-primary-hover text-primary-foreground' : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    <Icon className="w-6 h-6" strokeWidth={2} />
                  </motion.div>
                )}
              </NavLink>
            );
          }
          return (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              {({ isActive }) => (
                <div className="flex flex-col items-center gap-0.5 min-w-[56px] py-1">
                  <Icon
                    className={`w-5 h-5 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                    {item.label}
                  </span>
                </div>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}