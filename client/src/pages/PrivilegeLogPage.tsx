import { useEffect, useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useRole } from '../hooks/useRole';
import PermissionDenied from '../components/ui/PermissionDenied';
import api from '../services/api';
import { analyticsService } from '../services/analytics.service';
import { ErrorState } from '../components/ui/ErrorState';

interface CaseSummary {
  id: string;
  caseName: string;
  caseNumber: string;
}

interface PrivilegeSummary {
  caseId: string;
  caseName: string;
  caseNumber: string;
  privileged: number;
  needsReview: number;
  totalDocuments: number;
}

const PrivilegeLogPage = () => {
  const { isAssociate, hasFullAccess } = useRole();
  const [rows, setRows] = useState<PrivilegeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPrivilegeLog = async () => {
      if (!isAssociate && !hasFullAccess) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const casesResponse = await api.get('/cases', {
          params: { status: 'ACTIVE', page: 1, limit: 100 }
        });

        const caseItems: CaseSummary[] = (casesResponse.data.cases || []).map((caseItem: any) => ({
          id: caseItem.id || caseItem._id,
          caseName: caseItem.caseName,
          caseNumber: caseItem.caseNumber
        }));

        const analytics = await Promise.all(caseItems.map(async (caseItem) => {
          try {
            const caseAnalytics = await analyticsService.getCaseAnalytics(caseItem.id);
            const privileged = caseAnalytics.privilegeBreakdown.ATTORNEY_CLIENT + caseAnalytics.privilegeBreakdown.WORK_PRODUCT;
            const needsReview = caseAnalytics.privilegeBreakdown.NEEDS_REVIEW;

            return {
              caseId: caseItem.id,
              caseName: caseItem.caseName,
              caseNumber: caseItem.caseNumber,
              privileged,
              needsReview,
              totalDocuments: caseAnalytics.totalDocuments,
            };
          } catch {
            return {
              caseId: caseItem.id,
              caseName: caseItem.caseName,
              caseNumber: caseItem.caseNumber,
              privileged: 0,
              needsReview: 0,
              totalDocuments: 0,
            };
          }
        }));

        setRows(analytics);
      } catch {
        setError('Unable to load privilege summaries for assigned cases.');
      } finally {
        setIsLoading(false);
      }
    };

    loadPrivilegeLog();
  }, [isAssociate, hasFullAccess]);

  if (!isAssociate && !hasFullAccess) {
    return <PermissionDenied requiredRole="ASSOCIATE, PARTNER, or ADMIN" />;
  }

  if (error && !isLoading) {
    return <ErrorState title="Privilege log unavailable" message={error} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Privilege Log</h1>
        <p className="text-muted-foreground mt-1">Case-level privilege posture for assignment triage and escalation.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No cases available</CardTitle>
            <CardDescription>No active cases were found for privilege log tracking.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Privilege Summary by Case</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.caseId} className="p-3 rounded-lg border border-border flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{row.caseName}</p>
                    <p className="text-xs text-muted-foreground">{row.caseNumber}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-destructive/12 text-destructive border-destructive/20">Privileged: {row.privileged}</Badge>
                    <Badge variant="outline" className="bg-warning/12 text-warning border-warning/20">Needs Review: {row.needsReview}</Badge>
                    <Badge variant="outline">Total Docs: {row.totalDocuments}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PrivilegeLogPage;
