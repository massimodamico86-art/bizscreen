import { Component } from 'react';
import { handleReactError } from '../utils/errorTracking.jsx';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Store error info for display
    this.setState({ errorInfo });
    // Log to centralized error tracking (will report to backend in production)
    handleReactError(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, showDetails } = this.state;
      const currentRoute = typeof window !== 'undefined' ? window.location.pathname : 'unknown';

      return (
        <div className="flex h-screen items-center justify-center bg-gray-50 p-4">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Something Went Wrong</h2>
              <p className="text-gray-600">
                We encountered an unexpected error. Please try refreshing the page.
              </p>
            </div>

            {/* Error Summary */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-red-800 mb-1">Error Message:</p>
              <p className="text-sm text-red-700 font-mono break-words">
                {error?.message || 'Unknown error'}
              </p>
              <p className="text-xs text-red-600 mt-2">
                Route: <span className="font-mono">{currentRoute}</span>
              </p>
            </div>

            {/* Toggle for detailed info */}
            <button
              onClick={this.toggleDetails}
              className="w-full text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center justify-center gap-1"
            >
              {showDetails ? 'Hide' : 'Show'} Technical Details
              <svg
                className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Detailed Error Info (collapsible) */}
            {showDetails && (
              <div className="bg-gray-100 rounded-lg p-4 mb-4 max-h-64 overflow-auto">
                {/* Component Stack */}
                {errorInfo?.componentStack && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-700 mb-1">Component Stack:</p>
                    <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap break-words">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
                {/* Error Stack */}
                {error?.stack && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Error Stack:</p>
                    <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap break-words">
                      {error.stack}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={this.handleRetry}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Reload Page
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Go Home
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
