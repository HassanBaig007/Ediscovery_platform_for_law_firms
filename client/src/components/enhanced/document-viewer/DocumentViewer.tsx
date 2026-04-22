import { useState, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Download, Maximize2, Loader2, FileText, Image as ImageIcon, File } from 'lucide-react';
import { Button } from '../../ui/Button';
import { cn } from '../../../lib/utils';

interface DocumentViewerProps {
  documentId: string;
  filename: string;
  fileType?: string;
  extractedText?: string;
  onDownload?: () => void;
  className?: string;
}

type ViewMode = 'text' | 'image' | 'pdf' | 'unsupported';

export const DocumentViewer = ({ 
  documentId, 
  filename, 
  fileType = '', 
  extractedText = '',
  onDownload,
  className 
}: DocumentViewerProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('text');
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Determine view mode based on file type
  useEffect(() => {
    const normalizedType = fileType.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(normalizedType)) {
      setViewMode('image');
    } else if (normalizedType === 'pdf') {
      setViewMode('pdf');
    } else if (['txt', 'text', 'log', 'csv'].includes(normalizedType)) {
      setViewMode('text');
    } else if (extractedText) {
      setViewMode('text');
    } else {
      setViewMode('unsupported');
    }
  }, [fileType, extractedText]);

  // Load image if in image mode
  useEffect(() => {
    if (viewMode === 'image' && documentId) {
      setIsLoading(true);
      setError(null);
      
      // Simulate image loading - replace with actual API call
      const loadImage = async () => {
        try {
          // TODO: Replace with actual API endpoint
          // const response = await api.get(`/documents/${documentId}/preview`, { responseType: 'blob' });
          // const url = URL.createObjectURL(response.data);
          // setImageUrl(url);
          
          // For now, show placeholder
          setImageUrl(null);
          setError('Image preview not yet implemented');
        } catch (err) {
          setError('Failed to load image');
        } finally {
          setIsLoading(false);
        }
      };
      
      loadImage();
    }
    
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [viewMode, documentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 25, 300));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 25, 25));
  }, []);

  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(100);
    setRotation(0);
  }, []);

  const renderToolbar = () => (
    <div className="h-12 bg-card border-b border-border flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground truncate max-w-[300px]" title={filename}>
          {filename}
        </span>
        <span className="text-xs text-muted-foreground uppercase px-2 py-0.5 bg-muted rounded">
          {fileType || 'Unknown'}
        </span>
      </div>
      
      <div className="flex items-center gap-1">
        {(viewMode === 'image' || viewMode === 'pdf') && (
          <>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleZoomOut}
              disabled={zoom <= 25}
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground min-w-[50px] text-center">
              {zoom}%
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleZoomIn}
              disabled={zoom >= 300}
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRotate}
              title="Rotate"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleResetView}
              title="Reset view"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </>
        )}
        {onDownload && (
          <>
            <div className="w-px h-6 bg-border mx-1" />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onDownload}
              title="Download original"
            >
              <Download className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );

  const renderTextView = () => (
    <div className="flex-1 overflow-auto bg-muted p-6">
      <div 
        className="bg-card shadow-2xl min-h-[1000px] w-full max-w-4xl mx-auto p-12 rounded-sm"
        style={{ 
          transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
          transformOrigin: 'top center',
          transition: 'transform 0.2s ease-out'
        }}
      >
        <pre className="whitespace-pre-wrap font-sans text-foreground text-base leading-relaxed">
          {extractedText || "Document content preview unavailable. Use the download option to view the original file."}
        </pre>
      </div>
    </div>
  );

  const renderImageView = () => {
    if (isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center bg-muted">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading image...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex-1 flex items-center justify-center bg-muted">
          <div className="text-center max-w-md">
            <ImageIcon className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Image Preview Unavailable</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            {onDownload && (
              <Button onClick={onDownload} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download to View
              </Button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-auto bg-muted p-6 flex items-center justify-center">
        <div
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            transformOrigin: 'center',
            transition: 'transform 0.2s ease-out'
          }}
        >
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={filename}
              className="max-w-full h-auto shadow-2xl rounded"
            />
          ) : (
            <div className="bg-card p-12 rounded shadow-2xl">
              <ImageIcon className="h-24 w-24 text-muted-foreground/20 mx-auto" />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPdfView = () => (
    <div className="flex-1 flex items-center justify-center bg-muted">
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
      </div>
    </div>
  );

  const renderUnsupportedView = () => (
    <div className="flex-1 flex items-center justify-center bg-muted">
      <div className="text-center max-w-md">
        <File className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Preview Not Available</h3>
        <p className="text-sm text-muted-foreground mb-4">
          This file type cannot be previewed in the browser. Please download the file to view it.
        </p>
        {onDownload && (
          <Button onClick={onDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download File
          </Button>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (viewMode) {
      case 'text':
        return renderTextView();
      case 'image':
        return renderImageView();
      case 'pdf':
        return renderPdfView();
      case 'unsupported':
        return renderUnsupportedView();
      default:
        return renderUnsupportedView();
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {renderToolbar()}
      {renderContent()}
    </div>
  );
};

export default DocumentViewer;
