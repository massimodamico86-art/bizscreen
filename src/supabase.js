import { createClient } from '@supabase/supabase-js';

// Required environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Optional environment variables
const openWeatherApiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
const cloudinaryCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const cloudinaryUploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = [];
  if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');

  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('💡 Please check your .env file and ensure all required variables are set.');

  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}. Check your .env file.`);
}

// Validate required environment variables format
// Allow http:// for local development (localhost/127.0.0.1), require https:// for production
const isLocalUrl = supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1');
if (!supabaseUrl.startsWith('https://') && !isLocalUrl) {
  console.error('❌ VITE_SUPABASE_URL must start with https:// (or http:// for local development)');
  throw new Error('Invalid VITE_SUPABASE_URL: must start with https:// (or http:// for local development)');
}

if (supabaseAnonKey.length < 20) {
  console.error('❌ VITE_SUPABASE_ANON_KEY appears to be invalid (too short)');
  throw new Error('Invalid VITE_SUPABASE_ANON_KEY: key appears to be malformed');
}

// Log warnings for missing optional environment variables
const missingOptional = [];
if (!openWeatherApiKey) missingOptional.push('VITE_OPENWEATHER_API_KEY');
if (!cloudinaryCloudName) missingOptional.push('VITE_CLOUDINARY_CLOUD_NAME');
if (!cloudinaryUploadPreset) missingOptional.push('VITE_CLOUDINARY_UPLOAD_PRESET');

if (missingOptional.length > 0) {
  console.warn('⚠️  Optional environment variables not set:', missingOptional.join(', '));
  console.warn('💡 Some features may be disabled. See .env.example for setup instructions.');
}

// Log successful configuration
console.log('✅ Supabase Config:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey?.length
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});

// Only expose in development for debugging
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.supabase = supabase;
}

// Force redeploy Tue Nov 18 15:10:14 EST 2025
// Force redeploy Thu Nov 20 12:55:55 EST 2025
