import { useEffect, useState } from 'react';
import { Link2, PlugZap, Plus, Power, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useRole } from '../hooks/useRole';
import PermissionDenied from '../components/ui/PermissionDenied';
import { useToastStore } from '../store/toastStore';
import api from '../services/api';

interface Integration {
  id: string;
  name: string;
  provider: string;
  endpoint?: string;
  isEnabled: boolean;
  status: 'CONNECTED' | 'DISCONNECTED';
}

const normalizeIntegration = (raw: any): Integration => ({
  id: raw.id || raw._id,
  name: raw.name,
  provider: raw.provider,
  endpoint: raw.endpoint,
  isEnabled: Boolean(raw.isEnabled),
  status: raw.status || (raw.isEnabled ? 'CONNECTED' : 'DISCONNECTED'),
});

const IntegrationsPage = () => {
  const { isAdmin } = useRole();
  const { addToast } = useToastStore();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newIntegration, setNewIntegration] = useState({
    name: '',
    provider: '',
    endpoint: ''
  });

  const fetchIntegrations = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/admin/integrations');
      const items = Array.isArray(response.data) ? response.data : [];
      setIntegrations(items.map(normalizeIntegration));
    } catch {
      addToast({
        title: 'Failed to load integrations',
        message: 'Please refresh and try again.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchIntegrations();
    }
  }, [isAdmin]);

  const handleCreate = async () => {
    if (!newIntegration.name || !newIntegration.provider) {
      return;
    }
    try {
      const response = await api.post('/admin/integrations', newIntegration);
      setIntegrations([normalizeIntegration(response.data), ...integrations]);
      setNewIntegration({ name: '', provider: '', endpoint: '' });
      addToast({ title: 'Integration created', message: 'Integration added to registry.', type: 'success' });
    } catch {
      addToast({ title: 'Failed to create integration', message: 'Please try again.', type: 'error' });
    }
  };

  const handleToggle = async (item: Integration) => {
    try {
      const response = await api.put(`/admin/integrations/${item.id}`, { isEnabled: !item.isEnabled });
      const updated = normalizeIntegration(response.data);
      setIntegrations(integrations.map((integration) => integration.id === item.id ? updated : integration));
    } catch {
      addToast({ title: 'Failed to update integration', message: 'Please try again.', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/integrations/${id}`);
      setIntegrations(integrations.filter((item) => item.id !== id));
    } catch {
      addToast({ title: 'Failed to delete integration', message: 'Please try again.', type: 'error' });
    }
  };

  if (!isAdmin) {
    return <PermissionDenied requiredRole="ADMIN" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-page-title">Integrations</h1>
        <p className="text-page-subtitle mt-1">Manage external service connectors and platform webhooks.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PlugZap className="h-5 w-5 text-primary" /> Integration Registry</CardTitle>
          <CardDescription>Configure external connectors used by ingestion and reporting workflows.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input
              placeholder="Name"
              value={newIntegration.name}
              onChange={(e) => setNewIntegration((prev) => ({ ...prev, name: e.target.value }))}
            />
            <Input
              placeholder="Provider"
              value={newIntegration.provider}
              onChange={(e) => setNewIntegration((prev) => ({ ...prev, provider: e.target.value }))}
            />
            <Input
              placeholder="Endpoint (optional)"
              value={newIntegration.endpoint}
              onChange={(e) => setNewIntegration((prev) => ({ ...prev, endpoint: e.target.value }))}
            />
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>

          {isLoading ? (
            <div className="p-3 rounded-lg border border-border bg-muted text-sm text-muted-foreground">
              Loading integrations...
            </div>
          ) : integrations.length === 0 ? (
            <div className="p-3 rounded-lg border border-border bg-muted flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">No integrations configured yet.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {integrations.map((item) => (
                <div key={item.id} className="p-3 rounded-lg border border-border flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-micro">{item.provider}{item.endpoint ? ` • ${item.endpoint}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-micro">{item.status}</span>
                    <Button variant="outline" size="sm" onClick={() => handleToggle(item)}>
                      <Power className="h-3.5 w-3.5 mr-1" /> {item.isEnabled ? 'Disable' : 'Enable'}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default IntegrationsPage;
