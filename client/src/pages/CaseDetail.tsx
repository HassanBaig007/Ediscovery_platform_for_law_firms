import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCaseStore } from '../store/caseStore';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/Dialog';
import {
    ArrowLeft, Search, FileText, Settings,
    Clock, Database, Upload, BarChart3, Activity,
    Plus, CheckCircle2, Loader2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '../components/ui/Skeleton';
import api from '../services/api';
import { useRole } from '../hooks/useRole';
import PermissionDenied from '../components/ui/PermissionDenied';
import { formatCaseRoleLabel } from '../lib/content';

interface CaseAnalytics {
    totalDocuments: number;
    reviewedDocuments: number;
    pendingDocuments: number;
    reviewProgress: number;
}

interface AvailableUser {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
}

interface ActivityItem {
    type: string;
    description: string;
    timestamp: string;
    caseName?: string;
}

const CaseDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { currentCase, fetchCaseById, isLoading, error } = useCaseStore();
    const { hasFullAccess, getCaseRole } = useRole();

    const [analytics, setAnalytics] = useState<CaseAnalytics | null>(null);
    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
    const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedTeamRole, setSelectedTeamRole] = useState('REVIEWER');
    const [isAddingMember, setIsAddingMember] = useState(false);

    const caseRole = getCaseRole(currentCase);
    const canManageCase = hasFullAccess || caseRole === 'LEAD';
    const canUploadToCase = canManageCase || caseRole === 'PARALEGAL';
    const canReviewCase = canManageCase || caseRole === 'REVIEWER';
    const canManageTeam = canManageCase;

    useEffect(() => {
        if (id) fetchCaseById(id);
    }, [id, fetchCaseById]);

    const fetchAnalytics = useCallback(async () => {
        if (!id) return;
        try {
            const [analyticsRes, activityRes] = await Promise.all([
                api.get(`/cases/${id}/analytics`),
                api.get('/dashboard/activity?limit=5'),
            ]);
            setAnalytics(analyticsRes.data);
            setRecentActivity(activityRes.data || []);
        } catch {
            // Non-critical — silently degrade to showing zeros
        }
    }, [id]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    const openAddMember = async () => {
        if (!id || !canManageTeam) return;
        try {
            const res = await api.get(`/cases/${id}/available-users`);
            setAvailableUsers(res.data || []);
        } catch {
            setAvailableUsers([]);
        }
        setIsAddMemberOpen(true);
    };

    const handleAddMember = async () => {
        if (!id || !selectedUserId) return;
        setIsAddingMember(true);
        try {
            await api.post(`/cases/${id}/team`, { userId: selectedUserId, role: selectedTeamRole });
            setIsAddMemberOpen(false);
            setSelectedUserId('');
            fetchCaseById(id);
        } catch (err) {
            console.error('Failed to add team member', err);
        } finally {
            setIsAddingMember(false);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-5">
                <Skeleton className="h-8 w-52" />
                <Skeleton className="h-5 w-80" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Skeleton className="h-56" />
                    <Skeleton className="h-56 md:col-span-2" />
                </div>
            </div>
        );
    }

    if (!currentCase) {
        if (error?.toLowerCase().includes('not authorized')) {
            return <PermissionDenied requiredRole="Case team member, PARTNER, or ADMIN" />;
        }

        return (
            <Card>
                <CardHeader>
                    <CardTitle>Unable to load case</CardTitle>
                    <CardDescription>
                        {error || 'The requested case could not be loaded.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => navigate('/cases')}>Back to Cases</Button>
                </CardContent>
            </Card>
        );
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
    };
    const itemVariants = {
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
    };

    return (
        <div className="space-y-5 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/cases')} className="-ml-1 h-8 w-8" aria-label="Go back">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">{currentCase.caseName}</h1>
                            <StatusBadge status={currentCase.status} size="md" />
                        </div>
                        <p className="text-muted-foreground text-sm mt-0.5">
                            {currentCase.clientName} &middot; {currentCase.caseNumber}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {canManageCase && (
                        <Button variant="outline" size="sm" onClick={() => navigate(`/cases/${id}/settings`)} className="gap-1.5">
                            <Settings className="h-3.5 w-3.5" /> Settings
                        </Button>
                    )}
                    {canUploadToCase && (
                        <Button size="sm" onClick={() => navigate(`/cases/${id}/upload`)} className="gap-1.5">
                            <Upload className="h-3.5 w-3.5" /> Ingest Data
                        </Button>
                    )}
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-5">
                <TabsList className="bg-muted/60 p-1 border border-border/50">
                    <TabsTrigger value="overview" className="px-5 text-sm">Overview</TabsTrigger>
                    <TabsTrigger value="documents" className="px-5 text-sm">Documents</TabsTrigger>
                    <TabsTrigger value="team" className="px-5 text-sm">Team</TabsTrigger>
                    <TabsTrigger value="activity" className="px-5 text-sm">Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {/* Quick Action */}
                        <motion.div variants={itemVariants}>
                            <Card className="bg-primary text-primary-foreground border-primary/20 h-full flex flex-col">
                                <CardHeader className="pb-3">
                                    <div className="p-2 bg-white/10 rounded-lg w-fit mb-1.5">
                                        <Search className="h-5 w-5" />
                                    </div>
                                    <CardTitle className="text-lg">Discover Evidence</CardTitle>
                                    <CardDescription className="text-primary-foreground/60 text-sm">
                                        Search and analyze documents across the case repository.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="mt-auto pt-0">
                                    {canReviewCase ? (
                                        <Button
                                            variant="secondary"
                                            className="w-full justify-between font-semibold"
                                            size="sm"
                                            onClick={() => navigate(`/cases/${id}/search`)}
                                        >
                                            Launch Search <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                                        </Button>
                                    ) : (
                                        <p className="text-xs text-primary-foreground/70">Search access requires reviewer privileges.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Review Analytics */}
                        <motion.div variants={itemVariants} className="md:col-span-2">
                            <Card className="h-full">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div className="space-y-0.5">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <BarChart3 className="h-4 w-4 text-primary" /> Review Analytics
                                        </CardTitle>
                                        <CardDescription className="text-xs">Document review progress</CardDescription>
                                    </div>
                                    {canReviewCase && (
                                        <Button variant="ghost" size="sm" className="text-xs text-primary font-medium gap-1" onClick={() => navigate(`/cases/${id}/review`)}>
                                            Continue Review <ArrowLeft className="h-3 w-3 rotate-180" />
                                        </Button>
                                    )}
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-3 gap-3 mb-5">
                                        <div className="p-3 bg-success/8 rounded-xl border border-success/15 text-center">
                                            <div className="text-[10px] font-semibold text-success uppercase tracking-wider mb-0.5">Reviewed</div>
                                            <div className="text-2xl font-bold text-success">{analytics ? `${analytics.reviewProgress}%` : '—'}</div>
                                        </div>
                                        <div className="p-3 bg-warning/8 rounded-xl border border-warning/15 text-center">
                                            <div className="text-[10px] font-semibold text-warning uppercase tracking-wider mb-0.5">Pending</div>
                                            <div className="text-2xl font-bold text-warning">{analytics ? analytics.pendingDocuments.toLocaleString() : '—'}</div>
                                        </div>
                                        <div className="p-3 bg-muted rounded-xl border border-border text-center">
                                            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Total</div>
                                            <div className="text-2xl font-bold text-foreground">{analytics ? analytics.totalDocuments.toLocaleString() : '—'}</div>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Overall Completion</span>
                                            <span className="font-medium text-foreground">{analytics ? `${analytics.reviewProgress}%` : '—'}</span>
                                        </div>
                                        <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                                            <div
                                                className="bg-success h-full rounded-full transition-all duration-500"
                                                style={{ width: `${analytics?.reviewProgress ?? 0}%` }}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Repository Info */}
                        <motion.div variants={itemVariants}>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Database className="h-3.5 w-3.5 text-muted-foreground" /> Repository Info
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Storage</span>
                                        <span className="font-medium text-foreground">Local FS</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Documents</span>
                                        <span className="font-medium text-foreground">{analytics ? analytics.totalDocuments.toLocaleString() : '—'}</span>
                                    </div>
                                    <div className="pt-2.5 border-t border-border">
                                        <div className="flex items-center gap-1.5 text-xs text-success font-medium">
                                            <CheckCircle2 className="h-3 w-3" /> All systems operational
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Recent Activity */}
                        <motion.div variants={itemVariants} className="md:col-span-2">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Activity className="h-3.5 w-3.5 text-muted-foreground" /> Recent Activity
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-1">
                                        {recentActivity.length > 0 ? recentActivity.map((item, idx) => (
                                            <div key={idx} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                                                <div className="bg-primary/8 p-1.5 rounded-lg mt-0.5 shrink-0">
                                                    <Clock className="h-3 w-3 text-primary" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">{item.description}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {item.caseName && <span className="text-[10px] text-muted-foreground">{item.caseName}</span>}
                                                        <span className="text-[10px] text-muted-foreground/60">
                                                            {new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )) : (
                                            <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </motion.div>
                </TabsContent>

                <TabsContent value="documents">
                    <Card className="p-10 text-center border-dashed border-2 border-border/60">
                        <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                        <h3 className="text-base font-semibold text-foreground">Document Management</h3>
                        <p className="text-muted-foreground text-sm mb-4">View and manage the case repository folder structure.</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {canReviewCase && (
                                <Button size="sm" onClick={() => navigate(`/cases/${id}/search`)}>Open Data Grid</Button>
                            )}
                            {canUploadToCase && (
                                <Button variant="outline" size="sm" onClick={() => navigate(`/cases/${id}/processing-status`)}>
                                    Processing Status
                                </Button>
                            )}
                            {canUploadToCase && (
                                <Button variant="outline" size="sm" onClick={() => navigate(`/cases/${id}/chain-of-custody`)}>
                                    Chain of Custody
                                </Button>
                            )}
                            {canManageCase && (
                                <Button variant="outline" size="sm" onClick={() => navigate(`/cases/${id}/quality-control`)}>
                                    Quality Control
                                </Button>
                            )}
                            {canManageCase && (
                                <Button variant="outline" size="sm" onClick={() => navigate(`/cases/${id}/productions`)}>
                                    Production Sets
                                </Button>
                            )}
                        </div>
                        {!canReviewCase && !canUploadToCase && !canManageCase && (
                            <p className="text-xs text-muted-foreground mt-3">You do not currently have document workflow permissions for this case.</p>
                        )}
                    </Card>
                </TabsContent>

                <TabsContent value="team">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Case Team</CardTitle>
                            <CardDescription className="text-xs">Individuals authorized to access this case.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-2">
                                {currentCase.team?.map((member: any) => (
                                    <div key={member.user?._id || member.user} className="flex items-center justify-between p-3 rounded-xl border border-border/60 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs">
                                                {member.user?.firstName?.[0]?.toUpperCase() || '?'}{member.user?.lastName?.[0]?.toUpperCase() || ''}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-foreground">
                                                    {member.user?.firstName && member.user?.lastName
                                                        ? `${member.user.firstName} ${member.user.lastName}`
                                                        : member.user?.email || String(member.user)}
                                                </div>
                                                <div className="text-xs text-muted-foreground">{formatCaseRoleLabel(member.role)}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {canManageTeam && (
                                    <Button variant="outline" className="w-full border-dashed text-sm" size="sm" onClick={openAddMember}>
                                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Team Member
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Add Team Member Modal */}
                    <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
                        <DialogContent className="sm:max-w-[440px]">
                            <DialogHeader>
                                <DialogTitle>Add Team Member</DialogTitle>
                                <DialogDescription>Select a user and a role to add them to this case.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">User</label>
                                    <select
                                        className="w-full border border-border rounded-md p-2 text-sm bg-background"
                                        value={selectedUserId}
                                        onChange={(e) => setSelectedUserId(e.target.value)}
                                    >
                                        <option value="">Select a user…</option>
                                        {availableUsers.map(u => (
                                            <option key={u._id} value={u._id}>
                                                {u.firstName} {u.lastName} ({u.email}) — {u.role}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Team Role</label>
                                    <select
                                        className="w-full border border-border rounded-md p-2 text-sm bg-background"
                                        value={selectedTeamRole}
                                        onChange={(e) => setSelectedTeamRole(e.target.value)}
                                    >
                                        <option value="LEAD">{formatCaseRoleLabel('LEAD')}</option>
                                        <option value="REVIEWER">{formatCaseRoleLabel('REVIEWER')}</option>
                                        <option value="PARALEGAL">{formatCaseRoleLabel('PARALEGAL')}</option>
                                    </select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>Cancel</Button>
                                <Button onClick={handleAddMember} disabled={!selectedUserId || isAddingMember}>
                                    {isAddingMember ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Add Member
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default CaseDetail;
