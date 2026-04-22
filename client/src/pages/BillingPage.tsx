import { useEffect, useState } from 'react';
import { CreditCard, Receipt, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { useRole } from '../hooks/useRole';
import PermissionDenied from '../components/ui/PermissionDenied';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useToastStore } from '../store/toastStore';
import api from '../services/api';

const BillingPage = () => {
  const { hasFullAccess } = useRole();
  const { addToast } = useToastStore();
  const [isLoading, setIsLoading] = useState(true);
  const [billing, setBilling] = useState({
    currentPeriod: 'Monthly',
    monthlyCost: 0,
    outstandingBalance: 0,
    currency: 'USD',
    nextInvoiceDate: '',
  });

  useEffect(() => {
    const loadBilling = async () => {
      if (!hasFullAccess) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await api.get('/admin/billing');
        setBilling({
          currentPeriod: response.data.currentPeriod || 'Monthly',
          monthlyCost: Number(response.data.monthlyCost || 0),
          outstandingBalance: Number(response.data.outstandingBalance || 0),
          currency: response.data.currency || 'USD',
          nextInvoiceDate: response.data.nextInvoiceDate ? String(response.data.nextInvoiceDate).slice(0, 10) : '',
        });
      } catch {
        addToast({ title: 'Failed to load billing', message: 'Please refresh and try again.', type: 'error' });
      } finally {
        setIsLoading(false);
      }
    };
    loadBilling();
  }, [addToast, hasFullAccess]);

  const saveBilling = async () => {
    try {
      await api.put('/admin/billing', billing);
      addToast({ title: 'Billing updated', message: 'Billing summary saved successfully.', type: 'success' });
    } catch {
      addToast({ title: 'Failed to save billing', message: 'Please try again.', type: 'error' });
    }
  };

  if (!hasFullAccess) {
    return <PermissionDenied requiredRole="ADMIN or PARTNER" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-page-title">Billing</h1>
        <p className="text-page-subtitle mt-1">Subscription and invoicing controls for platform operations.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> Subscription Overview</CardTitle>
          <CardDescription>Billing integration is prepared and ready for backend plan APIs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="p-3 rounded-lg border border-border bg-muted flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading billing summary...</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input value={billing.currentPeriod} onChange={(e) => setBilling((p) => ({ ...p, currentPeriod: e.target.value }))} placeholder="Billing period" />
                <Input value={billing.currency} onChange={(e) => setBilling((p) => ({ ...p, currency: e.target.value }))} placeholder="Currency" />
                <Input type="number" value={billing.monthlyCost} onChange={(e) => setBilling((p) => ({ ...p, monthlyCost: Number(e.target.value) }))} placeholder="Monthly cost" />
                <Input type="number" value={billing.outstandingBalance} onChange={(e) => setBilling((p) => ({ ...p, outstandingBalance: Number(e.target.value) }))} placeholder="Outstanding balance" />
              </div>
              <Input type="date" value={billing.nextInvoiceDate} onChange={(e) => setBilling((p) => ({ ...p, nextInvoiceDate: e.target.value }))} />
              <div className="flex justify-end">
                <Button onClick={saveBilling}>
                  <Save className="h-4 w-4 mr-2" /> Save Billing
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingPage;
