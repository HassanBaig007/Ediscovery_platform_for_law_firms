import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * React Error Boundary — catches uncaught errors in the component tree and
 * renders a graceful fallback UI instead of crashing the entire application.
 * Must be a class component per React API requirements.
 */
class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleDismiss = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-background flex items-center justify-center p-6">
                    <div className="max-w-md w-full text-center space-y-6">
                        <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                            <AlertTriangle className="h-8 w-8 text-destructive" />
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                Something went wrong
                            </h1>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                An unexpected error occurred. You can try reloading the page or
                                dismissing this error to continue.
                            </p>
                        </div>

                        {this.state.error && (
                            <div className="bg-muted/50 border border-border rounded-lg p-3 text-left">
                                <p className="text-xs font-mono text-muted-foreground break-all">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}

                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={this.handleDismiss}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                                Dismiss
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Reload Page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
