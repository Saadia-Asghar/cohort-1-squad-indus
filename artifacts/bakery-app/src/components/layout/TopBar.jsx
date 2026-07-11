import { Search, Bell, User } from 'lucide-react';
import { useUser } from '@clerk/react';

export default function TopBar() {
  const { user } = useUser();
  const displayName = user?.fullName || user?.firstName || 'Baker';

  return (
    <header className="hidden lg:flex items-center justify-between px-8 py-3.5 bg-card border-b border-border sticky top-0 z-30">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Search orders, customers..."
            className="w-full bg-input rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
          <Bell className="w-5 h-5 text-foreground" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-danger" />
        </button>
        <div className="flex items-center gap-2.5 pl-3 border-l border-border">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-primary" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{displayName}</p>
            <p className="text-[10px] text-muted-foreground">Home Baker</p>
          </div>
        </div>
      </div>
    </header>
  );
}
