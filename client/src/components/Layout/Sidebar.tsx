import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  BarChart3,
  Bell,
  User,
  Users,
  Shield,
  Scale,
    Home,
    Settings,
    Plug,
    KeyRound,
    Receipt
} from 'lucide-react';

import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
import { useAuthStore } from '../../store/authStore';
import { useRole } from '../../hooks/useRole';

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

const Sidebar = ({ mobileOpen, onClose }: SidebarProps) => {
    const [collapsed, setCollapsed] = useState(false);
    const logout = useAuthStore((state) => state.logout);
    const { isAdmin, isPartner, isAssociate, isParalegal } = useRole();
    const location = useLocation();

    const toggleSidebar = (): void => setCollapsed(!collapsed);

    const navItems = [
        { icon: Home, label: 'Dashboard', path: '/dashboard', roles: ['ALL'] },
        { icon: LayoutDashboard, label: 'Cases', path: '/cases', roles: ['ALL'] },
        { icon: BarChart3, label: 'Analytics', path: '/analytics', roles: ['ADMIN', 'PARTNER'] },
        { icon: BarChart3, label: 'Team Performance', path: '/team-performance', roles: ['ADMIN', 'PARTNER'] },
        { icon: Users, label: 'Client Portal', path: '/client-portal', roles: ['ADMIN', 'PARTNER'] },
        { icon: Receipt, label: 'Billing', path: '/billing', roles: ['ADMIN', 'PARTNER'] },
        { icon: LayoutDashboard, label: 'My Review Queue', path: '/review-queue', roles: ['ASSOCIATE'] },
        { icon: BarChart3, label: 'Review Statistics', path: '/review-statistics', roles: ['ASSOCIATE'] },
        { icon: Shield, label: 'Privilege Log', path: '/privilege-log', roles: ['ASSOCIATE'] },
        { icon: Bell, label: 'Notifications', path: '/notifications', roles: ['ALL'] },
    ];

    // Filter navigation items based on user role
    const filteredNavItems = navItems.filter(item => {
        if (item.roles.includes('ALL')) return true;
        if (item.roles.includes('ADMIN') && isAdmin) return true;
        if (item.roles.includes('PARTNER') && isPartner) return true;
        if (item.roles.includes('ASSOCIATE') && isAssociate) return true;
        if (item.roles.includes('PARALEGAL') && isParalegal) return true;
        return false;
    });

    const isActive = (path: string): boolean => {
      if (path === '/dashboard') return location.pathname === '/dashboard';
      return location.pathname === path || location.pathname.startsWith(path + '/');
    };

    const handleNavClick = () => {
      // Close mobile drawer on navigation
      if (mobileOpen && onClose) onClose();
    };

    const renderNavItem = (item: typeof navItems[0]) => {
        const navContent = (
            <NavLink
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative",
                    isActive(item.path)
                        ? "bg-sidebar-accent/12 text-white"
                        : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-white/[0.06]",
                    collapsed && !mobileOpen && "justify-center px-2.5"
                )}
                aria-current={isActive(item.path) ? 'page' : undefined}
            >
                {/* Active pill indicator */}
                {isActive(item.path) && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-accent" />
                )}
                <item.icon className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors",
                    isActive(item.path) ? "text-sidebar-accent" : "text-sidebar-muted group-hover:text-sidebar-foreground"
                )} />
                {(!collapsed || mobileOpen) && (
                    <span className="truncate">{item.label}</span>
                )}
            </NavLink>
        );

        // Wrap in tooltip when collapsed on desktop
        if (collapsed && !mobileOpen) {
            return (
                <Tooltip key={item.path} content={item.label} side="right">
                    {navContent}
                </Tooltip>
            );
        }

        return navContent;
    };

    const sidebarContent = (
        <>
            {/* Header / Logo */}
            <div className={cn(
                "h-14 flex items-center shrink-0 border-b border-[hsl(var(--sidebar-border))]",
                collapsed && !mobileOpen ? "justify-center px-2" : "justify-between px-4"
            )}>
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 shadow-glow-primary">
                        <Scale className="w-4 h-4 text-white" />
                    </div>
                    {(!collapsed || mobileOpen) && (
                        <div className="flex flex-col min-w-0">
                            <span className="font-bold text-sm tracking-tight text-sidebar-foreground truncate">
                                eDiscovery
                            </span>
                            <span className="text-xs text-sidebar-muted leading-none">Legal Platform</span>
                        </div>
                    )}
                </div>
                {(!collapsed || mobileOpen) && !mobileOpen && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleSidebar}
                        aria-expanded={!collapsed}
                        aria-label="Collapse sidebar"
                        className="h-7 w-7 text-sidebar-muted hover:text-sidebar-foreground hover:bg-white/[0.06] rounded-lg"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* Expand button when collapsed */}
            {collapsed && !mobileOpen && (
                <div className="flex justify-center py-2 border-b border-[hsl(var(--sidebar-border))]">
                    <Tooltip content="Expand sidebar" side="right">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleSidebar}
                            aria-expanded={false}
                            aria-label="Expand sidebar"
                            className="h-7 w-7 text-sidebar-muted hover:text-sidebar-foreground hover:bg-white/[0.06] rounded-lg"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </Tooltip>
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto" aria-label="Primary">
                {filteredNavItems.map(renderNavItem)}

                {/* Admin Section */}
                {(isAdmin || isPartner) && (
                    <div className="mt-6 pt-4 border-t border-[hsl(var(--sidebar-border))]">
                        {(!collapsed || mobileOpen) && (
                            <p className="px-3 mb-2 text-xs font-semibold text-sidebar-muted uppercase tracking-[0.08em]">
                                Admin
                            </p>
                        )}
                        {/* Audit Logs: ADMIN + PARTNER */}
                        {renderNavItem({ icon: Shield, label: 'Audit Logs', path: '/admin/audit-logs', roles: ['ADMIN', 'PARTNER'] })}
                        {/* User Management: ADMIN only */}
                        {isAdmin && renderNavItem({ icon: Users, label: 'User Management', path: '/admin/users', roles: ['ADMIN'] })}
                        {isAdmin && renderNavItem({ icon: Settings, label: 'System Settings', path: '/admin/settings', roles: ['ADMIN'] })}
                        {isAdmin && renderNavItem({ icon: Plug, label: 'Integrations', path: '/admin/integrations', roles: ['ADMIN'] })}
                        {isAdmin && renderNavItem({ icon: KeyRound, label: 'Licenses', path: '/admin/licenses', roles: ['ADMIN'] })}
                    </div>
                )}
            </nav>

            {/* Footer / User */}
            <div className="p-3 border-t border-[hsl(var(--sidebar-border))] space-y-1">
                {collapsed && !mobileOpen ? (
                    <Tooltip content="Profile" side="right">
                        <NavLink
                            to="/profile"
                            onClick={handleNavClick}
                            className={cn(
                                "group flex items-center justify-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                                isActive('/profile')
                                    ? "bg-sidebar-accent/12 text-white"
                                    : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-white/[0.06]"
                            )}
                        >
                            <User className={cn(
                                "h-[18px] w-[18px] shrink-0",
                                isActive('/profile') ? "text-sidebar-accent" : "text-sidebar-muted group-hover:text-sidebar-foreground"
                            )} />
                        </NavLink>
                    </Tooltip>
                ) : (
                    <NavLink
                        to="/profile"
                        onClick={handleNavClick}
                        className={cn(
                            "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                            isActive('/profile')
                                ? "bg-sidebar-accent/12 text-white"
                                : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-white/[0.06]"
                        )}
                    >
                        <User className={cn(
                            "h-[18px] w-[18px] shrink-0",
                            isActive('/profile') ? "text-sidebar-accent" : "text-sidebar-muted group-hover:text-sidebar-foreground"
                        )} />
                        <span className="truncate">Profile</span>
                    </NavLink>
                )}
                
                {collapsed && !mobileOpen ? (
                    <Tooltip content="Logout" side="right">
                        <Button
                            variant="ghost"
                            onClick={() => { logout(); handleNavClick(); }}
                            className="w-full justify-center px-2.5 py-2.5 rounded-xl text-sm font-medium text-sidebar-muted hover:text-red-400 hover:bg-red-500/10"
                            aria-label="Log out"
                        >
                            <LogOut className="h-[18px] w-[18px] shrink-0" />
                        </Button>
                    </Tooltip>
                ) : (
                    <Button
                        variant="ghost"
                        onClick={() => { logout(); handleNavClick(); }}
                        className={cn(
                            "w-full gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                            "text-sidebar-muted hover:text-red-400 hover:bg-red-500/10",
                            "justify-start"
                        )}
                        aria-label="Log out"
                    >
                        <LogOut className="h-[18px] w-[18px] shrink-0" />
                        <span>Logout</span>
                    </Button>
                )}
            </div>
        </>
    );

    // Mobile drawer overlay
    if (mobileOpen) {
        return (
            <>
                {/* Backdrop */}
                <div 
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden animate-fade-in"
                    onClick={onClose}
                    aria-hidden="true"
                />
                {/* Mobile sidebar */}
                <nav
                    className={cn(
                        "fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col lg:hidden",
                        "bg-[hsl(var(--sidebar-bg))] text-[hsl(var(--sidebar-fg))]",
                        "border-r border-[hsl(var(--sidebar-border))]",
                        "animate-slide-in-left"
                    )}
                    aria-label="Main navigation"
                >
                    {sidebarContent}
                </nav>
            </>
        );
    }

    // Desktop sidebar
    return (
        <nav
            className={cn(
                "h-screen hidden lg:flex flex-col shrink-0 transition-[width] duration-300 ease-spring relative",
                "bg-[hsl(var(--sidebar-bg))] text-[hsl(var(--sidebar-fg))]",
                "border-r border-[hsl(var(--sidebar-border))]",
                collapsed ? "w-[68px]" : "w-[260px]"
            )}
            aria-label="Main navigation"
        >
            {sidebarContent}
        </nav>
    );
};

export default Sidebar;
