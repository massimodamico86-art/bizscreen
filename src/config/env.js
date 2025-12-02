/**
 * Environment Configuration
 *
 * Centralized environment configuration with validation.
 * Distinguishes between local, staging, and production environments.
 */

// Environment types
export const ENV_LOCAL = 'local';
export const ENV_STAGING = 'staging';
export const ENV_PRODUCTION = 'production';

/**
 * Get current environment
 */
export function getEnvironment() {
  const env = import.meta.env.VITE_APP_ENV || import.meta.env.MODE;

  if (env === 'production' || env === ENV_PRODUCTION) {
    return ENV_PRODUCTION;
  }
  if (env === 'staging' || env === ENV_STAGING) {
    return ENV_STAGING;
  }
  return ENV_LOCAL;
}

/**
 * Check if running in production
 */
export function isProduction() {
  return getEnvironment() === ENV_PRODUCTION;
}

/**
 * Check if running in staging
 */
export function isStaging() {
  return getEnvironment() === ENV_STAGING;
}

/**
 * Check if running locally
 */
export function isLocal() {
  return getEnvironment() === ENV_LOCAL;
}

/**
 * Check if running in development mode (local or staging)
 */
export function isDevelopment() {
  return !isProduction();
}

/**
 * Environment variable schema definition
 */
const envSchema = {
  // Required in all environments
  required: {
    VITE_SUPABASE_URL: {
      description: 'Supabase project URL',
      pattern: /^https:\/\/.+\.supabase\.co$/,
      sensitive: false
    },
    VITE_SUPABASE_ANON_KEY: {
      description: 'Supabase anonymous/public key',
      sensitive: false
    }
  },

  // Required only in production
  productionRequired: {
    VITE_STRIPE_PUBLISHABLE_KEY: {
      description: 'Stripe publishable key',
      pattern: /^pk_(live|test)_/,
      sensitive: false
    },
    VITE_CLOUDINARY_CLOUD_NAME: {
      description: 'Cloudinary cloud name for media uploads',
      sensitive: false
    }
  },

  // Optional with defaults
  optional: {
    VITE_APP_ENV: {
      description: 'Application environment',
      default: 'local',
      sensitive: false
    },
    VITE_APP_NAME: {
      description: 'Application name for branding',
      default: 'BizScreen',
      sensitive: false
    },
    VITE_API_BASE_URL: {
      description: 'API base URL for mobile players',
      default: '',
      sensitive: false
    },
    VITE_ENABLE_AI: {
      description: 'Enable AI features',
      default: 'false',
      sensitive: false
    },
    VITE_ERROR_TRACKING_PROVIDER: {
      description: 'Error tracking provider (console, sentry)',
      default: 'console',
      sensitive: false
    }
  }
};

/**
 * Validate environment variables
 * @returns {object} Validation result with errors array
 */
export function validateEnv() {
  const errors = [];
  const warnings = [];
  const env = getEnvironment();

  // Check required variables
  Object.entries(envSchema.required).forEach(([key, config]) => {
    const value = import.meta.env[key];
    if (!value) {
      errors.push(`Missing required env var: ${key} - ${config.description}`);
    } else if (config.pattern && !config.pattern.test(value)) {
      errors.push(`Invalid format for ${key}: ${config.description}`);
    }
  });

  // Check production-required variables
  if (env === ENV_PRODUCTION) {
    Object.entries(envSchema.productionRequired).forEach(([key, config]) => {
      const value = import.meta.env[key];
      if (!value) {
        errors.push(`Missing production-required env var: ${key} - ${config.description}`);
      } else if (config.pattern && !config.pattern.test(value)) {
        errors.push(`Invalid format for ${key}: ${config.description}`);
      }
    });
  } else {
    // Warn about missing production vars in dev
    Object.entries(envSchema.productionRequired).forEach(([key, config]) => {
      const value = import.meta.env[key];
      if (!value) {
        warnings.push(`Missing ${key} (required in production) - ${config.description}`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    environment: env
  };
}

/**
 * Get validated config object
 * Throws in production if required vars are missing
 */
export function getConfig() {
  const validation = validateEnv();
  const env = getEnvironment();

  // In production, fail fast on missing required vars
  if (env === ENV_PRODUCTION && !validation.valid) {
    console.error('Environment validation failed:', validation.errors);
    throw new Error(`Missing required environment variables: ${validation.errors.join(', ')}`);
  }

  // Log warnings in development
  if (validation.warnings.length > 0 && env !== ENV_PRODUCTION) {
    console.warn('Environment warnings:', validation.warnings);
  }

  return {
    // Environment
    env,
    isProduction: env === ENV_PRODUCTION,
    isStaging: env === ENV_STAGING,
    isLocal: env === ENV_LOCAL,

    // Supabase
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,

    // Stripe
    stripePublishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',

    // Cloudinary
    cloudinaryCloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '',

    // App settings
    appName: import.meta.env.VITE_APP_NAME || 'BizScreen',
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || window.location.origin,

    // Features
    enableAI: import.meta.env.VITE_ENABLE_AI === 'true',

    // Error tracking
    errorTrackingProvider: import.meta.env.VITE_ERROR_TRACKING_PROVIDER || 'console',

    // App version (from package.json via vite define)
    appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',

    // Validation result
    validation
  };
}

/**
 * Initialize and validate environment on app start
 * Call this early in your app initialization
 */
export function initializeEnv() {
  const config = getConfig();

  if (config.isLocal) {
    console.log(`[Config] Environment: ${config.env}`);
    console.log(`[Config] Supabase URL: ${config.supabaseUrl}`);
    if (config.validation.warnings.length > 0) {
      console.warn('[Config] Warnings:', config.validation.warnings);
    }
  }

  return config;
}

// Export singleton config instance
let configInstance = null;

export function config() {
  if (!configInstance) {
    configInstance = getConfig();
  }
  return configInstance;
}

export default config;
