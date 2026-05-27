import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { History, X, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { useReview } from '../../context/ReviewContext';
import {
    formatAuditAction,
    formatPrivilegeStatus,
    formatRelevanceStatus
} from '../../utils/formatters';

interface CodingFormData {
    privilegeStatus: 'NOT_PRIVILEGED' | 'ATTORNEY_CLIENT' | 'WORK_PRODUCT' | 'NEEDS_REVIEW';
    privilegeReason: string;
    relevanceStatus: 'HIGHLY_RELEVANT' | 'RELEVANT' | 'NOT_RELEVANT' | 'MARGINAL';
    isConfidential: boolean;
    reviewNotes: string;
    issueTagIds: string[];
}

const PRIVILEGE_STATUS_OPTIONS: CodingFormData['privilegeStatus'][] = [
    'NOT_PRIVILEGED',
    'ATTORNEY_CLIENT',
    'WORK_PRODUCT',
    'NEEDS_REVIEW'
];

const RELEVANCE_STATUS_OPTIONS: CodingFormData['relevanceStatus'][] = [
    'HIGHLY_RELEVANT',
    'RELEVANT',
    'MARGINAL',
    'NOT_RELEVANT'
];

const CodingPanel: React.FC = () => {
    const { currentDocument, tags, submitCoding, goPrevious, skipDocument } = useReview();

    const { register, handleSubmit, watch, reset } = useForm<CodingFormData>({

        defaultValues: {
            privilegeStatus: 'NOT_PRIVILEGED',
            privilegeReason: '',
            relevanceStatus: 'NOT_RELEVANT',
            isConfidential: false,
            reviewNotes: '',
            issueTagIds: []
        }
    });

    const [history, setHistory] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    // Reset form and fetch history when document changes
    useEffect(() => {
        if (currentDocument && currentDocument.coding) {
            reset({
                privilegeStatus: (currentDocument.coding.privilegeStatus as CodingFormData['privilegeStatus']) || 'NOT_PRIVILEGED',
                privilegeReason: currentDocument.coding.privilegeReason || '',
                relevanceStatus: (currentDocument.coding.relevanceStatus as CodingFormData['relevanceStatus']) || 'NOT_RELEVANT',
                isConfidential: currentDocument.coding.isConfidential || false,
                reviewNotes: currentDocument.coding.reviewNotes || '',
                issueTagIds: currentDocument.tags ? currentDocument.tags.map((t: { _id?: string; id?: string } | string) => typeof t === 'object' ? t._id || t.id : t) : []
            });

        } else {
            reset({
                privilegeStatus: 'NOT_PRIVILEGED',
                privilegeReason: '',
                relevanceStatus: 'NOT_RELEVANT',
                isConfidential: false,
                reviewNotes: '',
                issueTagIds: []
            });
        }
    }, [currentDocument, reset]);

    const privilegeStatus = watch('privilegeStatus');

    const onSubmit = (data: CodingFormData) => {
        submitCoding(data);
    };

    const fetchHistory = async () => {
        const docId = currentDocument?.id || (currentDocument as any)?._id;
        if (!docId) return;
        setIsLoadingHistory(true);
        try {
            const res = await api.get(`/documents/${docId}/coding-history`);
            setHistory(res.data || []);
            setShowHistory(true);
        } catch (error) {
            console.error('Failed to fetch coding history', error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    if (!currentDocument) return <div className="p-8 text-center text-muted-foreground">No document selected</div>;

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="h-full flex flex-col bg-muted">
            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Privilege Section */}
                <section className="bg-card p-4 rounded-lg shadow-sm border border-border">
                    <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">Privilege</h3>
                    <div className="space-y-2">
                        {PRIVILEGE_STATUS_OPTIONS.map((status) => (
                            <label key={status} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="radio"
                                    value={status}
                                    {...register('privilegeStatus')}
                                    className="text-primary focus:ring-primary"
                                />
                                <span className="text-sm text-foreground">{formatPrivilegeStatus(status)}</span>
                            </label>
                        ))}
                    </div>

                    {privilegeStatus !== 'NOT_PRIVILEGED' && (
                        <div className="mt-3">
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Privilege Reason</label>
                            <input
                                {...register('privilegeReason', { required: true })}
                                className="w-full border-border rounded-md shadow-sm text-sm p-2 border"
                                placeholder="E.g. Communication with counsel"
                            />
                        </div>
                    )}
                </section>

                {/* Relevance Section */}
                <section className="bg-card p-4 rounded-lg shadow-sm border border-border">
                    <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">Relevance</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {RELEVANCE_STATUS_OPTIONS.map((status) => (
                            <label key={status} className={`
                                cursor-pointer text-center py-2 px-1 rounded border text-xs font-medium transition-colors
                                ${watch('relevanceStatus') === status
                                    ? 'bg-primary/10 border-primary text-primary'
                                    : 'bg-muted border-border text-muted-foreground hover:bg-muted'}
                            `}>
                                <input
                                    type="radio"
                                    value={status}
                                    {...register('relevanceStatus')}
                                    className="sr-only"
                                />
                                {formatRelevanceStatus(status)}
                            </label>
                        ))}
                    </div>
                </section>

                {/* Tags Section */}
                <section className="bg-card p-4 rounded-lg shadow-sm border border-border">
                    <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">Issue Tags</h3>
                    <div className="flex flex-wrap gap-2">
                        {tags.map(tag => (
                            <label key={tag.id} className="inline-flex items-center">
                                <input
                                    type="checkbox"
                                    value={tag.id}
                                    {...register('issueTagIds')}
                                    className="rounded border-border text-primary shadow-sm focus:border-primary focus:ring focus:ring-primary/20 focus:ring-opacity-50"
                                />
                                <span className="ml-2 text-sm text-foreground px-2 py-0.5 rounded" style={{ backgroundColor: tag.color + '20', color: tag.color }}>
                                    {tag.tagName}
                                </span>
                            </label>
                        ))}
                        {tags.length === 0 && <p className="text-xs text-muted-foreground italic">No tags defined for this case.</p>}
                    </div>
                </section>

                {/* Extra & Notes */}
                <section className="bg-card p-4 rounded-lg shadow-sm border border-border space-y-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            {...register('isConfidential')}
                            className="rounded border-border text-destructive focus:ring-red-500"
                        />
                        <span className="text-sm font-medium text-foreground">Mark as Confidential</span>
                    </label>

                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Review Notes</label>
                        <textarea
                            {...register('reviewNotes')}
                            rows={3}
                            className="w-full border-border rounded-md shadow-sm text-sm p-2 border"
                            placeholder="Internal notes..."
                        ></textarea>
                    </div>

                    <button
                        type="button"
                        onClick={showHistory ? () => setShowHistory(false) : fetchHistory}
                        className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-border text-sm font-medium rounded-md hover:bg-muted text-muted-foreground transition-colors"
                    >
                        {isLoadingHistory ? <Loader2 className="h-4 w-4 animate-spin" /> : showHistory ? <X className="h-4 w-4" /> : <History className="h-4 w-4" />}
                        {showHistory ? 'Hide History' : 'View Core History'}
                    </button>

                    {showHistory && (
                        <div className="mt-4 border-t border-border pt-4 space-y-3">
                            <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">Audit Trail</h4>
                            {history.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">No review history.</p>
                            ) : (
                                history.map((log) => (
                                    <div key={log._id || log.id} className="text-xs space-y-1 bg-background p-2 rounded border border-border">
                                        <div className="flex justify-between items-center text-foreground font-medium">
                                            <span>{formatAuditAction(log.action)}</span>
                                            <span className="text-muted-foreground/80">{new Date(log.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className="text-muted-foreground">By {log.userId?.firstName || 'System'} {log.userId?.lastName || ''}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </section>

            </div>

            {/* Sticky Action Footer */}
            <div className="p-4 bg-card border-t border-border flex justify-between items-center z-10">
                <button
                    type="button"
                    onClick={goPrevious}
                    className="flex-1 mr-2 px-4 py-2 border border-border text-foreground bg-card rounded-md shadow-sm hover:bg-muted text-sm font-medium"
                >
                    Previous
                </button>
                <div className="flex space-x-2 flex-[2]">
                    <button
                        type="button"
                        onClick={skipDocument} // Skip
                        className="flex-1 px-4 py-2 border border-border text-foreground bg-card rounded-md shadow-sm hover:bg-muted text-sm font-medium"
                    >
                        Skip
                    </button>
                    <button
                        type="submit"
                        className="flex-[2] px-4 py-2 border border-transparent text-primary-foreground bg-primary rounded-md shadow-sm hover:bg-primary/90 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                        Save & Next
                    </button>
                </div>
            </div>
        </form>
    );
};

export default CodingPanel;
