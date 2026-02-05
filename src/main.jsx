import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "@smastrom/react-rating/style.css";
import ErrorBoundary from "./components/ErrorBoundary";
import { I18nProvider } from "./i18n/I18nContext";
import { AuthProvider } from "./contexts/AuthContext";
import { FeatureFlagProvider } from "./hooks/useFeatureFlag";
import AppRouter from "./router/AppRouter";

// Global handler for uncaught promise rejections
// These don't trigger React's ErrorBoundary, so we need to handle them separately
window.addEventListener('unhandledrejection', (event) => {
  // Log the error for debugging
  console.error('[UnhandledRejection]', event.reason);

  // Prevent the default behavior (console error) since we're handling it
  // But don't call event.preventDefault() - let it still log to console

  // Check if this is an auth-related error we should ignore gracefully
  const errorMessage = event.reason?.message || String(event.reason);
  const isAuthTimeout = errorMessage.includes('timed out') && errorMessage.includes('getSession');
  const isNetworkError = errorMessage.includes('network') || errorMessage.includes('fetch');

  if (isAuthTimeout || isNetworkError) {
    // These are handled by AuthContext's retry mechanism, don't crash the app
    console.warn('[Auth] Handled gracefully:', errorMessage);
    return;
  }

  // For other unhandled rejections, you could optionally display a toast
  // or trigger error reporting to your backend
});

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <I18nProvider>
        <AuthProvider>
          <FeatureFlagProvider>
            <BrowserRouter>
              <AppRouter />
            </BrowserRouter>
          </FeatureFlagProvider>
        </AuthProvider>
      </I18nProvider>
    </ErrorBoundary>
  </React.StrictMode>
);