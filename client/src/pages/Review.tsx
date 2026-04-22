import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ArrowLeft, PanelRightClose, PanelRightOpen, Check, Scissors } from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { motion } from 'framer-motion';
import { ReviewProvider, useReview } from '../context/ReviewContext';
import CodingPanel from '../components/review/CodingPanel';
import DocumentViewer from '../components/enhanced/document-viewer';
import { RedactionPanel } from '../components/enhanced/redaction';
import api from '../services/api';
import { useToastStore } from '../store/toastStore';
import { useRole } from '../hooks/useRole';
import PermissionDenied from '../components/ui/PermissionDenied';

// Inner component that consumes ReviewContext
const ReviewInner = () => {
    const { id: caseId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { currentDocument, loading, error } = useReview();
    const [panelCollapsed, setPanelCollapsed] = useState(false);
    const [activePanel, setActivePanel] = useState<'coding' | 'redaction'>('coding');
    const { addToast } = useToastStore();

    const handleDownload = async () => {
        if (!currentDocument) return;
        try {
            const response = await api.get(`/documents/${currentDocument.id}/download`, {
                responseType: 'blob'
            });
            const url = globalThis.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', currentDocument.filename || `document_${currentDocument.id}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            globalThis.URL.revokeObjectURL(url);
            addToast({ title: 'Document downloaded successfully', type: 'success' });
        } catch (error) {
            console.error('Download failed:', error);
            addToast({ title: 'Failed to download document', type: 'error' });
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col h-[calc(100vh-4rem)] p-6 space-y-4">
                <Skeleton className="h-14 w-full rounded-md shrink-0" />
                <div className="flex flex-1 gap-4 overflow-hidden">
                    <Skeleton className="flex-1 rounded-md" />
                    <Skeleton className="w-80 rounded-md shrink-0" />
                </div>
            </div>
        );
    }

    if (error && !currentDocument) {
        return (
            <div className="h-screen flex flex-col items-center justify-center p-6">
                <EmptyState
                    icon={Check}
                    title="Error Loading Queue"
                    description={error}
                    actionLabel="Return to Case"
                    onAction={() => navigate(`/cases/${caseId}`)}
                />
            </div>
        );
    }

    if (!currentDocument) {
        return (
            <div className="h-screen flex flex-col items-center justify-center p-6">
                <EmptyState
                    icon={Check}
                    title="Queue Empty"
                    description="There are no more documents assigned for review in this queue."
                    actionLabel="Return to Case"
                    onAction={() => navigate(`/cases/${caseId}`)}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-background animate-fade-in">
            {/* Toolbar */}
            <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/cases/${caseId}`)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Exit
                    </Button>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground truncate max-w-[300px]">{currentDocument.filename}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none">Review Queue</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Panel Tab Switcher */}
                    <div className="flex items-center bg-muted rounded-md p-0.5 border border-border">
                        <button
                            type="button"
                            onClick={() => { setActivePanel('coding'); setPanelCollapsed(false); }}
                            className={`text-xs px-3 py-1 rounded transition-colors ${activePanel === 'coding' && !panelCollapsed ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Coding
                        </button>
                        <button
                            type="button"
                            onClick={() => { setActivePanel('redaction'); setPanelCollapsed(false); }}
                            className={`text-xs px-3 py-1 rounded transition-colors flex items-center gap-1 ${activePanel === 'redaction' && !panelCollapsed ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <Scissors className="h-3 w-3" />
                            Redact
                        </button>
                    </div>
                    <div className="w-px h-6 bg-border mx-1"></div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setPanelCollapsed(!panelCollapsed)}>
                        {panelCollapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {/* Main Layout Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Document Viewer */}
                <div className="flex-1 bg-muted flex flex-col overflow-hidden">
                    <DocumentViewer
                        documentId={currentDocument.id}
                        filename={currentDocument.filename}
                        fileType={currentDocument.fileType}
                        extractedText={currentDocument.extractedText}
                        onDownload={handleDownload}
                        isRedactionMode={activePanel === 'redaction' && !panelCollapsed}
                    />
                </div>

                {/* Collapsible Side Panel */}
                <motion.div
                    initial={false}
                    animate={{ width: panelCollapsed ? 0 : 320 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="border-l border-border flex flex-col shrink-0 overflow-hidden"
                >
                    <div className="w-80 h-full overflow-hidden">
                        {activePanel === 'coding' ? (
                            <CodingPanel />
                        ) : (
                            <RedactionPanel documentId={currentDocument.id} />
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

// Outer component wraps inner with ReviewProvider so context is available
const ReviewPage = () => {
    const { canReview } = useRole();
    if (!canReview) {
        return <PermissionDenied requiredRole="ADMIN, PARTNER, or ASSOCIATE" />;
    }
    return (
        <ReviewProvider>
            <ReviewInner />
        </ReviewProvider>
    );
};

export default ReviewPage;
