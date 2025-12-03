import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { FeatureFlagProvider } from "./hooks/useFeatureFlag";
import { I18nProvider } from "./i18n";
import ErrorBoundary from "./components/ErrorBoundary";
import AppRouter from "./router/AppRouter";
import "./index.css";

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