import { useEffect, useState } from 'react';
import { Save, Shield, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Toggle } from '../components/ui/Toggle';
import { useRole } from '../hooks/useRole';
import PermissionDenied from '../components/ui/PermissionDenied';
import { useToastStore } from '../store/toastStore';
import api from '../services/api';

const SystemSettingsPage = () => {
  const { isAdmin } = useRole();
  const { addToast } = useToastStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    strictSessionTimeout: true,
    allowSelfRegistration: false,
    auditRetentionEnabled: true,
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await api.get('/admin/system-settings');
        setSettings({
          maintenanceMode: Boolean(response.data.maintenanceMode),
          strictSessionTimeout: Boolean(response.data.strictSessionTimeout),
          allowSelfRegistration: Boolean(response.data.allowSelfRegistration),
          auditRetentionEnabled: Boolean(response.data.auditRetentionEnabled),
        });
      } catch {
        addToast({
          title: 'Unable to load settings',
          message: 'Using current local values.',
          type: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (isAdmin) {
      loadSettings();
    }
  }, [isAdmin, addToast]);

  if (!isAdmin) {
    return <PermissionDenied requiredRole="ADMIN" />;
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.put('/admin/system-settings', settings);
      addToast({
        title: 'System settings saved',
        message: 'Settings were persisted successfully.',
        type: 'success'
      });
    } catch {
      addToast({
        title: 'Failed to save settings',
        message: 'Please try again.',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-page-title">System Settings</h1>
        <p className="text-page-subtitle mt-1">Control platform-wide operational and security defaults.</p>
      </div>

      {isLoading && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">Loading current settings...</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" /> Platform Configuration
          </CardTitle>
          <CardDescription>Global flags that affect platform behavior for all users.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
            <div>
              <p className="font-medium text-foreground">Maintenance Mode</p>
              <p className="text-sm text-muted-foreground">Temporarily pause normal operations for planned maintenance.</p>
            </div>
            <Toggle
              id="maintenanceMode"
              checked={settings.maintenanceMode}
              onChange={(checked) => setSettings((prev) => ({ ...prev, maintenanceMode: checked }))}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
            <div>
              <p className="font-medium text-foreground">Allow Self Registration</p>
              <p className="text-sm text-muted-foreground">Permit user self-signup without admin invitation.</p>
            </div>
            <Toggle
              id="allowSelfRegistration"
              checked={settings.allowSelfRegistration}
              onChange={(checked) => setSettings((prev) => ({ ...prev, allowSelfRegistration: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Security & Compliance
          </CardTitle>
          <CardDescription>Security controls for session handling and audit traceability.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
            <div>
              <p className="font-medium text-foreground">Strict Session Timeout</p>
              <p className="text-sm text-muted-foreground">Force short idle timeouts for privileged users.</p>
            </div>
            <Toggle
              id="strictSessionTimeout"
              checked={settings.strictSessionTimeout}
              onChange={(checked) => setSettings((prev) => ({ ...prev, strictSessionTimeout: checked }))}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
            <div>
              <p className="font-medium text-foreground">Audit Retention Guard</p>
              <p className="text-sm text-muted-foreground">Prevent accidental purge of historical audit records.</p>
            </div>
            <Toggle
              id="auditRetentionEnabled"
              checked={settings.auditRetentionEnabled}
              onChange={(checked) => setSettings((prev) => ({ ...prev, auditRetentionEnabled: checked }))}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} className="gap-2" disabled={isSaving || isLoading}>
              <Save className="h-4 w-4" /> Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemSettingsPage;
