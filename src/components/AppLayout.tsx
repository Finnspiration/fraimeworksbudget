import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUnreadCounts } from '@/hooks/use-unread-counts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, MessageCircle, CheckSquare, Shield, LogOut } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Budget', icon: BarChart3 },
  { to: '/chat', label: 'Chat', icon: MessageCircle, countKey: 'unreadChat' as const },
  { to: '/todo', label: 'Opgaver', icon: CheckSquare, countKey: 'unreadTasks' as const },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { profile, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const { unreadChat, unreadTasks } = useUnreadCounts();
  const counts = { unreadChat, unreadTasks };

  // Index page has its own header
  if (location.pathname === '/') return <>{children}</>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 sm:px-6 py-3">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <nav className="flex items-center gap-1">
            {navItems.map(item => {
              const count = item.countKey ? counts[item.countKey] : 0;
              return (
                <Link key={item.to} to={item.to}>
                  <Button variant={location.pathname === item.to ? 'default' : 'ghost'} size="sm" className="gap-1.5 relative">
                    <item.icon className="h-3.5 w-3.5" />{item.label}
                    {count > 0 && (
                      <Badge variant="destructive" className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center">
                        {count > 99 ? '99+' : count}
                      </Badge>
                    )}
                  </Button>
                </Link>
              );
            })}
            {isAdmin && (
              <Link to="/admin">
                <Button variant={location.pathname === '/admin' ? 'default' : 'ghost'} size="sm" className="gap-1.5">
                  <Shield className="h-3.5 w-3.5" />Admin
                </Button>
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{profile?.name}</span>
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5">
              <LogOut className="h-3.5 w-3.5" />Log ud
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
