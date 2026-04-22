import React from 'react';
import { useReview } from '../../context/ReviewContext';

const ReviewProgress: React.FC = () => {
    const { currentDocument, loading, error } = useReview();

    // In a real app, we'd fetch stats like "45 reviewed out of 120"
    // For now, we just show current status

    if (loading) return <div className="text-sm text-muted-foreground">Loading...</div>;
    if (error) return <div className="text-sm text-red-500">Error</div>;
    if (!currentDocument) return <div className="text-sm text-muted-foreground">Queue Empty</div>;

    return (
        <div className="flex items-center space-x-4 bg-card p-2 rounded shadow-sm border border-border">
            <div className="flex flex-col">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Current Document</span>
                <span className="text-sm font-medium">{currentDocument.docNumber}</span>
            </div>
            <div className="h-8 w-px bg-gray-200 mx-2"></div>
            <div className="flex flex-col">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">File</span>
                <span className="text-sm truncate max-w-[200px]" title={currentDocument.filename}>{currentDocument.filename}</span>
            </div>
            {/* Future: Add Progress Bar here */}
        </div>
    );
};

export default ReviewProgress;
