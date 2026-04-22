import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Loader2, FileText, Download } from 'lucide-react';
import { Button } from '../../ui/Button';

interface PdfViewerProps {
  documentId: string;
  filename: string;
  zoom: number;
  rotation: number;
  onDownload?: () => void;
}

export const PdfViewer = ({ 
  onDownload 
}: PdfViewerProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(1); // Will be updated when PDF library is integrated
  const [isLoading] = useState(false);

  const handlePreviousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  // Placeholder for PDF rendering
  // TODO: Integrate react-pdf or pdf.js for actual PDF rendering
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-muted">
      {isLoading ? (
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading PDF...</p>
        </div>
      ) : (
        <div className="text-center max-w-md">
          <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">PDF Viewer Coming Soon</h3>
          <p className="text-sm text-muted-foreground mb-4">
            PDF rendering will be available in the next update. For now, please download the file to view it.
          </p>
          {onDownload && (
            <Button onClick={onDownload} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          )}
          
          {/* Page Navigation (for future use) */}
          <div className="mt-6 flex items-center justify-center gap-2 opacity-30">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePreviousPage}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[80px] text-center">
              Page {currentPage} of {totalPages}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfViewer;
