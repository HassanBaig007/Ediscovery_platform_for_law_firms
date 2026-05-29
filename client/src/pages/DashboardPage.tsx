import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Briefcase, FileText, Clock, Activity, ArrowRight, Loader2,
    TrendingUp, ChevronRight, Upload, Search, Users, BarChart3,
    Shield, CheckCircle2, AlertCircle, Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAuthStore } from '../store/authStore';
import { useRole } from '../hooks/useRole';
import { dashboardService, DashboardStats, ActivityItem, CaseOverview } from '../services/dashboard.service';
import {
    formatUserRole as formatRoleLabel,
    ROLE_BADGE_CLASSNAMES,
    ROLE_DASHBOARD_SUMMARIES,
} from '../utils/formatters';
import { INGESTION_STAGES } from '../../../shared/constants';

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({
    icon: Icon, label, value, variant = 'default', onClick,
}: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    variant?: 'default' | 'accent' | 'warning' | 'success';
    onClick?: () => void;
}) => {
    const styles = {
        default: {
            card: 'border-border bg-card hover:border-primary/30',
            iconWrap: 'bg-muted',
            icon: 'text-muted-foreground',
            value: 'text-foreground',
            label: 'text-muted-foreground',
        },
        accent: {
            card: 'border-primary/20 bg-primary text-primary-foreground',
            iconWrap: 'bg-white/15',
            icon: 'text-white',
            value: 'text-white',
            label: 'text-primary-foreground/70',
        },
        warning: {
            card: 'border-amber-400/30 bg-amber-50 dark:bg-amber-950/20',
            iconWrap: 'bg-amber-100 dark:bg-amber-900/40',
            icon: 'text-amber-600 dark:text-amber-400',
            value: 'text-amber-700 dark:text-amber-300',
            label: 'text-amber-600/80 dark:text-amber-400/80',
        },
        success: {
            card: 'border-emerald-400/30 bg-emerald-50 dark:bg-emerald-950/20',
            iconWrap: 'bg-emerald-100 dark:bg-emerald-900/40',
            icon: 'text-emerald-600 dark:text-emerald-400',
            value: 'text-emerald-700 dark:text-emerald-300',
            label: 'text-emerald-600/80 dark:text-emerald-400/80',
        },
    };
    const s = styles[variant];
    return (
        <Card
            className={`group cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${s.card}`}
            onClick={onClick}
        >
            <CardContent className="p-5 flex items-center gap-4">
                <div className={`p-2.5 rounded-xl shrink-0 ${s.iconWrap}`}>
                    <Icon className={`h-5 w-5 ${s.icon}`} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className={`text-2xl font-bold tracking-tight leading-none ${s.value}`}>
                        {typeof value === 'number' ? value.toLocaleString() : value}
                    </div>
                    <div className={`text-xs font-medium mt-1 ${s.label}`}>{label}</div>
                </div>
                <ChevronRight className={`h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity shrink-0 ${s.icon}`} />
            </CardContent>
        </Card>
    );
};

// ── Quick Action Card ─────────────────────────────────────────────────────────
const colorMap: Record<string, { wrap: string; icon: string }> = {
    primary:     { wrap: 'bg-primary/10',     icon: 'text-primary' },
    purple:      { wrap: 'bg-violet-500/10',  icon: 'text-violet-600 dark:text-violet-400' },
    warning:     { wrap: 'bg-amber-500/10',   icon: 'text-amber-600 dark:text-amber-400' },
    destructive: { wrap: 'bg-red-500/10',     icon: 'text-red-600 dark:text-red-400' },
    success:     { wrap: 'bg-emerald-500/10', icon: 'text-emerald-600 dark:text-emerald-400' },
};

const QuickActionCard = ({ icon: Icon, title, description, onClick, color = 'primary' }: {
    icon: React.ElementType; title: string; description: string;
    label: string; onClick: () => void; color?: string;
}) => {
    const c = colorMap[color] ?? colorMap.primary;
    return (
        <Card
            className="group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer border-border/60"
            onClick={onClick}
        >
            <CardContent className="p-4 flex items-start gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${c.wrap}`}>
                    <Icon className={`h-4 w-4 ${c.icon}`} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground leading-snug">{title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0 mt-0.5 group-hover:text-muted-foreground transition-colors" />
            </CardContent>
        </Card>
    );
};

// ── Page ──────────────────────────────────────────────────────────────────────
const DashboardPage = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { isAdmin, isAssociate, isParalegal, hasFullAccess } = useRole();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const [overview, setOverview] = useState<CaseOverview[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const seededDocPattern = /(Q3_Financial_Report|Patent_Application_Draft|Engineering_Specs|Board_Meeting_Minutes|Non-Disclosure_Agreement|Source_Code_Review|Email_Thread_-_Product_Launch|Budget_Projections|API_Documentation|Legal_Memo_-_IP_Rights|Trade_Secret_Policy|Licensing_Agreement|R&D_Roadmap|Employment_Contract|IP_Assignment_Agreement|Technical_Architecture|Competitive_Analysis|Marketing_Strategy|Settlement_Discussion_Notes|Software_License_Terms)_v\d+\./i;
    const isSeededActivity = (item: ActivityItem) => {
        if (seededDocPattern.test(item.description)) return true;
        if (item.caseName && /TechCorp v\.? InnovateLLC/i.test(item.caseName)) return true;
        return false;
    };

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const [statsData, activityData, overviewData] = await Promise.all([
                    dashboardService.getStats(),
                    dashboardService.getRecentActivity(20),
                    dashboardService.getOverview(),
                ]);
                setStats(statsData);
                setActivity(activityData.filter(item => !isSeededActivity(item)));
                setOverview(overviewData);
            } catch {
                setStats(null);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
    };
    const itemVariants = {
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
    };

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    };

    const normalizedRole = user?.role?.toUpperCase() ?? '';
    const roleMeta = normalizedRole
        ? { label: formatRoleLabel(normalizedRole), color: ROLE_BADGE_CLASSNAMES[normalizedRole] ?? 'bg-muted text-muted-foreground border-border' }
        : null;
    const roleSummary = normalizedRole
        ? ROLE_DASHBOARD_SUMMARIES[normalizedRole] ?? 'Review your assigned work and recent activity.'
        : 'Review your assigned work and recent activity.';

    const quickActions = [
        { icon: Briefcase,    title: 'My Cases',          description: 'View and manage your assigned cases.',                                                                                  label: 'Open Cases',    onClick: () => navigate('/cases'),             color: 'primary',     show: true },
        { icon: BarChart3,    title: 'Analytics',          description: 'Review platform-wide metrics and trends.',                                                                              label: 'View Analytics',onClick: () => navigate('/analytics'),         color: 'purple',      show: hasFullAccess },
        { icon: Shield,       title: 'Audit Logs',         description: 'Monitor all system activity and changes.',                                                                              label: 'View Logs',     onClick: () => navigate('/admin/audit-logs'),  color: 'warning',     show: hasFullAccess },
        { icon: Users,        title: 'User Management',    description: 'Manage system users and permissions.',                                                                                  label: 'Manage Users',  onClick: () => navigate('/admin/users'),       color: 'destructive', show: isAdmin },
        { icon: Search,       title: 'Search Documents',   description: 'Search and review documents across cases.',                                                                             label: 'Search',        onClick: () => navigate('/cases'),             color: 'primary',     show: isAssociate },
        { icon: CheckCircle2, title: 'Review Queue',       description: 'Continue reviewing documents in your queue.',                                                                           label: 'Review',        onClick: () => navigate('/cases'),             color: 'success',     show: isAssociate },
        { icon: Upload,       title: 'Upload Documents',   description: `Upload files to start ${INGESTION_STAGES.PROCESS.toLowerCase()} and ${INGESTION_STAGES.INGEST.toLowerCase()}.`,        label: 'Upload',        onClick: () => navigate('/cases'),             color: 'success',     show: isParalegal },
        { icon: Users,        title: 'Custodians',         description: 'Manage document custodians for your cases.',                                                                            label: 'Manage',        onClick: () => navigate('/cases'),             color: 'primary',     show: isParalegal },
    ].filter(a => a.show);

    // Activity action colour dot
    const activityDot = (desc: string) => {
        const d = desc.toLowerCase();
        if (d.includes('upload')) return 'bg-emerald-500';
        if (d.includes('update') || d.includes('edit') || d.includes('code')) return 'bg-blue-500';
        if (d.includes('delete') || d.includes('remove')) return 'bg-red-500';
        if (d.includes('view') || d.includes('download')) return 'bg-violet-500';
        if (d.includes('login') || d.includes('logout')) return 'bg-orange-500';
        return 'bg-primary';
    };

    return (
        <div className="space-y-6 pb-10">
            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            {greeting()}, {user?.firstName}
                        </h1>
                        {roleMeta && (
                            <Badge variant="outline" className={`text-xs font-semibold ${roleMeta.color}`}>
                                {roleMeta.label}
                            </Badge>
                        )}
                    </div>
                    <p className="text-muted-foreground text-sm mt-0.5">{roleSummary}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/cases')} className="hidden sm:flex gap-1.5 shrink-0">
                    <Briefcase className="h-3.5 w-3.5" /> View All Cases
                </Button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : (
                <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">

                    {/* ── Stat Cards ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <motion.div variants={itemVariants}>
                            <StatCard icon={Briefcase}  label="Active Cases"    value={stats?.activeCases ?? 0}    variant="accent"   onClick={() => navigate('/cases')} />
                        </motion.div>
                        <motion.div variants={itemVariants}>
                            <StatCard icon={FileText}   label="Total Documents" value={stats?.totalDocuments ?? 0} variant="default"  onClick={() => navigate('/cases')} />
                        </motion.div>
                        <motion.div variants={itemVariants}>
                            <StatCard icon={Clock}      label="Pending Review"  value={stats?.pendingReview ?? 0}  variant="warning"  onClick={() => navigate('/cases')} />
                        </motion.div>
                    </div>

                    {/* ── Quick Actions ── */}
                    {quickActions.length > 0 && (
                        <motion.div variants={itemVariants}>
                            <div className="flex items-center gap-2 mb-3">
                                <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Quick Actions</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {quickActions.map(action => (
                                    <QuickActionCard key={action.title} {...action} />
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* ── Cases Overview + Recent Activity ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

                        {/* Cases Overview */}
                        <motion.div variants={itemVariants} className="lg:col-span-2">
                            <Card className="border border-border/60 shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
                                    <div>
                                        <CardTitle className="text-base font-semibold">Cases Overview</CardTitle>
                                        <CardDescription className="text-xs mt-0.5">Review progress across active cases</CardDescription>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => navigate('/cases')} className="gap-1 text-xs text-primary">
                                        All Cases <ArrowRight className="h-3 w-3" />
                                    </Button>
                                </CardHeader>
                                <CardContent className="pt-3 pb-2">
                                    {overview.length === 0 ? (
                                        <div className="text-center py-10">
                                            <Briefcase className="h-8 w-8 text-muted-foreground/25 mx-auto mb-2" />
                                            <p className="text-sm font-medium text-foreground">No active cases</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">No cases have been assigned to you yet.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            {overview.slice(0, 5).map(c => (
                                                <button
                                                    key={c._id}
                                                    className="w-full flex items-center gap-4 hover:bg-muted/50 px-2.5 py-2.5 rounded-lg transition-colors text-left group"
                                                    onClick={() => navigate(`/cases/${c._id}`)}
                                                >
                                                    {/* Colour dot */}
                                                    <div className="h-2 w-2 rounded-full bg-primary shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-foreground truncate">{c.caseName}</p>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            <span className="font-semibold text-foreground">{c.reviewedDocuments}</span>
                                                            <span className="text-muted-foreground"> / {c.totalDocuments} reviewed</span>
                                                        </p>
                                                    </div>
                                                    <div className="w-28 shrink-0">
                                                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                                                            <span className="font-semibold text-foreground">{c.progress}%</span>
                                                        </div>
                                                        <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full transition-all duration-500"
                                                                style={{
                                                                    width: `${c.progress}%`,
                                                                    background: c.progress >= 80
                                                                        ? 'hsl(var(--success, 142 71% 45%))'
                                                                        : c.progress >= 40
                                                                        ? 'hsl(var(--primary))'
                                                                        : 'hsl(var(--warning, 38 92% 50%))',
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0 group-hover:text-muted-foreground transition-colors" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Recent Activity — same height as Cases Overview, inner scroll */}
                        <motion.div variants={itemVariants}>
                            <Card className="border border-border/60 shadow-sm flex flex-col" style={{ maxHeight: '320px' }}>
                                <CardHeader className="pb-3 border-b border-border/60 shrink-0">
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        <Activity className="h-4 w-4 text-muted-foreground" />
                                        Recent Activity
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-y-auto pt-2 pb-2 min-h-0 scrollbar-thin">
                                    {activity.length === 0 ? (
                                        <div className="text-center py-8">
                                            <TrendingUp className="h-7 w-7 text-muted-foreground/25 mx-auto mb-2" />
                                            <p className="text-sm font-medium text-foreground">No recent activity</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">Actions will appear here.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-0.5">
                                            {activity.map((item, idx) => (
                                                <div key={idx} className="flex gap-2.5 items-start px-1 py-2 rounded-lg hover:bg-muted/30 transition-colors">
                                                    {/* Coloured dot */}
                                                    <div className="mt-1.5 shrink-0">
                                                        <span className={`block h-2 w-2 rounded-full ${activityDot(item.description)}`} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">{item.description}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            {item.caseName && (
                                                                <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">{item.caseName}</span>
                                                            )}
                                                            <span className="text-[10px] text-muted-foreground/60 shrink-0">
                                                                {new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>

                    {/* ── Admin alert ── */}
                    {isAdmin && (
                        <motion.div variants={itemVariants}>
                            <Card className="border-amber-400/30 bg-amber-50 dark:bg-amber-950/20">
                                <CardContent className="p-4 flex items-center gap-3">
                                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                    <p className="text-sm text-foreground">
                                        You have admin access. Visit{' '}
                                        <button onClick={() => navigate('/admin/users')} className="text-primary underline font-semibold">User Management</button>
                                        {' '}or{' '}
                                        <button onClick={() => navigate('/admin/audit-logs')} className="text-primary underline font-semibold">Audit Logs</button>
                                        {' '}to manage the platform.
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                </motion.div>
            )}
        </div>
    );
};

export default DashboardPage;
