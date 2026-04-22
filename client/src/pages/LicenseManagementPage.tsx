import { useEffect, useState } from 'react';
import { ShieldCheck, KeyRound, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { useRole } from '../hooks/useRole';
import PermissionDenied from '../components/ui/PermissionDenied';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useToastStore } from '../store/toastStore';
import api from '../services/api';

const LicenseManagementPage = () => {
  const { isAdmin } = useRole();
  const { addToast } = useToastStore();
  const [isLoading, setIsLoading] = useState(true);
  const [license, setLicense] = useState({
    planName: 'Enterprise',
    seatsTotal: 50,
    seatsUsed: 0,
    renewalDate: '',
    status: 'ACTIVE',
  });

  useEffect(() => {
    const loadLicense = async () => {
      if (!isAdmin) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await api.get('/admin/license');
        setLicense({
          planName: response.data.planName || 'Enterprise',
          seatsTotal: Number(response.data.seatsTotal || 0),
          seatsUsed: Number(response.data.seatsUsed || 0),
          renewalDate: response.data.renewalDate ? String(response.data.renewalDate).slice(0, 10) : '',
          status: response.data.status || 'ACTIVE',
        });
      } catch {
        addToast({ title: 'Failed to load license', message: 'Please refresh and try again.', type: 'error' });
      } finally {
        setIsLoading(false);
      }
    };
    loadLicense();
  }, [addToast, isAdmin]);

  const saveLicense = async () => {
    try {
      await api.put('/admin/license', license);
      addToast({ title: 'License updated', message: 'License state saved successfully.', type: 'success' });
    } catch {
      addToast({ title: 'Failed to save license', message: 'Please try again.', type: 'error' });
    }
  };

  if (!isAdmin) {
    return <PermissionDenied requiredRole="ADMIN" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-page-title">License Management</h1>
        <p className="text-page-subtitle mt-1">Track seats, entitlements, and renewal status.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Entitlements</CardTitle>
          <CardDescription>Monitor role seat limits and license lifecycle state.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="p-3 rounded-lg border border-border bg-muted flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading license state...</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input value={license.planName} onChange={(e) => setLicense((p) => ({ ...p, planName: e.target.value }))} placeholder="Plan name" />
                <Input type="date" value={license.renewalDate} onChange={(e) => setLicense((p) => ({ ...p, renewalDate: e.target.value }))} />
                <Input type="number" value={license.seatsTotal} onChange={(e) => setLicense((p) => ({ ...p, seatsTotal: Number(e.target.value) }))} placeholder="Seats total" />
                <Input type="number" value={license.seatsUsed} onChange={(e) => setLicense((p) => ({ ...p, seatsUsed: Number(e.target.value) }))} placeholder="Seats used" />
              </div>
              <select
                value={license.status}
                onChange={(e) => setLicense((p) => ({ ...p, status: e.target.value }))}
                className="w-full px-3 py-2 rounded-md border border-border bg-card text-sm"
                title="License status"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="EXPIRING">EXPIRING</option>
                <option value="EXPIRED">EXPIRED</option>
              </select>
              <div className="flex justify-end">
                <Button onClick={saveLicense}>
                  <Save className="h-4 w-4 mr-2" /> Save License
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LicenseManagementPage;
