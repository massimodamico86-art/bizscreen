import React from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "@smastrom/react-rating/style.css";
import ErrorBoundary from "./components/ErrorBoundary";
import { I18nProvider } from "./i18n/I18nContext";
import { AuthProvider } from "./contexts/AuthContext";
import { FeatureFlagProvider } from "./hooks/useFeatureFlag";
import AppRouter from "./router/AppRouter";
import { initObservability } from "./utils/observability";

// Initialize all observability (Sentry, logging, web vitals, health checks)
// before React renders so errors during initial render are captured.
initObservability();

const root = createRoot(document.getElementById("root"), {
  // React 19 error hooks - capture errors that bypass ErrorBoundary
  // (async errors, event handler errors, etc.)
  onUncaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
    console.warn("Uncaught error", error, errorInfo.componentStack);
  }),
  onCaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
});

root.render(
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