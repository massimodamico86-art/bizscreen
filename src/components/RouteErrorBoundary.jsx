import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { handleReactError } from '../utils/errorTracking.jsx';

/**
 * Lightweight per-route error boundary.
 *
 * Wraps individual page components so that a crash in one section
 * shows a scoped fallback card instead of taking down the entire app.
 * The root ErrorBoundary in main.jsx remains as the last-resort catch-all.
 *
 * Props:
 *  - name (string, optional): human-readable section name shown in the error card
 *  - children: the page content to protect
 */
export class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    handleReactError(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoToDashboard = () => {
    this.setState({ hasError: false, error: null });
    window.__setCurrentPage?.('dashboard');
  };

  render() {
    if (this.state.hasError) {
      const { error } = this.state;
      const sectionName = this.props.name || 'This section';

      return (
        <div className="flex items-center justify-center py-16 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
            <div className="w-12 h-12 bg-amber-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {sectionName} encountered an error
            </h3>

            <p className="text-sm text-gray-500 mb-4">
              {error?.message || 'An unexpected error occurred.'}
            </p>

            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>

              <button
                onClick={this.handleGoToDashboard}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Home className="w-4 h-4" />
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RouteErrorBoundary;
