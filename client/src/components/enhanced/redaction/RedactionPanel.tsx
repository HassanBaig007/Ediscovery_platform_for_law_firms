import { useState, useCallback, useEffect } from 'react';
import { Scissors, Trash2, CheckCircle, AlertCircle, Loader2, Plus, Shield } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { cn } from '../../../lib/utils';
import api from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';

interface RedactionArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Redaction {
  id: string;
  documentId: string;
  page: number;
  position: RedactionArea;
  reason: string;
  appliedBy: string;
  appliedAt: string;
  isApproved: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
}

interface RedactionPanelProps {
  documentId: string;
  className?: string;
}

const REDACTION_REASONS = [
  'Attorney-Client Privilege',
  'Work Product Doctrine',
  'Personal Information (PII)',
  'Trade Secret',
  'Confidential Business Information',
  'Irrelevant / Non-Responsive',
  'Other',
];

export const RedactionPanel = ({ documentId, className }: RedactionPanelProps) => {
  const [redactions, setRedactions] = useState<Redaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedReason, setSelectedReason] = useState(REDACTION_REASONS[0]);
  const [page, setPage] = useState(1);
  const [position, setPosition] = useState<RedactionArea>({ x: 0, y: 0, width: 100, height: 20 });
  const { addToast } = useToastStore();

  const loadRedactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/redaction/document/${documentId}`);
      setRedactions(res.data || []);
    } catch {
      // Endpoint may not exist yet — show empty state gracefully
      setRedactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    loadRedactions();
  }, [loadRedactions]);

  useEffect(() => {
    const handleDrawn = (e: Event) => {
      const customEvent = e as CustomEvent;
      setPosition(customEvent.detail.position);
      setIsAdding(true);
    };

    window.addEventListener('redaction-drawn', handleDrawn);
    return () => {
      window.removeEventListener('redaction-drawn', handleDrawn);
    };
  }, []);

  const handleApplyRedaction = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.post('/redaction/apply', {
        documentId,
        redaction: {
          documentId,
          page,
          position,
          reason: selectedReason,
          appliedAt: new Date().toISOString(),
          isApproved: false,
        },
      });
      setRedactions(prev => [...prev, res.data]);
      setIsAdding(false);
      window.dispatchEvent(new CustomEvent('redactions-changed'));
      addToast({ title: 'Redaction applied', type: 'success' });
    } catch (err: any) {
      addToast({
        title: err?.response?.data?.error || 'Failed to apply redaction',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [documentId, page, position, selectedReason, addToast]);

  const handleRemoveRedaction = useCallback(async (redactionId: string) => {
    setIsLoading(true);
    try {
      await api.delete(`/redaction/${redactionId}`, { params: { documentId } });
      setRedactions(prev => prev.filter(r => r.id !== redactionId));
      window.dispatchEvent(new CustomEvent('redactions-changed'));
      addToast({ title: 'Redaction removed', type: 'success' });
    } catch (err: any) {
      addToast({
        title: err?.response?.data?.error || 'Failed to remove redaction',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [addToast, documentId]);

  const handleApproveRedaction = useCallback(async (redactionId: string) => {
    setIsLoading(true);
    try {
      await api.post(`/redaction/approve/${redactionId}`, { documentId });
      setRedactions(prev =>
        prev.map(r => r.id === redactionId ? { ...r, isApproved: true } : r)
      );
      window.dispatchEvent(new CustomEvent('redactions-changed'));
      addToast({ title: 'Redaction approved', type: 'success' });
    } catch (err: any) {
      addToast({
        title: err?.response?.data?.error || 'Failed to approve redaction',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [addToast, documentId]);

  return (
    <div className={cn('flex flex-col h-full bg-card border-l border-border', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Scissors className="h-4 w-4 text-destructive" />
          <span className="text-sm font-semibold text-foreground">Redactions</span>
          {redactions.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {redactions.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadRedactions}
            disabled={isLoading}
            title="Refresh redactions"
          >
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Refresh'}
          </Button>
          <Button
            size="sm"
            onClick={() => setIsAdding(v => !v)}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {/* Add Redaction Form */}
      {isAdding && (
        <div className="p-4 border-b border-border bg-muted space-y-3 shrink-0">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            New Redaction
          </h4>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Reason</label>
            <select
              value={selectedReason}
              onChange={e => setSelectedReason(e.target.value)}
              className="w-full text-sm border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              aria-label="Redaction reason"
            >
              {REDACTION_REASONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Page</label>
            <input
              type="number"
              min={1}
              value={page}
              onChange={e => setPage(Number(e.target.value))}
              className="w-full text-sm border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              aria-label="Page number"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(['x', 'y', 'width', 'height'] as const).map(field => (
              <div key={field} className="space-y-1">
                <label className="text-xs text-muted-foreground capitalize">{field}</label>
                <input
                  type="number"
                  min={0}
                  value={position[field]}
                  onChange={e => setPosition(prev => ({ ...prev, [field]: Number(e.target.value) }))}
                  className="w-full text-sm border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  aria-label={`Redaction ${field}`}
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setIsAdding(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={handleApplyRedaction}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Apply
            </Button>
          </div>
        </div>
      )}

      {/* Redaction List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {redactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Shield className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-foreground">No redactions</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click "Add" to apply a redaction to this document.
            </p>
          </div>
        ) : (
          redactions.map(redaction => (
            <div
              key={redaction.id}
              className="bg-muted rounded-lg border border-border p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {redaction.reason}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Page {redaction.page} · ({redaction.position.x}, {redaction.position.y}) {redaction.position.width}×{redaction.position.height}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {redaction.isApproved ? (
                    <Badge
                      variant="outline"
                      className="text-xs bg-success/10 text-success border-success/20 flex items-center gap-1"
                    >
                      <CheckCircle className="h-3 w-3" />
                      Approved
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-xs bg-warning/10 text-warning border-warning/20 flex items-center gap-1"
                    >
                      <AlertCircle className="h-3 w-3" />
                      Pending
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex gap-1.5">
                {!redaction.isApproved && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-7 text-success border-success/30 hover:bg-success/10"
                    onClick={() => handleApproveRedaction(redaction.id)}
                    disabled={isLoading}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Approve
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'text-xs h-7 text-destructive border-destructive/30 hover:bg-destructive/10',
                    !redaction.isApproved ? 'flex-1' : 'w-full'
                  )}
                  onClick={() => handleRemoveRedaction(redaction.id)}
                  disabled={isLoading}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RedactionPanel;
