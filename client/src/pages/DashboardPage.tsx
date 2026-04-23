import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Briefcase, FileText, Clock, Activity, ArrowRight, Loader2,
    TrendingUp, ChevronRight, Upload, Search, Users, BarChart3,
    Shield, CheckCircle2, AlertCircle
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
    ROLE_DASHBOARD_SUMMARIES
} from '../utils/formatters';
import { INGESTION_STAGES } from '../../../shared/constants';

const StatCard = ({
    icon: Icon,
    label,
    value,
    accent = false,
    warning = false,
    onClick,
}: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    accent?: boolean;
    warning?: boolean;
    onClick?: () => void;
}) => (
    <Card
        className={`group cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${
            accent
                ? 'bg-primary text-primary-foreground border-primary/20'
                : warning
                ? 'border-warning/30 bg-warning/5'
                : 'border-border'
        }`}
        onClick={onClick}
    >
        <CardContent className="p-5 flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${
                accent ? 'bg-white/10' : warning ? 'bg-warning/10' : 'bg-muted'
            }`}>
                <Icon className={`h-5 w-5 ${warning ? 'text-warning' : accent ? '' : 'text-muted-foreground'}`} />
            </div>
            <div className="min-w-0">
                <div className={`text-2xl font-bold tracking-tight ${
                    warning ? 'text-warning' : accent ? '' : 'text-foreground'
                }`}>
                    {typeof value === 'number' ? value.toLocaleString() : value}
                </div>
                <div className={`text-sm ${
                    accent ? 'text-primary-foreground/70' : 'text-muted-foreground'
                }`}>{label}</div>
            </div>
            <ChevronRight className={`ml-auto h-4 w-4 opacity-0 group-hover:opacity-60 transition-opacity ${
                accent ? '' : 'text-muted-foreground'
            }`} />
        </CardContent>
    </Card>
);

// Role-specific quick action cards
const QuickActionCard = ({ icon: Icon, title, description, label: _label, onClick, color = 'primary' }: {
    icon: React.ElementType; title: string; description: string;
    label: string; onClick: () => void; color?: string;
}) => (
    <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer" onClick={onClick}>
        <CardContent className="p-5 flex items-start gap-4">
            <div className={`p-2.5 rounded-xl bg-${color}/10 shrink-0`}>
                <Icon className={`h-5 w-5 text-${color}`} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5 group-hover:text-muted-foreground transition-colors" />
        </CardContent>
    </Card>
);

const DashboardPage = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { isAdmin, isPartner, isAssociate, isParalegal, hasFullAccess } = useRole();
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
                    dashboardService.getRecentActivity(8),
                    dashboardService.getOverview(),
                ]);
                setStats(statsData);
                const filteredActivity = activityData.filter((item) => !isSeededActivity(item));
                setActivity(filteredActivity);
                setOverview(overviewData);
            } catch (err) {
                // Dashboard stats are non-critical; show empty state
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
        ? {
            label: formatRoleLabel(normalizedRole),
            color: ROLE_BADGE_CLASSNAMES[normalizedRole] ?? 'bg-muted text-muted-foreground border-border'
        }
        : null;
    const roleSummary = normalizedRole
        ? ROLE_DASHBOARD_SUMMARIES[normalizedRole] ?? 'Review your assigned work and recent activity.'
        : 'Review your assigned work and recent activity.';

    // Role-specific quick actions
    const quickActions = [
        // All roles
        { icon: Briefcase, title: 'My Cases', description: 'View and manage your assigned cases.', label: 'Open Cases', onClick: () => navigate('/cases'), color: 'primary', show: true },
        // ADMIN + PARTNER
        { icon: BarChart3, title: 'Analytics', description: 'Review platform-wide metrics and trends.', label: 'View Analytics', onClick: () => navigate('/analytics'), color: 'purple', show: hasFullAccess },
        { icon: Shield, title: 'Audit Logs', description: 'Monitor all system activity and changes.', label: 'View Logs', onClick: () => navigate('/admin/audit-logs'), color: 'warning', show: hasFullAccess },
        // ADMIN only
        { icon: Users, title: 'User Management', description: 'Manage system users and permissions.', label: 'Manage Users', onClick: () => navigate('/admin/users'), color: 'destructive', show: isAdmin },
        // ASSOCIATE
        { icon: Search, title: 'Search Documents', description: 'Search and review documents across cases.', label: 'Search', onClick: () => navigate('/cases'), color: 'primary', show: isAssociate },
        { icon: CheckCircle2, title: 'Review Queue', description: 'Continue reviewing documents in your queue.', label: 'Review', onClick: () => navigate('/cases'), color: 'success', show: isAssociate },
        // PARALEGAL
        {
            icon: Upload,
            title: 'Upload Documents',
            description: `Upload files to start ${INGESTION_STAGES.PROCESS.toLowerCase()} and ${INGESTION_STAGES.INGEST.toLowerCase()}.`,
            label: 'Upload',
            onClick: () => navigate('/cases'),
            color: 'success',
            show: isParalegal
        },
        { icon: Users, title: 'Custodians', description: 'Manage document custodians for your cases.', label: 'Manage', onClick: () => navigate('/cases'), color: 'primary', show: isParalegal },
    ].filter(a => a.show);

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            {greeting()}, {user?.firstName}
                        </h1>
                        {roleMeta && (
                            <Badge variant="outline" className={`text-xs font-medium ${roleMeta.color}`}>
                                {roleMeta.label}
                            </Badge>
                        )}
                    </div>
                    <p className="text-muted-foreground text-sm mt-0.5">
                        {roleSummary}
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/cases')} className="hidden sm:flex gap-1.5">
                    <Briefcase className="h-3.5 w-3.5" />
                    View All Cases
                </Button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : (
                <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
                    {/* Stat Cards — role-aware */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <motion.div variants={itemVariants}>
                            <StatCard icon={Briefcase} label="Active Cases" value={stats?.activeCases ?? 0} accent onClick={() => navigate('/cases')} />
                        </motion.div>
                        <motion.div variants={itemVariants}>
                            <StatCard icon={FileText} label="Total Documents" value={stats?.totalDocuments ?? 0} onClick={() => navigate('/cases')} />
                        </motion.div>
                        <motion.div variants={itemVariants}>
                            <StatCard icon={Clock} label="Pending Review" value={stats?.pendingReview ?? 0} warning onClick={() => navigate('/cases')} />
                        </motion.div>
                    </div>

                    {/* Role-specific Quick Actions */}
                    {quickActions.length > 0 && (
                        <motion.div variants={itemVariants}>
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {quickActions.map((action) => (
                                    <QuickActionCard key={action.title} {...action} />
                                ))}
                            </div>
                        </motion.div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {/* Cases Overview */}
                        <motion.div variants={itemVariants} className="lg:col-span-2">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div>
                                        <CardTitle className="text-base">Cases Overview</CardTitle>
                                        <CardDescription className="text-xs">Review progress across active cases</CardDescription>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => navigate('/cases')} className="gap-1 text-xs">
                                        All Cases <ArrowRight className="h-3 w-3" />
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    {overview.length === 0 ? (
                                        <div className="text-center py-10">
                                            <Briefcase className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                                            <p className="text-sm text-muted-foreground">No active cases assigned.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            {overview.slice(0, 5).map(c => (
                                                <button
                                                    key={c._id}
                                                    className="w-full flex items-center gap-4 hover:bg-muted/50 p-2.5 rounded-lg transition-colors text-left"
                                                    onClick={() => navigate(`/cases/${c._id}`)}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-foreground truncate">{c.caseName}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {c.reviewedDocuments} / {c.totalDocuments} reviewed
                                                        </p>
                                                    </div>
                                                    <div className="w-28 shrink-0">
                                                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                                                            <span>{c.progress}%</span>
                                                        </div>
                                                        <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                                                            <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${c.progress}%` }} />
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Recent Activity */}
                        <motion.div variants={itemVariants}>
                            <Card className="h-full">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Activity className="h-4 w-4 text-muted-foreground" /> Recent Activity
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {activity.length === 0 ? (
                                        <div className="text-center py-10">
                                            <TrendingUp className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                                            <p className="text-sm text-muted-foreground">No recent activity.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-0.5">
                                            {activity.map((item, idx) => (
                                                <div key={idx} className="flex gap-3 items-start p-2 rounded-lg hover:bg-muted/30 transition-colors">
                                                    <div className="bg-primary/8 p-1.5 rounded-lg mt-0.5 shrink-0">
                                                        <FileText className="h-3 w-3 text-primary" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">{item.description}</p>
                                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                                            {new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>

                    {/* Admin-only: system alert banner */}
                    {isAdmin && (
                        <motion.div variants={itemVariants}>
                            <Card className="border-warning/30 bg-warning/5">
                                <CardContent className="p-4 flex items-center gap-3">
                                    <AlertCircle className="h-4 w-4 text-warning shrink-0" />
                                    <p className="text-sm text-foreground">
                                        You have admin access. Visit{' '}
                                        <button onClick={() => navigate('/admin/users')} className="text-primary underline font-medium">User Management</button>
                                        {' '}or{' '}
                                        <button onClick={() => navigate('/admin/audit-logs')} className="text-primary underline font-medium">Audit Logs</button>
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
