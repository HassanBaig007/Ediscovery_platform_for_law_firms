import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Progress } from '../components/ui/Progress';
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
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-primary/10"><CardContent className="p-4"><p className="text-xs uppercase font-bold text-primary">Total Documents</p><p className="text-2xl font-bold">{analytics?.totalDocuments ?? 0}</p></CardContent></Card>
            <Card className="bg-success/10"><CardContent className="p-4"><p className="text-xs uppercase font-bold text-success">Reviewed</p><p className="text-2xl font-bold">{analytics?.reviewedDocuments ?? 0}</p></CardContent></Card>
            <Card className="bg-warning/10"><CardContent className="p-4"><p className="text-xs uppercase font-bold text-warning">Pending</p><p className="text-2xl font-bold">{analytics?.pendingDocuments ?? 0}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Processing Progress</CardTitle>
              <CardDescription>Completion percentage based on reviewed versus total documents.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={analytics?.reviewProgress ?? 0} className="h-3" />
              <p className="text-sm text-muted-foreground">{analytics?.reviewProgress ?? 0}% complete</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted flex items-center justify-between">
                  <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /><span className="text-sm">Ingestion Queue</span></div>
                  <span className="font-semibold">{(analytics?.pendingDocuments ?? 0) > 0 ? `${analytics?.pendingDocuments} pending` : 'All ingested'}</span>
                </div>
                <div className="p-3 rounded-lg bg-muted flex items-center justify-between">
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /><span className="text-sm">Review Throughput</span></div>
                  <span className="font-semibold">{(analytics?.reviewProgress ?? 0) >= 100 ? 'Complete' : (analytics?.reviewProgress ?? 0) >= 50 ? 'On track' : 'Needs attention'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ProcessingStatusPage;
