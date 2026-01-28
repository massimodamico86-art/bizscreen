/**
 * AppRouter - Main router with marketing, auth, and app routes
 *
 * Performance optimizations:
 * - All pages are lazy loaded for optimal code splitting
 * - Marketing pages load separately from app pages
 * - Auth pages are in their own chunks
 */

import { lazy } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Marketing pages (lazy loaded)
const MarketingLayout = lazy(() => import('../marketing/MarketingLayout'));
const HomePage = lazy(() => import('../marketing/HomePage'));
const PricingPage = lazy(() => import('../marketing/PricingPage'));
const FeaturesPage = lazy(() => import('../marketing/FeaturesPage'));

// Auth pages (lazy loaded)
const LoginPage = lazy(() => import('../auth/LoginPage'));
const SignupPage = lazy(() => import('../auth/SignupPage'));
const ResetPasswordPage = lazy(() => import('../auth/ResetPasswordPage'));
const UpdatePasswordPage = lazy(() => import('../auth/UpdatePasswordPage'));
const AuthCallbackPage = lazy(() => import('../auth/AuthCallbackPage'));
const AcceptInvitePage = lazy(() => import('../auth/AcceptInvitePage'));

// App (lazy loaded)
const App = lazy(() => import('../App'));
const TV = lazy(() => import('../TV'));
const Player = lazy(() => import('../Player'));
const PublicPreviewPage = lazy(() => import('../pages/PublicPreviewPage'));
const PairDevicePage = lazy(() => import('../pages/PairDevicePage'));
const ContentDetailAnalyticsPage = lazy(() => import('../pages/ContentDetailAnalyticsPage'));

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

// Marketing page wrapper with Suspense for lazy loaded layout
function MarketingPage({ children }) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <MarketingLayout>
        {children}
      </MarketingLayout>
    </Suspense>
  );
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Marketing Routes (logged out) - all lazy loaded */}
      <Route
        path="/"
        element={
          <PublicRoute>
            <MarketingPage>
              <Suspense fallback={<LoadingSpinner />}>
                <HomePage />
              </Suspense>
            </MarketingPage>
          </PublicRoute>
        }
      />
      <Route
        path="/pricing"
        element={
          <MarketingPage>
            <Suspense fallback={<LoadingSpinner />}>
              <PricingPage />
            </Suspense>
          </MarketingPage>
        }
      />
      <Route
        path="/features"
        element={
          <MarketingPage>
            <Suspense fallback={<LoadingSpinner />}>
              <FeaturesPage />
            </Suspense>
          </MarketingPage>
        }
      />

      {/* Auth Routes - all lazy loaded */}
      <Route
        path="/auth/login"
        element={
          <PublicRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <LoginPage />
            </Suspense>
          </PublicRoute>
        }
      />
      <Route
        path="/auth/signup"
        element={
          <PublicRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <SignupPage />
            </Suspense>
          </PublicRoute>
        }
      />
      <Route path="/auth/reset-password" element={<Suspense fallback={<LoadingSpinner />}><ResetPasswordPage /></Suspense>} />
      <Route path="/auth/update-password" element={<Suspense fallback={<LoadingSpinner />}><UpdatePasswordPage /></Suspense>} />
      <Route path="/auth/callback" element={<Suspense fallback={<LoadingSpinner />}><AuthCallbackPage /></Suspense>} />
      <Route path="/auth/accept-invite" element={<Suspense fallback={<LoadingSpinner />}><AcceptInvitePage /></Suspense>} />

      {/* Device Pairing Route (protected - requires auth) */}
      <Route
        path="/pair/:deviceId"
        element={
          <RequireAuth>
            <Suspense fallback={<LoadingSpinner />}>
              <PairDevicePage />
            </Suspense>
          </RequireAuth>
        }
      />

      {/* Content Detail Analytics Route (protected - requires auth) */}
      <Route
        path="/analytics/content/:contentType/:contentId"
        element={
          <RequireAuth>
            <Suspense fallback={<LoadingSpinner />}>
              <ContentDetailAnalyticsPage />
            </Suspense>
          </RequireAuth>
        }
      />

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
