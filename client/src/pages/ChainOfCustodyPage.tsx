import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Users, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useRole } from '../hooks/useRole';
import PermissionDenied from '../components/ui/PermissionDenied';
import { ErrorState } from '../components/ui/ErrorState';
import api from '../services/api';

interface Custodian {
  id: string;
  name: string;
  email: string;
  department?: string;
  title?: string;
  documentCount?: number;
}

const ChainOfCustodyPage = () => {
  const { id: caseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canUpload, hasFullAccess } = useRole();
  const [custodians, setCustodians] = useState<Custodian[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCustodians = async () => {
      if (!caseId || (!canUpload && !hasFullAccess)) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await api.get(`/cases/${caseId}/custodians`);
        const mapped: Custodian[] = (response.data || []).map((custodian: any) => ({
          id: custodian.id || custodian._id,
          name: custodian.name,
          email: custodian.email,
          department: custodian.department,
          title: custodian.title,
          documentCount: custodian.documentCount || 0,
        }));
        setCustodians(mapped);
      } catch {
        setError('Unable to load custodial chain data for this case.');
      } finally {
        setIsLoading(false);
      }
    };

    loadCustodians();
  }, [caseId, canUpload, hasFullAccess]);

  const totals = useMemo(() => {
    return custodians.reduce((sum, custodian) => sum + (custodian.documentCount || 0), 0);
  }, [custodians]);

  if (!canUpload && !hasFullAccess) {
    return <PermissionDenied requiredRole="ADMIN, PARTNER, or PARALEGAL" />;
  }

  if (error && !isLoading) {
    return <ErrorState title="Chain of custody unavailable" message={error} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/cases/${caseId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Chain of Custody</h1>
          <p className="text-muted-foreground mt-1">Custodian ownership records and document responsibility tracking.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-primary/10"><CardContent className="p-4"><p className="text-xs uppercase font-bold text-primary">Custodians</p><p className="text-2xl font-bold">{custodians.length}</p></CardContent></Card>
            <Card className="bg-success/10"><CardContent className="p-4"><p className="text-xs uppercase font-bold text-success">Linked Documents</p><p className="text-2xl font-bold">{totals.toLocaleString()}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Custodian Timeline</CardTitle>
              <CardDescription>Current custodial owners with department metadata and document load counts.</CardDescription>
            </CardHeader>
            <CardContent>
              {custodians.length === 0 ? (
                <p className="text-sm text-muted-foreground">No custodians have been registered for this case.</p>
              ) : (
                <div className="space-y-3">
                  {custodians.map((custodian) => (
                    <div key={custodian.id} className="p-3 rounded-lg border border-border flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">{custodian.name}</p>
                        <p className="text-xs text-muted-foreground">{custodian.email}</p>
                        <p className="text-xs text-muted-foreground">{custodian.department || 'No department'} {custodian.title ? `• ${custodian.title}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <ShieldCheck className="h-4 w-4 text-success" />
                        <span className="font-semibold">{custodian.documentCount || 0} documents</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ChainOfCustodyPage;
