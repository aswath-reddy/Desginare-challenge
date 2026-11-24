import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
  isPermissionError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
    isPermissionError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    let message = error.message || 'An unexpected error occurred.';
    let isPerm = false;
    try {
      const parsed = JSON.parse(message);
      if (parsed && typeof parsed.error === 'string') {
        message = parsed.error;
        isPerm = message.toLowerCase().includes('permission');
      }
    } catch {
      isPerm = message.toLowerCase().includes('permission');
    }
    return {
      hasError: true,
      errorMessage: message,
      isPermissionError: isPerm,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('PlusOne boundary caught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8F6F0] text-[#080808] flex items-center justify-center px-6 py-12">
          <div className="max-w-md w-full bg-white border border-[#E5E3DD] rounded-[24px] p-8 sm:p-10 text-center">
            <AlertCircle
              className="w-7 h-7 text-[#080808] mx-auto mb-5"
              strokeWidth={1.5}
            />
            <h1 className="font-display text-2xl font-semibold tracking-[-0.025em] mb-2">
              {this.state.isPermissionError
                ? 'Access restricted'
                : 'Something interrupted this view'}
            </h1>
            <p className="text-sm text-[#747474] leading-relaxed mb-7">
              {this.state.isPermissionError
                ? 'Your account does not have permission for that record, or your email verification needs a quick refresh.'
                : this.state.errorMessage}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => window.location.assign('/discover')}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#080808] text-[#F8F6F0] px-6 py-2.5 text-sm font-medium hover:bg-[#222] active:scale-[0.98] transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Return to Discover
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center rounded-full border border-[#E5E3DD] bg-white text-[#080808] px-6 py-2.5 text-sm font-medium hover:bg-[#F0EEE8] active:scale-[0.98] transition-all cursor-pointer"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
