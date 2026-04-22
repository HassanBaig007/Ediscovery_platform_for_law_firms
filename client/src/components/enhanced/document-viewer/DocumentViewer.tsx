import { useState, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Download, Maximize2, Loader2, FileText, Image as ImageIcon, File } from 'lucide-react';
import { Button } from '../../ui/Button';
import { cn } from '../../../lib/utils';
import api from '../../../services/api';

interface DocumentViewerProps {
  documentId: string;
  filename: string;
  fileType?: string;
  extractedText?: string;
  onDownload?: () => void;
  className?: string;
  isRedactionMode?: boolean;
}

type ViewMode = 'text' | 'image' | 'pdf' | 'unsupported';

export const DocumentViewer = ({ 
  documentId, 
  filename, 
  fileType = '', 
  extractedText = '',
  onDownload,
  className,
  isRedactionMode = false
}: DocumentViewerProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('text');
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Redaction state
  const [redactionBoxes, setRedactionBoxes] = useState<{x: number, y: number, w: number, h: number}[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentBox, setCurrentBox] = useState<{startX: number, startY: number, x: number, y: number, w: number, h: number} | null>(null);

  // Determine view mode based on file type
  useEffect(() => {
    const normalizedType = fileType.toLowerCase();
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    const imageExtensions = new Set(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tif', 'tiff']);
    const textExtensions = new Set(['txt', 'text', 'log', 'csv']);

    if (normalizedType.startsWith('image/') || imageExtensions.has(normalizedType) || imageExtensions.has(extension)) {
      setViewMode('image');
    } else if (normalizedType.includes('pdf') || extension === 'pdf') {
      setViewMode('pdf');
    } else if (normalizedType.startsWith('text/') || textExtensions.has(normalizedType) || textExtensions.has(extension)) {
      setViewMode('text');
    } else if (extractedText) {
      setViewMode('text');
    } else {
      setViewMode('unsupported');
    }
  }, [fileType, extractedText, filename]);

  // Cleanup generated object URLs when viewer unmounts or URL changes.
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Load inline preview for binary types (images / PDFs)
  useEffect(() => {
    const shouldLoadBinaryPreview = (viewMode === 'image' || viewMode === 'pdf') && Boolean(documentId);

    if (!shouldLoadBinaryPreview) {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setIsLoading(false);
      setError(null);
      return;
    }

    let isActive = true;

    const loadPreview = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const binarySources = [
          `/documents/${documentId}/preview`,
          `/documents/${documentId}/download`,
        ];

        let previewBlob: Blob | null = null;

        for (const endpoint of binarySources) {
          try {
            const response = await api.get(endpoint, {
              responseType: 'blob'
            });

            if (!isActive) return;

            const contentType = (response.headers?.['content-type'] as string | undefined) || '';
            const blob = response.data as Blob;
            const normalizedContentType = contentType.toLowerCase();
            const normalizedBlobType = (blob.type || '').toLowerCase();

            if (viewMode === 'image' && !(normalizedContentType.startsWith('image/') || normalizedBlobType.startsWith('image/'))) {
              continue;
            }

            if (viewMode === 'pdf' && !(normalizedContentType.includes('pdf') || normalizedBlobType.includes('pdf'))) {
              continue;
            }

            previewBlob = blob;
            break;
          } catch (err) {
            // Try the next binary source.
            console.debug('Failed to load from source:', endpoint, err);
          }
        }

        if (!previewBlob) {
          throw new Error('No binary preview source available');
        }

        const objectUrl = URL.createObjectURL(previewBlob);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return objectUrl;
        });
      } catch (err) {
        if (!isActive) return;

        const hasTextFallback = extractedText.trim().length > 0;
        if (hasTextFallback) {
          setViewMode('text');
          setIsLoading(false);
          return;
        }

        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        setError('Failed to load inline preview. Use download from the toolbar.');
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadPreview();

    return () => {
      isActive = false;
    };
  }, [viewMode, documentId, extractedText]);

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

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isRedactionMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);
    setCurrentBox({ startX: x, startY: y, x, y, w: 0, h: 0 });
    // Prevent default to avoid image dragging
    e.preventDefault();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawing || !currentBox || !isRedactionMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    const x = Math.min(currentBox.startX, currentX);
    const y = Math.min(currentBox.startY, currentY);
    const w = Math.abs(currentX - currentBox.startX);
    const h = Math.abs(currentY - currentBox.startY);
    
    setCurrentBox({ ...currentBox, x, y, w, h });
  };

  const handlePointerUp = () => {
    if (!isDrawing || !currentBox || !isRedactionMode) return;
    if (currentBox.w > 5 && currentBox.h > 5) {
      setRedactionBoxes(prev => [...prev, { x: currentBox.x, y: currentBox.y, w: currentBox.w, h: currentBox.h }]);
    }
    setIsDrawing(false);
    setCurrentBox(null);
  };

  const renderRedactionCanvas = () => {
    if (!isRedactionMode && redactionBoxes.length === 0) return null;
    return (
      <div 
        className="absolute inset-0 z-50 overflow-hidden"
        style={{ cursor: isRedactionMode ? 'crosshair' : 'default', touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {isRedactionMode && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-xs font-bold shadow-lg pointer-events-none animate-pulse">
                Redaction Mode Active: Draw boxes to redact
            </div>
        )}
        {redactionBoxes.map((box, i) => (
          <div key={`${box.x}-${box.y}-${box.w}-${box.h}-${i}`} className="absolute bg-black shadow-sm" style={{ left: box.x, top: box.y, width: box.w, height: box.h }} />
        ))}
        {isDrawing && currentBox && (
          <div className="absolute bg-black/60 border border-black" style={{ left: currentBox.x, top: currentBox.y, width: currentBox.w, height: currentBox.h }} />
        )}
      </div>
    );
  };

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
        className="relative bg-card shadow-2xl min-h-[1000px] w-full max-w-4xl mx-auto p-12 rounded-sm"
        style={{ 
          transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
          transformOrigin: 'top center',
          transition: isDrawing ? 'none' : 'transform 0.2s ease-out'
        }}
      >
        {renderRedactionCanvas()}
        <pre className="whitespace-pre-wrap font-sans text-foreground text-base leading-relaxed relative z-10 selection:bg-primary/20">
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
          className="relative inline-block"
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            transformOrigin: 'center',
            transition: isDrawing ? 'none' : 'transform 0.2s ease-out'
          }}
        >
          {previewUrl ? (
            <div className="relative inline-block">
                {renderRedactionCanvas()}
                <img 
                  src={previewUrl}
                  alt={filename}
                  className="max-w-full h-auto shadow-2xl rounded pointer-events-none"
                  draggable={false}
                />
            </div>
          ) : (
            <div className="bg-card p-12 rounded shadow-2xl relative">
              {renderRedactionCanvas()}
              <ImageIcon className="h-24 w-24 text-muted-foreground/20 mx-auto" />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPdfView = () => {
    if (isLoading) {
      return (
        <div className="flex-1 overflow-auto bg-muted p-4">
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading PDF preview...</p>
            </div>
          </div>
        </div>
      );
    }

    if (error || !previewUrl) {
      return (
        <div className="flex-1 overflow-auto bg-muted p-4">
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">PDF Preview Unavailable</h3>
              <p className="text-sm text-muted-foreground mb-4">{error || 'Unable to render this PDF inline.'}</p>
              {onDownload && (
                <Button onClick={onDownload} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-auto bg-muted p-4">
        <div
          className="w-full bg-card rounded-lg shadow-sm overflow-hidden"
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease-out'
          }}
        >
          <iframe
            src={previewUrl}
            title={filename}
            className="w-full border-0"
            style={{ height: 'calc(100vh - 13rem)', minHeight: '540px' }}
          />
        </div>
      </div>
    );
  };

  const renderUnsupportedView = () => (
    <div className="flex-1 flex items-center justify-center bg-muted">
      <div className="text-center max-w-md">
        <File className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No Inline Preview Data</h3>
        <p className="text-sm text-muted-foreground mb-4">
          This document does not currently have browser preview content. Use the toolbar download action to open the original file.
        </p>
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
