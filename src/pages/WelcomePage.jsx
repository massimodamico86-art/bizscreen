/**
 * WelcomePage.jsx
 * Dedicated welcome/onboarding page distinct from the analytics Dashboard.
 * Uses WelcomeHero and WelcomeFeatureCards to provide a guided first-run experience.
 */
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n';
import { WelcomeHero, WelcomeFeatureCards } from '../components/welcome';
import ErrorBoundary from '../components/ErrorBoundary';

export default function WelcomePage({ setCurrentPage, showToast: _showToast }) {
  const { user } = useAuth();
  const { t } = useTranslation();

  const userName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'there';

  return (
    <ErrorBoundary>
      <div className="space-y-2">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('welcome.title', 'Welcome')}
          </h2>
          <p className="text-sm text-gray-500">
            {t('welcome.subtitle', 'Get started with BizScreen')}
          </p>
        </div>

        <WelcomeHero
          userName={userName}
          onAddMedia={() => setCurrentPage('media-all')}
        />

        <WelcomeFeatureCards
          onCreatePlaylist={() => setCurrentPage('playlists')}
          onBrowseTemplates={() => setCurrentPage('templates')}
          onWatchTutorial={() => setCurrentPage('help')}
        />
      </div>
    </ErrorBoundary>
  );
}
