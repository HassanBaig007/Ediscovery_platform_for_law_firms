import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Toast as ToastType } from '../../store/toastStore';
import { cn } from '../../lib/utils';
import { Button } from './Button';

interface ToastProps {
  toast: ToastType;
  onRemove: (id: string) => void;
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles = {
  success: 'bg-success/10 border-success/20 text-success',
  error: 'bg-destructive/10 border-destructive/20 text-destructive',
  warning: 'bg-warning/10 border-warning/20 text-warning',
  info: 'bg-info/10 border-info/20 text-info',
};

const iconStyles = {
  success: 'text-success',
  error: 'text-destructive',
  warning: 'text-warning',
  info: 'text-info',
};

export function Toast({ toast, onRemove }: ToastProps) {
  const Icon = icons[toast.type];

  return (
    <div
      className={cn(
        'pointer-events-auto w-full max-w-sm rounded-lg border p-4 shadow-lg',
        'transform transition-all duration-300 ease-out',
        styles[toast.type]
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', iconStyles[toast.type])} />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold">{toast.title}</h4>
          {toast.message && (
            <p className="text-sm mt-1 opacity-90">{toast.message}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 -mr-1 -mt-1 opacity-60 hover:opacity-100"
          onClick={() => onRemove(toast.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
