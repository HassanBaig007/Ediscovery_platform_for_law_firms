import { useEffect, useState } from 'react';
import { Users, Loader2, ExternalLink, History, Ban } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useRole } from '../hooks/useRole';
import PermissionDenied from '../components/ui/PermissionDenied';
import api from '../services/api';
import { ErrorState } from '../components/ui/ErrorState';
import { useToastStore } from '../store/toastStore';
import { Input } from '../components/ui/Input';

interface CasePortalItem {
  id: string;
  caseName: string;
  caseNumber: string;
  status: string;
  clientName?: string;
}
interface CaseShare {
  id: string;
  recipientEmail: string;
  status: 'SENT' | 'FAILED' | 'REVOKED';
  createdAt: string;
}

type RawCase = {
  id?: string;
  _id?: string;
  caseName?: string;
  caseNumber?: string;
  status?: string;
  clientName?: string;
};

const ClientPortalPage = () => {
  const { isPartner, isAdmin } = useRole();
  const { addToast } = useToastStore();
  const [cases, setCases] = useState<CasePortalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareEmailByCase, setShareEmailByCase] = useState<Record<string, string>>({});
  const [isSharing, setIsSharing] = useState<Record<string, boolean>>({});
  const [sharesByCase, setSharesByCase] = useState<Record<string, CaseShare[]>>({});
  const [isLoadingSharesByCase, setIsLoadingSharesByCase] = useState<Record<string, boolean>>({});
  const [openSharesByCase, setOpenSharesByCase] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadCases = async () => {
      if (!isPartner && !isAdmin) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await api.get('/cases', {
          params: {
            status: 'All',
            page: 1,
            limit: 50,
            sortBy: 'createdAt',
            sortOrder: 'desc'
          }
        });

        const rawCases = (response.data.cases || []) as RawCase[];
        const mappedCases: CasePortalItem[] = rawCases.map((caseItem) => ({
          id: caseItem.id || caseItem._id || '',
          caseName: caseItem.caseName || 'Untitled Case',
          caseNumber: caseItem.caseNumber || '—',
          status: caseItem.status || 'ACTIVE',
          clientName: caseItem.clientName,
        })).filter((c) => Boolean(c.id));

        setCases(mappedCases);
      } catch {
        setError('Unable to load client portal case roster.');
      } finally {
        setIsLoading(false);
      }
    };

    loadCases();
  }, [isPartner, isAdmin]);

  if (!isPartner && !isAdmin) {
    return <PermissionDenied requiredRole="PARTNER or ADMIN" />;
  }

  if (error && !isLoading) {
    return <ErrorState title="Client portal unavailable" message={error} />;
  }

  const handleShare = async (caseId: string) => {
    const recipientEmail = (shareEmailByCase[caseId] || '').trim();
    if (!recipientEmail) {
      addToast({ title: 'Email required', message: 'Enter a recipient email before sharing.', type: 'error' });
      return;
    }

    setIsSharing((prev) => ({ ...prev, [caseId]: true }));
    try {
      await api.post('/client-portal/shares', { caseId, recipientEmail });
      addToast({ title: 'Share sent', message: 'Client portal snapshot shared successfully.', type: 'success' });
      setShareEmailByCase((prev) => ({ ...prev, [caseId]: '' }));
    } catch {
      addToast({ title: 'Share failed', message: 'Unable to share snapshot. Please try again.', type: 'error' });
    } finally {
      setIsSharing((prev) => ({ ...prev, [caseId]: false }));
    }
  };

  const loadShares = async (caseId: string) => {
    setIsLoadingSharesByCase((prev) => ({ ...prev, [caseId]: true }));
    try {
      const res = await api.get(`/client-portal/cases/${caseId}/shares`);
      const items = Array.isArray(res.data) ? res.data : [];
      const mapped: CaseShare[] = items.map((s: any) => ({
        id: s.id || s._id,
        recipientEmail: s.recipientEmail,
        status: s.status || 'SENT',
        createdAt: s.createdAt,
      }));
      setSharesByCase((prev) => ({ ...prev, [caseId]: mapped }));
    } catch {
      addToast({ title: 'Unable to load shares', type: 'error' });
    } finally {
      setIsLoadingSharesByCase((prev) => ({ ...prev, [caseId]: false }));
    }
  };

  const toggleShares = async (caseId: string) => {
    const willOpen = !openSharesByCase[caseId];
    setOpenSharesByCase((prev) => ({ ...prev, [caseId]: willOpen }));
    if (willOpen && !sharesByCase[caseId]) {
      await loadShares(caseId);
    }
  };

  const revokeShare = async (caseId: string, shareId: string) => {
    try {
      await api.patch(`/client-portal/shares/${shareId}/revoke`);
      setSharesByCase((prev) => ({
        ...prev,
        [caseId]: (prev[caseId] || []).map((s) => (s.id === shareId ? { ...s, status: 'REVOKED' } : s)),
      }));
      addToast({ title: 'Share revoked', type: 'success' });
    } catch {
      addToast({ title: 'Failed to revoke share', type: 'error' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-page-title">Client Portal</h1>
        <p className="text-page-subtitle mt-1">Client-facing case readiness overview for stakeholder communication.</p>
      </div>

      <Card className="bg-primary/10 border-primary/20">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-section-title text-primary">Cases Ready for Sharing</p>
            <p className="text-2xl font-bold text-foreground">{cases.length}</p>
          </div>
          <Users className="h-7 w-7 text-primary" />
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : cases.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No cases available</CardTitle>
            <CardDescription>There are no cases ready for client portal publication.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Client Visibility Queue</CardTitle>
            <CardDescription>Current matters and status prepared for partner-facing briefings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {cases.map((caseItem) => (
              <div key={caseItem.id} className="p-3 rounded-lg border border-border flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{caseItem.caseName}</p>
                  <p className="text-micro">{caseItem.caseNumber} {caseItem.clientName ? `• ${caseItem.clientName}` : ''}</p>
                  <div className="mt-2"><StatusBadge status={caseItem.status} /></div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Input
                    placeholder="client@example.com"
                    value={shareEmailByCase[caseItem.id] || ''}
                    onChange={(e) => setShareEmailByCase((prev) => ({ ...prev, [caseItem.id]: e.target.value }))}
                    className="h-9 text-sm md:w-52"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => handleShare(caseItem.id)}
                    disabled={Boolean(isSharing[caseItem.id])}
                  >
                    {isSharing[caseItem.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                    Share Snapshot
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    onClick={() => toggleShares(caseItem.id)}
                  >
                    <History className="h-4 w-4" />
                    Shares
                  </Button>
                </div>
                {openSharesByCase[caseItem.id] && (
                  <div className="md:col-span-2 w-full mt-2 border-t border-border pt-2 space-y-2">
                    {isLoadingSharesByCase[caseItem.id] ? (
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading shares...
                      </div>
                    ) : (sharesByCase[caseItem.id] || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No shares yet.</p>
                    ) : (
                      (sharesByCase[caseItem.id] || []).map((share) => (
                        <div key={share.id} className="flex items-center justify-between rounded-md border border-border px-2 py-1.5">
                          <div className="text-sm">
                            <span className="font-medium text-foreground">{share.recipientEmail}</span>
                            <span className="ml-2 text-muted-foreground">
                              {new Date(share.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={share.status} />
                            {share.status !== 'REVOKED' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={() => revokeShare(caseItem.id, share.id)}
                              >
                                <Ban className="h-3.5 w-3.5" />
                                Revoke
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientPortalPage;
