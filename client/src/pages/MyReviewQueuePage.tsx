import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Search, FileText, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useRole } from '../hooks/useRole';
import PermissionDenied from '../components/ui/PermissionDenied';
import { ErrorState } from '../components/ui/ErrorState';
import api from '../services/api';

interface CaseQueueItem {
  id: string;
  caseName: string;
  caseNumber: string;
  status: string;
  clientName?: string;
}

const MyReviewQueuePage = () => {
  const navigate = useNavigate();
  const { isAssociate } = useRole();
  const [queueCases, setQueueCases] = useState<CaseQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadQueue = async () => {
      if (!isAssociate) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await api.get('/review/my-queue');

        const items = Array.isArray(response.data) ? response.data : [];
        const mappedCases: CaseQueueItem[] = items.map((caseItem: any) => ({
          id: caseItem.id || caseItem._id,
          caseName: caseItem.caseName,
          caseNumber: caseItem.caseNumber,
          status: caseItem.status,
          clientName: caseItem.clientName
        }));

        setQueueCases(mappedCases);
      } catch {
        setError('Unable to load your review queue.');
      } finally {
        setIsLoading(false);
      }
    };

    loadQueue();
  }, [isAssociate]);

  if (!isAssociate) {
    return <PermissionDenied requiredRole="ASSOCIATE" />;
  }

  if (error && !isLoading) {
    return <ErrorState title="Review queue unavailable" message={error} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">My Review Queue</h1>
        <p className="text-muted-foreground mt-1">Prioritized review entry points for your assigned active cases.</p>
      </div>

      <Card className="bg-primary/10 border-primary/20">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-bold text-primary">Assigned Active Cases</p>
            <p className="text-2xl font-bold text-foreground">{queueCases.length}</p>
          </div>
          <CheckCircle2 className="h-7 w-7 text-primary" />
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : queueCases.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No active review assignments</CardTitle>
            <CardDescription>You currently have no active cases assigned for review.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-3">
          {queueCases.map((caseItem) => (
            <Card key={caseItem.id}>
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{caseItem.caseName}</p>
                  <p className="text-sm text-muted-foreground">{caseItem.caseNumber} {caseItem.clientName ? `• ${caseItem.clientName}` : ''}</p>
                  <div className="mt-2"><StatusBadge status={caseItem.status} /></div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate(`/cases/${caseItem.id}/search`)}>
                    <Search className="h-4 w-4 mr-1" /> Search
                  </Button>
                  <Button size="sm" onClick={() => navigate(`/cases/${caseItem.id}/review`)}>
                    <FileText className="h-4 w-4 mr-1" /> Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyReviewQueuePage;
