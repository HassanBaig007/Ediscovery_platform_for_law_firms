import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useRole } from '../hooks/useRole';
import PermissionDenied from '../components/ui/PermissionDenied';
import { analyticsService, CaseAnalytics } from '../services/analytics.service';
import { ErrorState } from '../components/ui/ErrorState';

const QualityControlPage = () => {
  const { id: caseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasFullAccess } = useRole();
  const [analytics, setAnalytics] = useState<CaseAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!caseId || !hasFullAccess) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await analyticsService.getCaseAnalytics(caseId);
        setAnalytics(data);
      } catch {
        setError('Unable to load quality control metrics for this case.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [caseId, hasFullAccess]);

  if (!hasFullAccess) {
    return <PermissionDenied requiredRole="ADMIN or PARTNER" />;
  }

  if (error && !isLoading) {
    return <ErrorState title="Quality control unavailable" message={error} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/cases/${caseId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Quality Control</h1>
          <p className="text-muted-foreground mt-1">Review coding consistency and unresolved privilege classifications.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-warning/10"><CardContent className="p-4"><p className="text-xs uppercase font-bold text-warning">Needs Privilege Review</p><p className="text-2xl font-bold">{analytics?.privilegeBreakdown.NEEDS_REVIEW ?? 0}</p></CardContent></Card>
            <Card className="bg-primary/10"><CardContent className="p-4"><p className="text-xs uppercase font-bold text-primary">Highly Relevant</p><p className="text-2xl font-bold">{analytics?.relevanceBreakdown.HIGHLY_RELEVANT ?? 0}</p></CardContent></Card>
            <Card className="bg-success/10"><CardContent className="p-4"><p className="text-xs uppercase font-bold text-success">Review Completion</p><p className="text-2xl font-bold">{analytics?.reviewProgress ?? 0}%</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CheckSquare className="h-5 w-5 text-primary" /> QC Checklist</CardTitle>
              <CardDescription>Operational checklist for partner/admin review pass.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg border border-border flex items-center justify-between">
                <span className="text-sm">Validate unresolved privilege items</span>
                <Badge variant="outline" className="bg-warning/12 text-warning border-warning/20">
                  {analytics?.privilegeBreakdown.NEEDS_REVIEW ?? 0} pending
                </Badge>
              </div>
              <div className="p-3 rounded-lg border border-border flex items-center justify-between">
                <span className="text-sm">Confirm review progress threshold</span>
                <Badge variant="outline">{analytics?.reviewProgress ?? 0}% complete</Badge>
              </div>
              <div className="p-3 rounded-lg border border-border flex items-center justify-between">
                <span className="text-sm">Assess high-risk relevance concentration</span>
                <Badge variant="outline" className="bg-primary/12 text-primary border-primary/20">
                  {analytics?.relevanceBreakdown.HIGHLY_RELEVANT ?? 0} flagged
                </Badge>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default QualityControlPage;
