/**
 * @deprecated Use src/utils/errorTracking.jsx directly.
 * This file is kept as a compatibility shim for any remaining imports.
 */
import {
  initErrorTracking,
  captureException,
  captureMessage,
  setUser,
  setContext,
  addBreadcrumb,
} from '../utils/errorTracking.jsx';

// Re-export with original API names for backward compatibility
export { initErrorTracking };
export const captureError = captureException;
export const captureWarning = (message, data = {}) => captureMessage(message, 'warning', data);
export const setUserContext = setUser;
export const setTenantContext = (tenantId) => setContext('tenant', { id: tenantId });
export { addBreadcrumb };
export const isErrorTrackingEnabled = () => true;

export default {
  initErrorTracking,
  captureError,
  captureWarning,
  setUserContext,
  setTenantContext,
  addBreadcrumb,
  isErrorTrackingEnabled,
};
