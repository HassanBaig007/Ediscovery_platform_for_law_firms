import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface PermissionDeniedProps {
  requiredRole?: string;
}

const PermissionDenied: React.FC<PermissionDeniedProps> = ({ requiredRole }) => {
  return (
    <div className="max-w-xl mx-auto text-center py-16">
      <div className="flex items-center justify-center mb-6">
        <div className="p-4 bg-red-50 rounded-full">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
      </div>
      <h2 className="text-2xl font-semibold mb-2">Access restricted</h2>
      <p className="text-sm text-muted-foreground mb-6">
        You do not have the required permissions{requiredRole ? ` (required: ${requiredRole})` : ''} to view this page.
      </p>

      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={() => window.history.back()}>Go back</Button>
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </div>
    </div>
  );
};

export default PermissionDenied;
