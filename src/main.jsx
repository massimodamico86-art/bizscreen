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