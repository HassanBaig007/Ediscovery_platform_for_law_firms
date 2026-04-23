import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { Card, CardContent } from './Card';
import { CONTENT_TONE } from '../../lib/content';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = `We encountered an error while loading your data. ${CONTENT_TONE.retryHint}`,
  onRetry,
  className = ''
}: ErrorStateProps) {
  return (
    <Card className={`border-destructive/20 bg-destructive/5 ${className}`}>
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-6">{message}</p>
        {onRetry && (
          <Button
            variant="outline"
            onClick={onRetry}
            className="border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
