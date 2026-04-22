import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useRole } from '../hooks/useRole';
import PermissionDenied from '../components/ui/PermissionDenied';
import { analyticsService, CaseAnalytics } from '../services/analytics.service';
import { ErrorState } from '../components/ui/ErrorState';

const ProcessingStatusPage = () => {
  const { id: caseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canUpload, hasFullAccess } = useRole();
  const [analytics, setAnalytics] = useState<CaseAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStatus = async () => {
      if (!caseId || (!canUpload && !hasFullAccess)) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await analyticsService.getCaseAnalytics(caseId);
        setAnalytics(response);
      } catch {
        setError('Unable to load processing status for this case.');
      } finally {
        setIsLoading(false);
      }
    };

    loadStatus();
  }, [caseId, canUpload, hasFullAccess]);

  if (!canUpload && !hasFullAccess) {
    return <PermissionDenied requiredRole="ADMIN, PARTNER, or PARALEGAL" />;
  }

  if (error && !isLoading) {
    return <ErrorState title="Processing status unavailable" message={error} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/cases/${caseId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Processing Status</h1>
          <p className="text-muted-foreground mt-1">Track ingestion and review completion for this case.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Processing Status</CardTitle>
            <CardDescription>Live queue counters were removed from this page to avoid misleading mock-style values.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {analytics && analytics.totalDocuments > 0
                ? 'Documents are available in this case. Use the data grid for real-time ingestion and review state.'
                : 'No documents have been ingested in this case yet.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate(`/cases/${caseId}`)}>Back to Case</Button>
              <Button onClick={() => navigate(`/cases/${caseId}/search`)}>Open Data Grid</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProcessingStatusPage;
