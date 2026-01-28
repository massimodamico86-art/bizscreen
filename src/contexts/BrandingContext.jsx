/**
 * BrandingContext - Provides branding configuration throughout the app
 *
 * Features:
 * - Loads branding on mount and when impersonation changes
 * - Applies CSS custom properties for colors
 * - Provides branding values to components
 * - Handles refresh when branding is updated
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getBranding, brandingToCssVars, DEFAULT_BRANDING } from '../services/brandingService';
import {
  getImpersonationStatus,
  subscribeToImpersonationChanges,
  isCustomDomain,
  resolveTenantByDomain,
} from '../services/tenantService';
import { useAuth } from './AuthContext';
import { useLogger } from '../hooks/useLogger.js';

/**
 * @typedef {Object} BrandingContextValue
 * @property {import('../services/brandingService').BrandingConfig} branding
 * @property {boolean} loading
 * @property {string|null} error
 * @property {function} refreshBranding - Re-fetch branding from server
 * @property {boolean} isImpersonating
 * @property {object|null} impersonatedClient
 */

const BrandingContext = createContext(null);

export function BrandingProvider({ children }) {
  const { user, userProfile } = useAuth();
  const logger = useLogger('BrandingContext');
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [impersonationStatus, setImpersonationStatus] = useState({
    isImpersonating: false,
    impersonatedClient: null,
  });
  const [domainInfo, setDomainInfo] = useState({
    isWhiteLabel: false,
    domain: null,
    tenantId: null,
  });

  /**
   * Check for custom domain branding on initial load (before auth)
   * This allows the login page to show custom branding
   */
  useEffect(() => {
    const checkDomainBranding = async () => {
      if (isCustomDomain()) {
        try {
          const hostname = window.location.hostname;
          const result = await resolveTenantByDomain(hostname);

          if (result.found && result.branding) {
            setDomainInfo({
              isWhiteLabel: true,
              domain: result.domain,
              tenantId: result.tenantId,
            });

            // Apply domain branding
            setBranding({
              businessName: result.branding.business_name || DEFAULT_BRANDING.businessName,
              logoUrl: result.branding.logo_url || DEFAULT_BRANDING.logoUrl,
              primaryColor: result.branding.primary_color || DEFAULT_BRANDING.primaryColor,
              secondaryColor: result.branding.secondary_color || DEFAULT_BRANDING.secondaryColor,
              isDarkTheme: result.branding.is_dark_theme ?? DEFAULT_BRANDING.isDarkTheme,
              faviconUrl: result.branding.favicon_url || DEFAULT_BRANDING.faviconUrl,
              // White-label specific fields
              hidePoweredBy: result.branding.hide_powered_by ?? false,
              loginLogoUrl: result.branding.login_logo_url,
              loginBackgroundUrl: result.branding.login_background_url,
              loginTitle: result.branding.login_title,
              loginSubtitle: result.branding.login_subtitle,
              supportEmail: result.branding.support_email,
              supportUrl: result.branding.support_url,
            });
            setLoading(false);
            return;
          }
        } catch (err) {
          logger.error('Error checking domain branding:', err);
        }
      }
      setLoading(false);
    };

    checkDomainBranding();
  }, []);

  /**
   * Fetch and apply branding
   */
  const refreshBranding = useCallback(async () => {
    // If we're on a custom domain with resolved branding and no user, keep domain branding
    if (!user && domainInfo.isWhiteLabel) {
      setLoading(false);
      return;
    }

    if (!user) {
      setBranding(DEFAULT_BRANDING);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await getBranding();

      if (fetchError) {
        logger.error('Error fetching branding:', fetchError);
        setError(fetchError);
        // Keep domain branding if available, otherwise use defaults
        if (!domainInfo.isWhiteLabel) {
          setBranding(DEFAULT_BRANDING);
        }
      } else {
        setBranding(data || DEFAULT_BRANDING);
      }

      // Update impersonation status
      setImpersonationStatus(getImpersonationStatus());
    } catch (err) {
      logger.error('refreshBranding error:', err);
      setError(err.message);
      if (!domainInfo.isWhiteLabel) {
        setBranding(DEFAULT_BRANDING);
      }
    } finally {
      setLoading(false);
    }
  }, [user, domainInfo.isWhiteLabel]);

  // Load branding on mount and when user changes
  useEffect(() => {
    refreshBranding();
  }, [refreshBranding]);

  // Subscribe to impersonation changes
  useEffect(() => {
    const unsubscribe = subscribeToImpersonationChanges((status) => {
      setImpersonationStatus(status);
      refreshBranding();
    });

    return unsubscribe;
  }, [refreshBranding]);

  // Also refresh when profile changes (e.g., after login)
  useEffect(() => {
    if (userProfile && !userProfile.error) {
      refreshBranding();
    }
  }, [userProfile, refreshBranding]);

  // Apply CSS custom properties whenever branding changes
  useEffect(() => {
    const cssVars = brandingToCssVars(branding);
    const root = document.documentElement;

    Object.entries(cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Apply dark theme class if enabled
    if (branding.isDarkTheme) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }, [branding]);

  const value = {
    branding,
    loading,
    error,
    refreshBranding,
    isImpersonating: impersonationStatus.isImpersonating,
    impersonatedClient: impersonationStatus.impersonatedClient,
    // White-label domain info
    isWhiteLabel: domainInfo.isWhiteLabel,
    whiteLabelDomain: domainInfo.domain,
    whiteLabelTenantId: domainInfo.tenantId,
  };

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

/**
 * Hook to access branding context
 * @returns {BrandingContextValue}
 */
export function useBranding() {
  const context = useContext(BrandingContext);

  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }

  return context;
}

/**
 * Hook to get just the branding values (for components that only need styles)
 * @returns {import('../services/brandingService').BrandingConfig}
 */
export function useBrandingStyles() {
  const { branding } = useBranding();
  return branding;
}

/**
 * Hook to check if impersonating
 * @returns {{isImpersonating: boolean, impersonatedClient: object|null}}
 */
export function useImpersonation() {
  const { isImpersonating, impersonatedClient } = useBranding();
  return { isImpersonating, impersonatedClient };
}

export default BrandingContext;
