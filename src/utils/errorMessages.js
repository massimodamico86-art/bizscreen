/**
 * Centralized error message utility
 * Provides consistent, user-friendly error messages across the application
 */

import { captureError } from '../services/errorTrackingService';
import { createScopedLogger } from '../services/loggingService.js';

const logger = createScopedLogger('errorMessages');

/**
 * Standard error messages for common operations
 */
export const ERROR_MESSAGES = {
  // Network errors
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  TIMEOUT: 'Request timed out. Please try again.',

  // Authentication errors
  AUTH_FAILED: 'Authentication failed. Please sign in again.',
  AUTH_SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
  AUTH_INVALID_CREDENTIALS: 'Invalid email or password.',
  AUTH_EMAIL_NOT_CONFIRMED: 'Please confirm your email address to continue.',

  // Permission errors
  PERMISSION_DENIED: 'You do not have permission to perform this action.',
  RESOURCE_NOT_FOUND: 'The requested resource was not found.',

  // Data errors
  INVALID_INPUT: 'Please check your input and try again.',
  REQUIRED_FIELD_MISSING: 'Please fill in all required fields.',
  DUPLICATE_ENTRY: 'This entry already exists.',

  // CRUD operation errors
  CREATE_FAILED: 'Failed to create resource. Please try again.',
  UPDATE_FAILED: 'Failed to update resource. Please try again.',
  DELETE_FAILED: 'Failed to delete resource. Please try again.',
  FETCH_FAILED: 'Failed to load resource. Please try again.',

  // Generic fallback
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.'
};

/**
 * Format error message with resource name
 * @param {string} baseMessage - Base error message
 * @param {string} resourceName - Name of the resource
 * @returns {string} Formatted error message
 */
export function formatErrorMessage(baseMessage, resourceName) {
  return baseMessage.replace('resource', resourceName);
}

/**
 * Get user-friendly error message from Supabase error
 * @param {Object} error - Supabase error object
 * @param {string} operation - Operation being performed (e.g., 'create', 'update', 'delete')
 * @param {string} resource - Resource name (e.g., 'listing', 'guest', 'user')
 * @returns {string} User-friendly error message
 */
export function getSupabaseErrorMessage(error, operation = 'operation', resource = 'item') {
  if (!error) return ERROR_MESSAGES.UNKNOWN_ERROR;

  // Handle network errors
  if (error.message && error.message.includes('Failed to fetch')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }

  // Handle authentication errors
  if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
    return ERROR_MESSAGES.AUTH_SESSION_EXPIRED;
  }

  // Handle permission errors
  if (error.code === '42501' || error.message?.includes('permission denied')) {
    return ERROR_MESSAGES.PERMISSION_DENIED;
  }

  // Handle not found errors
  if (error.code === 'PGRST116') {
    return ERROR_MESSAGES.RESOURCE_NOT_FOUND;
  }

  // Handle duplicate entry errors
  if (error.code === '23505') {
    return ERROR_MESSAGES.DUPLICATE_ENTRY;
  }

  // Handle required field errors
  if (error.code === '23502') {
    return ERROR_MESSAGES.REQUIRED_FIELD_MISSING;
  }

  // Operation-specific errors
  const operationMessages = {
    create: formatErrorMessage(ERROR_MESSAGES.CREATE_FAILED, resource),
    update: formatErrorMessage(ERROR_MESSAGES.UPDATE_FAILED, resource),
    delete: formatErrorMessage(ERROR_MESSAGES.DELETE_FAILED, resource),
    fetch: formatErrorMessage(ERROR_MESSAGES.FETCH_FAILED, resource)
  };

  if (operationMessages[operation]) {
    return operationMessages[operation];
  }

  // Return error message if available, otherwise generic error
  return error.message || ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Log error for debugging while showing user-friendly message
 * @param {Object} error - Error object
 * @param {string} context - Context where error occurred
 * @param {Object} additionalInfo - Additional debugging information
 */
export function logError(error, context, additionalInfo = {}) {
  logger.error(`[${context}] Error:`, error);

  if (Object.keys(additionalInfo).length > 0) {
    logger.error(`[${context}] Additional info:`, additionalInfo);
  }

  // Send to error tracking service in production
  if (import.meta.env.PROD) {
    captureError(error, context, additionalInfo);
  }
}

/**
 * Handle async operation with standardized error handling
 * @param {Function} operation - Async operation to perform
 * @param {string} operationType - Type of operation (create, update, delete, fetch)
 * @param {string} resourceName - Name of resource being operated on
 * @param {Function} onError - Optional error callback
 * @returns {Promise<Object>} Result object with {success, data, error}
 */
export async function handleAsyncOperation(operation, operationType, resourceName, onError) {
  try {
    const data = await operation();
    return { success: true, data, error: null };
  } catch (error) {
    const userMessage = getSupabaseErrorMessage(error, operationType, resourceName);
    logError(error, `${operationType} ${resourceName}`, { userMessage });

    if (onError) {
      onError(userMessage, error);
    }

    return { success: false, data: null, error: userMessage };
  }
}

/**
 * Check if an error is retryable (network errors, timeouts, server errors)
 * @param {Object} error - Error object
 * @returns {boolean} Whether the error is retryable
 */
function isRetryableError(error) {
  // Network errors
  if (error.message && error.message.includes('Failed to fetch')) {
    return true;
  }

  // Timeout errors
  if (error.message && error.message.includes('timeout')) {
    return true;
  }

  // Server errors (5xx)
  if (error.status >= 500 && error.status < 600) {
    return true;
  }

  // Rate limit errors (429)
  if (error.status === 429) {
    return true;
  }

  return false;
}

/**
 * Retry an async operation with exponential backoff
 * @param {Function} operation - Async operation to perform
 * @param {Object} options - Retry options
 * @param {number} [options.maxRetries=3] - Maximum number of retry attempts
 * @param {number} [options.initialDelay=1000] - Initial delay in ms before first retry
 * @param {number} [options.maxDelay=10000] - Maximum delay in ms between retries
 * @param {Function} [options.onRetry] - Callback called before each retry (retryCount, delay, error)
 * @returns {Promise} Result of the operation
 */
export async function retryOperation(operation, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    onRetry = null
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry if this is the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Don't retry if the error is not retryable
      if (!isRetryableError(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, delay, error);
      }

      // Log retry attempt
      logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms for error:`, error.message);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All retries exhausted, throw the last error
  throw lastError;
}

/**
 * Handle async operation with retry logic and standardized error handling
 * @param {Function} operation - Async operation to perform
 * @param {string} operationType - Type of operation (create, update, delete, fetch)
 * @param {string} resourceName - Name of resource being operated on
 * @param {Object} options - Options object
 * @param {Function} [options.onError] - Optional error callback
 * @param {Function} [options.onRetry] - Optional retry callback
 * @param {number} [options.maxRetries=3] - Maximum number of retry attempts
 * @returns {Promise<Object>} Result object with {success, data, error}
 */
export async function handleAsyncOperationWithRetry(operation, operationType, resourceName, options = {}) {
  const { onError, onRetry, maxRetries = 3 } = options;

  try {
    const data = await retryOperation(operation, {
      maxRetries,
      onRetry: (retryCount, delay, error) => {
        if (onRetry) {
          onRetry(retryCount, delay, error);
        }
      }
    });
    return { success: true, data, error: null };
  } catch (error) {
    const userMessage = getSupabaseErrorMessage(error, operationType, resourceName);
    logError(error, `${operationType} ${resourceName}`, { userMessage, retriesExhausted: true });

    if (onError) {
      onError(userMessage, error);
    }

    return { success: false, data: null, error: userMessage };
  }
}
