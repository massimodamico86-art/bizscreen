import { createRoot } from "react-dom/client";
import "./index.css";
import "@smastrom/react-rating/style.css";

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