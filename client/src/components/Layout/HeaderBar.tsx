import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight, Home, Search, Bell, Moon, Sun,
  LayoutDashboard, FileText, Upload, Users, Tag, Package,
  LucideIcon, Command, Menu,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Avatar, AvatarFallback } from '../ui/Avatar';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { cn } from '../../lib/utils';
import api from '../../services/api';

const getBreadcrumbs = (pathname: string) => {
  const paths = pathname.split('/').filter(Boolean);
  const breadcrumbs: { label: string; path: string; icon?: LucideIcon }[] = [
    { label: 'Home', path: '/dashboard', icon: Home },
  ];

  if (paths[0] === 'dashboard') {
    breadcrumbs.push({ label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard });
  }

  if (paths[0] === 'cases') {
    if (paths.length <= 1) {
      breadcrumbs.push({ label: 'Cases', path: '/cases', icon: LayoutDashboard });
    }
  }

  if (paths[0] === 'cases' && paths[1]) {
    const caseId = paths[1];
    breadcrumbs.push({ label: 'Cases', path: '/cases', icon: LayoutDashboard });
    breadcrumbs.push({ label: 'Case Details', path: `/cases/${caseId}` });

    const subRoutes: Record<string, { label: string; icon: LucideIcon }> = {
      search: { label: 'Search', icon: Search },
      review: { label: 'Review', icon: FileText },
      upload: { label: 'Upload', icon: Upload },
      custodians: { label: 'Custodians', icon: Users },
      tags: { label: 'Tags', icon: Tag },
      productions: { label: 'Productions', icon: Package },
      'processing-status': { label: 'Processing Status', icon: Upload },
      'chain-of-custody': { label: 'Chain of Custody', icon: Users },
      'quality-control': { label: 'Quality Control', icon: FileText },
    };

    if (paths[2] && subRoutes[paths[2]]) {
      breadcrumbs.push({
        label: subRoutes[paths[2]].label,
        path: `/cases/${caseId}/${paths[2]}`,
        icon: subRoutes[paths[2]].icon,
      });
    }
  }

  if (paths[0] === 'admin') {
    const adminRoutes: Record<string, { label: string; icon: LucideIcon }> = {
      users: { label: 'User Management', icon: Users },
      'audit-logs': { label: 'Audit Logs', icon: FileText },
      settings: { label: 'System Settings', icon: FileText },
      integrations: { label: 'Integrations', icon: FileText },
      licenses: { label: 'Licenses', icon: FileText },
    };
    if (paths[1] && adminRoutes[paths[1]]) {
      breadcrumbs.push({
        label: adminRoutes[paths[1]].label,
        path: `/admin/${paths[1]}`,
        icon: adminRoutes[paths[1]].icon,
      });
    }
  }

  const topLevel: Record<string, { label: string; icon: LucideIcon }> = {
    analytics: { label: 'Analytics', icon: LayoutDashboard },
    'team-performance': { label: 'Team Performance', icon: LayoutDashboard },
    notifications: { label: 'Notifications', icon: Bell },
    profile: { label: 'Profile', icon: Users },
    'review-queue': { label: 'My Review Queue', icon: FileText },
    'review-statistics': { label: 'Review Statistics', icon: LayoutDashboard },
    'privilege-log': { label: 'Privilege Log', icon: FileText },
    'client-portal': { label: 'Client Portal', icon: Users },
    billing: { label: 'Billing', icon: FileText },
  };

  if (paths.length === 1 && topLevel[paths[0]]) {
    breadcrumbs.push({
      label: topLevel[paths[0]].label,
      path: `/${paths[0]}`,
      icon: topLevel[paths[0]].icon,
    });
  }

  return breadcrumbs;
};

interface HeaderBarProps {
  onMenuClick?: () => void;
}

const HeaderBar = ({ onMenuClick }: HeaderBarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const breadcrumbs = useMemo(() => getBreadcrumbs(location.pathname), [location.pathname]);
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
    : '??';

  // Keyboard shortcut: Ctrl+K / Cmd+K to focus search
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setSearchOpen(true);
    }
    if (e.key === 'Escape') {
      setSearchOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const response = await api.get('/notifications?unreadOnly=true');
        const count = response.data?.unreadCount ?? 0;
        setUnreadCount(count);
      } catch (error) {
        console.error('Failed to fetch notifications', error);
        setUnreadCount(0);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [user]);

  return (
    <header
      className={cn(
        "h-14 flex items-center justify-between px-4 md:px-6 shrink-0 z-20",
        "bg-card/80 backdrop-blur-xl border-b border-border/50",
        "supports-[backdrop-filter]:bg-card/60",
      )}
    >
      {/* Left: Hamburger + Breadcrumbs */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground -ml-1"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

      <nav className="flex items-center gap-1 text-sm min-w-0" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1">
          {breadcrumbs.map((item, index) => (
            <li key={item.path + index} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground/40 mx-1 shrink-0" />
              )}
              {index === breadcrumbs.length - 1 ? (
                <span className="flex items-center text-foreground font-medium truncate text-sm" aria-current="page">
                  {item.icon && <item.icon className="h-3.5 w-3.5 mr-1.5 shrink-0 text-primary" />}
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.path}
                  className="flex items-center text-muted-foreground hover:text-foreground transition-colors truncate text-sm"
                >
                  {item.icon && <item.icon className="h-3.5 w-3.5 mr-1.5 shrink-0" />}
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      </div>

      {/* Center: Search Bar */}
      <div className="hidden md:flex flex-1 max-w-md mx-4">
        {searchOpen ? (
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search cases, documents..."
              className={cn(
                "w-full h-9 pl-9 pr-3 rounded-lg text-sm",
                "bg-secondary/80 border border-border/60 text-foreground placeholder:text-muted-foreground/60",
                "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40",
                "transition-all"
              )}
              onBlur={() => setSearchOpen(false)}
              onKeyDown={(e) => { if (e.key === 'Escape') setSearchOpen(false); }}
            />
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className={cn(
              "flex items-center gap-2 h-9 w-full px-3 rounded-lg text-sm",
              "bg-secondary/60 border border-border/40 text-muted-foreground/60",
              "hover:bg-secondary/80 hover:border-border/60 hover:text-muted-foreground",
              "transition-all cursor-pointer"
            )}
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1 text-left text-sm">Search...</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted/60 text-[10px] font-medium text-muted-foreground/70 border border-border/40">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-0.5">
        {/* Mobile search toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSearchOpen(!searchOpen)}
          className="md:hidden h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* Dark mode toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/notifications')}
          className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground relative"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />
          )}
        </Button>

        {/* Separator */}
        <div className="w-px h-5 bg-border/50 mx-1.5 hidden sm:block" />

        {/* User Avatar */}
        <Button
          variant="ghost"
          onClick={() => navigate('/profile')}
          className="h-9 rounded-lg px-2 gap-2 text-muted-foreground hover:text-foreground"
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium hidden md:inline text-foreground">
            {user?.firstName}
          </span>
        </Button>
      </div>
    </header>
  );
};

export default HeaderBar;
