import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useCaseStore } from '../store/caseStore';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/Dialog';
import {
    ArrowLeft, Search, FileText, Settings,
    Clock, Database, Upload, BarChart3, Activity,
    Plus, CheckCircle2, Loader2, ExternalLink, Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '../components/ui/Skeleton';
import api from '../services/api';
import DocumentViewer from '../components/enhanced/document-viewer/DocumentViewer';
import { useRole } from '../hooks/useRole';
import PermissionDenied from '../components/ui/PermissionDenied';
import { formatCaseRole as formatCaseRoleLabel } from '../utils/formatters';

interface CaseAnalytics {
    totalDocuments: number;
    reviewedDocuments: number;
    pendingDocuments: number;
    reviewProgress: number;
}

interface AvailableUser {
    _id?: string;
    id?: string;
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
    userName?: string;
    action?: string;
}

interface DocumentItem {
    id?: string;
    _id?: string;
    docNumber: string;
    filename: string;
    fileType: string;
    fileSize: number;
    uploadedAt: string;
    custodianId?: { name?: string } | string;
    coding?: {
        privilegeStatus?: string;
        relevanceStatus?: string;
        isConfidential?: boolean;
        reviewNotes?: string;
        reviewedAt?: string;
        reviewedBy?: { firstName?: string; lastName?: string; email?: string; role?: string } | string;
    };
}

const CaseDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const defaultTab = searchParams.get('tab') || 'overview';
    const { currentCase, fetchCaseById, isLoading, error } = useCaseStore();
    const { hasFullAccess, getCaseRole } = useRole();

    const [analytics, setAnalytics] = useState<CaseAnalytics | null>(null);
    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
    const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedTeamRole, setSelectedTeamRole] = useState('REVIEWER');
    const [isAddingMember, setIsAddingMember] = useState(false);
    const [documents, setDocuments] = useState<DocumentItem[]>([]);
    const [docsLoading, setDocsLoading] = useState(false);
    const [isDocPreviewOpen, setIsDocPreviewOpen] = useState(false);
    const [isDocPreviewLoading, setIsDocPreviewLoading] = useState(false);
    const [previewDoc, setPreviewDoc] = useState<any | null>(null);

    const caseRole = currentCase ? getCaseRole(currentCase) : null;
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
                api.get(`/cases/${id}/activity`, { params: { limit: 5 } }),
            ]);
            setAnalytics(analyticsRes.data);
            setRecentActivity(activityRes.data || []);
        } catch {
            // Non-critical — silently degrade to showing zeros
        }
    }, [id]);

    const fetchDocuments = useCallback(async () => {
        if (!id) return;
        setDocsLoading(true);
        try {
            const res = await api.get(`/cases/${id}/documents`, { params: { page: 1, limit: 20 } });
            const docs = res.data?.documents ?? res.data ?? [];
            setDocuments(Array.isArray(docs) ? docs : []);
        } catch {
            setDocuments([]);
        } finally {
            setDocsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchAnalytics();
        
        // Listen for coding submissions to refresh analytics
        const handleCoding = () => fetchAnalytics();
        if (typeof window !== 'undefined') {
            window.addEventListener('coding-submitted', handleCoding);
        }
        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('coding-submitted', handleCoding);
            }
        };
    }, [fetchAnalytics]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    useEffect(() => {
        // Listen for document uploads to refresh the document list
        const handleUpload = () => {
            fetchDocuments();
            fetchAnalytics();
        };
        if (typeof window !== 'undefined') {
            window.addEventListener('document-uploaded', handleUpload);
        }
        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('document-uploaded', handleUpload);
            }
        };
    }, [fetchDocuments, fetchAnalytics]);

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

            <Tabs defaultValue={defaultTab} className="space-y-5">
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
                    <div className="space-y-4">
                        {/* Action bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-base font-semibold text-foreground">
                                Documents {documents.length > 0 && <span className="text-muted-foreground font-normal text-sm">({documents.length} shown)</span>}
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {canUploadToCase && (
                                    <Button size="sm" onClick={() => navigate(`/cases/${id}/upload`)} className="gap-1.5">
                                        <Upload className="h-3.5 w-3.5" /> Upload Documents
                                    </Button>
                                )}
                                {canUploadToCase && (
                                    <Button variant="outline" size="sm" onClick={() => navigate(`/cases/${id}/custodians`)} className="gap-1.5">
                                        <Users className="h-3.5 w-3.5" /> Custodians
                                    </Button>
                                )}
                                {canReviewCase && (
                                    <Button variant="outline" size="sm" onClick={() => navigate(`/cases/${id}/search`)} className="gap-1.5">
                                        <Search className="h-3.5 w-3.5" /> Search & Review
                                    </Button>
                                )}
                                {canUploadToCase && (
                                    <Button variant="outline" size="sm" onClick={() => navigate(`/cases/${id}/chain-of-custody`)} className="gap-1.5">
                                        <ExternalLink className="h-3.5 w-3.5" /> Chain of Custody
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Document list */}
                        <Card>
                            {docsLoading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            ) : documents.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                                    <FileText className="h-12 w-12 text-muted-foreground/25 mb-3" />
                                    <p className="font-medium text-foreground">No documents yet</p>
                                    <p className="text-sm text-muted-foreground mt-1 mb-4">Upload documents to start the review process.</p>
                                    {canUploadToCase && (
                                        <Button size="sm" onClick={() => navigate(`/cases/${id}/upload`)} className="gap-1.5">
                                            <Upload className="h-3.5 w-3.5" /> Upload Documents
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border/60 bg-muted/30">
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Doc #</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filename</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Type</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Custodian</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Size</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/40">
                                            {documents.map((doc, idx) => {
                                                const docId = doc.id || doc._id;
                                                const custodianName = typeof doc.custodianId === 'object' && doc.custodianId?.name
                                                    ? doc.custodianId.name
                                                    : '—';
                                                // Determine review status based on coding data
                                                const coding: any = doc.coding;
                                                // Consider a document reviewed only when a reviewer has saved coding (reviewedAt exists)
                                                const isReviewed = Boolean(coding?.reviewedAt);
                                                const reviewStatus = isReviewed ? 'REVIEWED' : 'PENDING';
                                                const sizeMB = doc.fileSize ? (doc.fileSize / 1024 / 1024).toFixed(2) + ' MB' : '—';
                                                return (
                                                    <tr
                                                        key={docId ?? idx}
                                                        className="hover:bg-muted/40 transition-colors cursor-pointer"
                                                        onClick={async () => {
                                                            if (!docId) return;
                                                            setIsDocPreviewOpen(true);
                                                            setIsDocPreviewLoading(true);
                                                            try {
                                                                const response = await api.get(`/documents/${docId}`);
                                                                const fullDoc = response.data || {};
                                                                setPreviewDoc(fullDoc);
                                                            } catch (error) {
                                                                console.error('Failed to load document details', error);
                                                                setPreviewDoc({ id: String(docId), filename: doc.filename, fileType: doc.fileType, coding: doc.coding });
                                                            } finally {
                                                                setIsDocPreviewLoading(false);
                                                            }
                                                        }}
                                                    >
                                                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{doc.docNumber}</td>
                                                        <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">{doc.filename}</td>
                                                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell uppercase text-xs">{doc.fileType || '—'}</td>
                                                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{custodianName}</td>
                                                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{sizeMB}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                                                                reviewStatus === 'REVIEWED' ? 'bg-success/12 text-success' : 'bg-warning/12 text-warning'
                                                            }`}>
                                                                {reviewStatus === 'REVIEWED' ? 'Reviewed' : 'Pending'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    {documents.length >= 20 && (
                                        <div className="px-4 py-3 border-t border-border/60 text-center">
                                            <Button variant="ghost" size="sm" onClick={() => navigate(`/cases/${id}/search`)}>
                                                View all documents in Search <ArrowLeft className="ml-1 h-3 w-3 rotate-180" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>

                        {/* Document Preview Dialog */}
                        <Dialog open={isDocPreviewOpen} onOpenChange={setIsDocPreviewOpen}>
                            <DialogContent className="w-[96vw] max-w-[1120px] p-0 h-[82vh] overflow-hidden">
                                <div className="flex flex-col h-full">
                                    <div className="flex items-start justify-between gap-3 px-3.5 py-2 border-b border-border bg-card">
                                        <div className="min-w-0 space-y-1">
                                            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Document Preview</div>
                                            <div className="text-sm font-semibold text-foreground truncate max-w-[56vw]">{previewDoc?.filename || 'Untitled document'}</div>
                                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                                                {previewDoc?.docNumber && (
                                                    <span className="inline-flex items-center rounded-full border border-border/70 bg-muted px-2 py-0.5 font-medium uppercase tracking-wide">
                                                        Doc {previewDoc.docNumber}
                                                    </span>
                                                )}
                                                {previewDoc?.fileType && (
                                                    <span className="inline-flex items-center rounded-full border border-border/70 bg-muted px-2 py-0.5 font-medium uppercase tracking-wide">
                                                        {previewDoc.fileType}
                                                    </span>
                                                )}
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide ${previewDoc?.coding?.reviewedAt ? 'bg-success/12 text-success' : 'bg-warning/12 text-warning'}`}>
                                                    {previewDoc?.coding?.reviewedAt ? 'Reviewed' : 'Pending review'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" onClick={() => setIsDocPreviewOpen(false)}>Close</Button>
                                        </div>
                                    </div>
                                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-[260px_1fr] min-h-0">
                                        <div className="border-b lg:border-b-0 lg:border-r border-border bg-muted/30 px-3 py-3 space-y-2.5 overflow-y-auto">
                                            {isDocPreviewLoading ? (
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Loader2 className="h-4 w-4 animate-spin" /> Loading document details...
                                                </div>
                                            ) : previewDoc ? (
                                                <div className="space-y-2.5 text-sm">
                                                    <div className="rounded-md border border-border bg-background/70 p-2.5">
                                                        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                                                            <div>
                                                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Doc #</div>
                                                                <div className="font-semibold leading-5">{previewDoc.docNumber || 'N/A'}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Type</div>
                                                                <div className="font-semibold truncate leading-5">{previewDoc.fileType || 'Unknown'}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Status</div>
                                                                <div className={`font-semibold leading-5 ${previewDoc?.coding?.reviewedAt ? 'text-success' : 'text-warning'}`}>
                                                                    {previewDoc?.coding?.reviewedAt ? 'Reviewed' : 'Pending review'}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Custodian</div>
                                                                <div className="font-semibold truncate leading-5">{previewDoc.custodianId?.name || 'Unknown'}</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="rounded-md border border-border bg-background/70 p-2.5 space-y-2">
                                                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Coding</div>
                                                        <div className="space-y-1.5 text-sm leading-5">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="text-muted-foreground">Privilege</span>
                                                                <span className="font-medium text-right">{previewDoc.coding?.privilegeStatus || 'Not coded'}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="text-muted-foreground">Relevance</span>
                                                                <span className="font-medium text-right">{previewDoc.coding?.relevanceStatus || 'Not coded'}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="text-muted-foreground">Confidential</span>
                                                                <span className="font-medium text-right">{previewDoc.coding?.isConfidential ? 'Yes' : 'No'}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="rounded-md border border-border bg-background/70 p-2.5 space-y-1.5">
                                                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Reviewed by</div>
                                                        <div className="font-medium leading-5">
                                                            {previewDoc.coding?.reviewedBy && typeof previewDoc.coding.reviewedBy === 'object'
                                                                ? `${previewDoc.coding.reviewedBy.firstName || ''} ${previewDoc.coding.reviewedBy.lastName || ''}`.trim() || previewDoc.coding.reviewedBy.email || 'Unknown'
                                                                : 'Not reviewed yet'}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {previewDoc.coding?.reviewedAt ? new Date(previewDoc.coding.reviewedAt).toLocaleString() : 'No review timestamp'}
                                                        </div>
                                                    </div>

                                                    <div className="rounded-md border border-border bg-background/70 p-2.5 space-y-1.5">
                                                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Notes</div>
                                                        <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-5">
                                                            {previewDoc.coding?.reviewNotes || 'No notes saved.'}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                        <div className="min-h-0">
                                            {previewDoc ? (
                                                <DocumentViewer
                                                    documentId={previewDoc.id || previewDoc._id}
                                                    filename={previewDoc.filename}
                                                    fileType={previewDoc.fileType}
                                                    extractedText={previewDoc.extractedText}
                                                    onDownload={async () => {
                                                        try {
                                                            const docId = previewDoc.id || previewDoc._id;
                                                            const resp = await api.get(`/documents/${docId}/download`, { responseType: 'blob' });
                                                            const url = window.URL.createObjectURL(new Blob([resp.data]));
                                                            const a = document.createElement('a');
                                                            a.href = url;
                                                            a.download = previewDoc.filename || `document_${docId}`;
                                                            document.body.appendChild(a);
                                                            a.click();
                                                            a.remove();
                                                            window.URL.revokeObjectURL(url);
                                                        } catch (err) {
                                                            console.error('Download failed', err);
                                                        }
                                                    }}
                                                    className="h-full"
                                                />
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>

                        {/* Secondary actions */}
                        {canManageCase && (
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" onClick={() => navigate(`/cases/${id}/processing-status`)}>
                                    Processing Status
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => navigate(`/cases/${id}/quality-control`)}>
                                    Quality Control
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => navigate(`/cases/${id}/productions`)}>
                                    Production Sets
                                </Button>
                            </div>
                        )}
                    </div>
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
                                            <option key={u._id || u.id} value={u._id || u.id}>
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

                <TabsContent value="activity">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Activity className="h-4 w-4 text-muted-foreground" /> Recent Activity
                            </CardTitle>
                            <CardDescription className="text-xs">Recent actions and events for this case.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {recentActivity.length > 0 ? recentActivity.map((item, idx) => (
                                    <div key={idx} className="flex items-start gap-3 p-3 rounded-xl border border-border/60 hover:bg-muted/30 transition-colors">
                                        <div className="bg-primary/8 p-2 rounded-lg mt-0.5 shrink-0">
                                            <Clock className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-foreground leading-snug">{item.description || item.action || 'Case activity'}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                        {item.userName && <span className="text-xs text-muted-foreground">{item.userName}</span>}
                                                        {item.caseName && <span className="text-xs text-muted-foreground">{item.caseName}</span>}
                                                <span className="text-xs text-muted-foreground/60">
                                                    {new Date(item.timestamp).toLocaleString(undefined, { 
                                                        month: 'short', 
                                                        day: 'numeric',
                                                        hour: 'numeric',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-12">
                                        <Activity className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                                        <p className="text-sm font-medium text-foreground">No activity yet</p>
                                        <p className="text-xs text-muted-foreground mt-1">Activity will appear here as team members work on this case.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default CaseDetail;
