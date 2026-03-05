'use client';

import { Component, ReactNode, ErrorInfo } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class DashboardErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error to monitoring service
        console.error('Dashboard Error Boundary caught an error:', error, errorInfo);
        
        this.setState({
            error,
            errorInfo,
        });

        // Here you could also send to error tracking service like Sentry
        // if (typeof window !== 'undefined' && window.Sentry) {
        //     window.Sentry.captureException(error, { extra: errorInfo });
        // }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            return (
                <div className="min-h-[60vh] flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-10 h-10 text-red-600" />
                        </div>
                        
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">
                            Oops! Something went wrong
                        </h2>
                        
                        <p className="text-slate-500 mb-6">
                            We apologize for the inconvenience. An unexpected error has occurred in the dashboard.
                        </p>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="mb-6 p-4 bg-slate-50 rounded-lg text-left overflow-auto max-h-48">
                                <p className="text-sm font-mono text-red-600">
                                    {this.state.error.toString()}
                                </p>
                                {this.state.errorInfo && (
                                    <pre className="text-xs text-slate-500 mt-2 whitespace-pre-wrap">
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                )}
                            </div>
                        )}

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={this.handleReset}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors"
                            >
                                <RefreshCcw className="w-5 h-5" />
                                Reload Dashboard
                            </button>
                            
                            <button
                                onClick={() => window.location.href = '/dashboard'}
                                className="w-full px-6 py-3 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors"
                            >
                                Go to Home
                            </button>
                        </div>

                        <p className="mt-6 text-sm text-slate-400">
                            If this problem persists, please contact support.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// Hook for error tracking in functional components
export function useErrorHandler() {
    return (error: Error, errorInfo?: ErrorInfo) => {
        console.error('Error caught by handler:', error, errorInfo);
        // Here you could send to error tracking service
    };
}
