/**
 * CookieConsentBanner - GDPR Cookie Consent UI
 *
 * Displays a banner for cookie consent with options to:
 * - Accept all cookies
 * - Reject optional cookies
 * - Customize cookie preferences
 */

import { useState, useEffect } from 'react';
import {
  CONSENT_CATEGORIES,
  hasConsentBeenGiven,
  getConsentPreferences,
  saveConsent,
  acceptAllCookies,
  rejectAllCookies,
} from '../../services/consentService';

export default function CookieConsentBanner({ userId = null }) {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false,
  });

  useEffect(() => {
    // Check if consent has already been given
    if (!hasConsentBeenGiven()) {
      // Small delay for better UX
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    } else {
      // Load existing preferences
      setPreferences(getConsentPreferences());
    }
  }, []);

  const handleAcceptAll = async () => {
    await acceptAllCookies(userId);
    setVisible(false);
  };

  const handleRejectAll = async () => {
    await rejectAllCookies(userId);
    setVisible(false);
  };

  const handleSavePreferences = async () => {
    await saveConsent(preferences, userId);
    setVisible(false);
  };

  const toggleCategory = (category) => {
    if (category === 'necessary') return; // Can't toggle necessary
    setPreferences(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Main Banner */}
          <div className="p-4 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                <Cookie className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900">
                  We value your privacy
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  We use cookies to enhance your browsing experience, serve personalized content,
                  and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.
                  You can customize your preferences or reject optional cookies.
                </p>

                {/* Quick Actions */}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button onClick={handleAcceptAll} size="sm">
                    <Check className="w-4 h-4" />
                    Accept All
                  </Button>
                  <Button onClick={handleRejectAll} variant="outline" size="sm">
                    <X className="w-4 h-4" />
                    Reject Optional
                  </Button>
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Settings className="w-4 h-4" />
                    Customize
                    {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="border-t border-gray-200 bg-gray-50 p-4 sm:p-6">
              <h4 className="font-medium text-gray-900 mb-4">Cookie Preferences</h4>
              <div className="space-y-4">
                {Object.values(CONSENT_CATEGORIES).map((category) => (
                  <div
                    key={category.id}
                    className="flex items-start gap-4 p-3 bg-white rounded-lg border border-gray-200"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{category.name}</span>
                        {category.required && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            Required
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {category.description}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={preferences[category.id]}
                        onChange={() => toggleCategory(category.id)}
                        disabled={category.required}
                        className="sr-only peer"
                      />
                      <div className={`w-11 h-6 rounded-full peer
                        ${category.required ? 'bg-green-500 cursor-not-allowed' : 'bg-gray-200'}
                        peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300
                        peer-checked:after:translate-x-full peer-checked:after:border-white
                        after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                        after:bg-white after:border-gray-300 after:border after:rounded-full
                        after:h-5 after:w-5 after:transition-all
                        ${!category.required && 'peer-checked:bg-blue-600'}
                      `}></div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <Button onClick={handleSavePreferences} size="sm">
                  Save Preferences
                </Button>
              </div>

              <p className="mt-4 text-xs text-gray-500">
                For more information about how we use cookies and your data, please read our{' '}
                <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
                {' '}and{' '}
                <a href="/cookies" className="text-blue-600 hover:underline">Cookie Policy</a>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
