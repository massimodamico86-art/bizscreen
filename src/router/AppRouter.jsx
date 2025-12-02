/**
 * AppRouter - Main router with marketing, auth, and app routes
 */

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Marketing pages
import MarketingLayout from '../marketing/MarketingLayout';
import HomePage from '../marketing/HomePage';
import PricingPage from '../marketing/PricingPage';
import FeaturesPage from '../marketing/FeaturesPage';

// Auth pages
import LoginPage from '../auth/LoginPage';
import SignupPage from '../auth/SignupPage';
import ResetPasswordPage from '../auth/ResetPasswordPage';
import UpdatePasswordPage from '../auth/UpdatePasswordPage';
import AuthCallbackPage from '../auth/AuthCallbackPage';
import AcceptInvitePage from '../auth/AcceptInvitePage';

// App (lazy loaded)
const App = lazy(() => import('../App'));
const TV = lazy(() => import('../TV'));
const Player = lazy(() => import('../Player'));
const PublicPreviewPage = lazy(() => import('../pages/PublicPreviewPage'));

// Loading fallback
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

// Protected route wrapper
function RequireAuth({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  return children;
}

// Redirect authenticated users away from public pages
function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  // If logged in, redirect to app
  if (user) {
    return <Navigate to="/app" replace />;
  }

  return children;
}

// Marketing page wrapper
function MarketingPage({ children }) {
  return (
    <MarketingLayout>
      {children}
    </MarketingLayout>
  );
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Marketing Routes (logged out) */}
      <Route
        path="/"
        element={
          <PublicRoute>
            <MarketingPage>
              <HomePage />
            </MarketingPage>
          </PublicRoute>
        }
      />
      <Route
        path="/pricing"
        element={
          <MarketingPage>
            <PricingPage />
          </MarketingPage>
        }
      />
      <Route
        path="/features"
        element={
          <MarketingPage>
            <FeaturesPage />
          </MarketingPage>
        }
      />

      {/* Auth Routes */}
      <Route
        path="/auth/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/auth/signup"
        element={
          <PublicRoute>
            <SignupPage />
          </PublicRoute>
        }
      />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/update-password" element={<UpdatePasswordPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/auth/accept-invite" element={<AcceptInvitePage />} />

      {/* App Routes (protected) */}
      <Route
        path="/app/*"
        element={
          <RequireAuth>
            <Suspense fallback={<LoadingSpinner />}>
              <App />
            </Suspense>
          </RequireAuth>
        }
      />

      {/* Player Routes (public - for TVs) */}
      <Route
        path="/tv/*"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <TV />
          </Suspense>
        }
      />
      <Route
        path="/player/*"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <Player />
          </Suspense>
        }
      />

      {/* Public Preview Routes (no auth - token-based access) */}
      <Route
        path="/preview/:token"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <PublicPreviewPage />
          </Suspense>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
